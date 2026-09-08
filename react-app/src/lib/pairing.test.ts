import { describe, expect, test } from "vitest";

import { formatRemaining, pairingUrl } from "./pairing";

describe("pairingUrl", () => {
  const https = { scheme: "https", host: "photos.example.com" };

  test("uses the photodiary scheme with the server-given host + token as query params", () => {
    expect(pairingUrl(https, "abc.def.ghi")).toBe(
      "photodiary://sso?host=photos.example.com&token=abc.def.ghi"
    );
  });

  test("carries a port when the server gives one", () => {
    const url = pairingUrl({ scheme: "https", host: "photos.example.com:8443" }, "t");
    expect(new URL(url).searchParams.get("host")).toBe("photos.example.com:8443");
  });

  test("adds scheme=http only for plain http", () => {
    const dev = pairingUrl({ scheme: "http", host: "localhost:3000" }, "t");
    expect(new URL(dev).searchParams.get("scheme")).toBe("http");
    expect(new URL(dev).searchParams.get("host")).toBe("localhost:3000");
    expect(new URL(pairingUrl(https, "t")).searchParams.has("scheme")).toBe(false);
  });

  test("percent-encodes characters that would break the query string", () => {
    const url = pairingUrl(https, "a+b/c=d&e");
    expect(new URL(url).searchParams.get("token")).toBe("a+b/c=d&e");
  });
});

describe("formatRemaining", () => {
  test("renders m:ss with a zero-padded seconds field", () => {
    expect(formatRemaining(61_000)).toBe("1:01");
    expect(formatRemaining(120_000)).toBe("2:00");
  });

  test("rounds up so the display reaches 0:00 exactly at expiry", () => {
    expect(formatRemaining(119_400)).toBe("2:00");
    expect(formatRemaining(500)).toBe("0:01");
  });

  test("clamps at 0:00 once expired", () => {
    expect(formatRemaining(0)).toBe("0:00");
    expect(formatRemaining(-5_000)).toBe("0:00");
  });
});
