import { translatePathForHost } from "./cross-host-path";

describe("translatePathForHost", () => {
  test("gallery URLs carry the id + trail verbatim", () => {
    // Main host has every gallery; non-main hosts scope-narrow.
    // Passing the id verbatim gives non-main → main a direct hit,
    // and main → non-main degrades into Gallery/index.tsx's
    // off-scope handler which redirects to the scoped default
    // while preserving the year / month / day / photoId trail.
    expect(translatePathForHost("/g/dailybw")).toBe("/g/dailybw");
    expect(translatePathForHost("/g/dailybw/2024/3")).toBe("/g/dailybw/2024/3");
    expect(translatePathForHost("/g/dailybw/2024/3/15/photo.jpg")).toBe(
      "/g/dailybw/2024/3/15/photo.jpg"
    );
  });

  test("stats URLs carry the id verbatim", () => {
    expect(translatePathForHost("/s/dailybw")).toBe("/s/dailybw");
    expect(translatePathForHost("/s/dailybw/extra")).toBe("/s/dailybw/extra");
  });

  test("admin paths land on the manage dashboard regardless of subpath", () => {
    expect(translatePathForHost("/m")).toBe("/m");
    expect(translatePathForHost("/m/photos")).toBe("/m");
    expect(translatePathForHost("/m/g/foo/access")).toBe("/m");
    expect(translatePathForHost("/m/users/alice")).toBe("/m");
  });

  test("top-level routes carry over verbatim", () => {
    expect(translatePathForHost("/")).toBe("/");
    expect(translatePathForHost("/g")).toBe("/g");
    expect(translatePathForHost("/s")).toBe("/s");
  });

  test("malformed / non-leading-slash input falls back to /", () => {
    expect(translatePathForHost("javascript:alert(1)")).toBe("/");
    expect(translatePathForHost("")).toBe("/");
    expect(translatePathForHost("//attacker.example/x")).toBe(
      "//attacker.example/x"
    );
    // Server-side validation rejects strings that don't start with /,
    // so the above leading-`//` case is harmless here — the server's
    // `path.startsWith("/")` check accepts it but the controller's
    // safePath logic re-normalises. Documented to keep the unit
    // test honest about what THIS helper does (vs the server).
  });
});
