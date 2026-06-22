// Cross-host SSO mint + verify for the virtual-host switcher (#664).
//
// Flow: the operator clicks a host in the UserMenu on host A. The
// SPA hits POST /api/v1/tokens/cross-host (host A); the controller
// asks this module to mint an SSO token bound to the target host.
// The SPA redirects the browser to host B's GET /api/v1/tokens/sso
// with the token in the URL. Host B verifies the signature, checks
// the target matches its own hostname, marks the jti consumed (DB
// dedup), and sets normal pd_access + pd_refresh cookies for the
// post-SSO redirect target.
//
// The signature is HS256 over the same `jose` we already use for
// access JWTs. Signed with `config.SECRET` (the same env var as
// access tokens, but without the per-user mix-in that those add) —
// multi-instance deploys that want this feature must share `SECRET`
// across sibling instances, which already happens for any shared-
// session setup. Access JWTs stay safe because they're signed with
// `${user.secret}${SECRET}` (per-user composite) — a different
// effective signing key than `SECRET` alone.

import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

import {
  InvalidTokenError,
  TokenExpiredError,
} from "./errors.js";

export const SSO_TOKEN_TTL_MS = 30_000;

const ALG = "HS256";

interface SsoClaims {
  // user id at both the mint host and the target host. The target
  // host's user table must contain a matching row; SSO doesn't
  // copy user records, it just opens a session for an already-
  // provisioned identity.
  sub: string;
  // Target hostname. Validated against `request.hostname` on the
  // consume side so a token minted for `photos.example.com` can't be
  // redirected through `dailybw.example.com` and consumed there.
  aud: string;
  // Replay defence: each token's jti is single-use, dedup-tracked in
  // the `sso_consumed_token` table.
  jti: string;
  // `iat` / `exp` set by jose.
}

const encodeSecret = (secret: string): Uint8Array =>
  new TextEncoder().encode(secret);

export const mintSsoToken = async (
  secret: string,
  userId: string,
  targetHost: string
): Promise<string> => {
  const expSeconds = Math.floor((Date.now() + SSO_TOKEN_TTL_MS) / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setAudience(targetHost)
    .setJti(randomUUID())
    .setIssuedAt()
    .setExpirationTime(expSeconds)
    .sign(encodeSecret(secret));
};

// Verify a candidate SSO token against the local `SECRET`. Does
// NOT check the jti dedup table — the caller does that next so the
// check + insert can be one atomic step (avoids a TOCTOU window
// where two concurrent consumes could both pass verify before
// either inserts).
export const verifySsoToken = async (
  secret: string,
  expectedHost: string,
  candidate: string
): Promise<SsoClaims & { iat: number; exp: number }> => {
  try {
    const { payload } = await jwtVerify(candidate, encodeSecret(secret), {
      audience: expectedHost,
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.aud !== "string" ||
      typeof payload.jti !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.iat !== "number"
    ) {
      throw new InvalidTokenError();
    }
    return {
      sub: payload.sub,
      aud: payload.aud,
      jti: payload.jti,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      throw new TokenExpiredError();
    }
    throw new InvalidTokenError();
  }
};
