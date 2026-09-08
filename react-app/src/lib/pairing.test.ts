import { describe, expect, test } from "vitest";

import { formatRemaining, pairingUrl } from "./pairing";

describe("pairingUrl", () => {
  test("uses the photodiary scheme with host + token as query params", () => {
    expect(pairingUrl("photos.example.com", "abc.def.ghi")).toBe(
      "photodiary://sso?host=photos.example.com&token=abc.def.ghi"
    );
  });

  test("percent-encodes characters that would break the query string", () => {
    const url = pairingUrl("host.example.com", "a+b/c=d&e");
    expect(url).toBe(
      "photodiary://sso?host=host.example.com&token=a%2Bb%2Fc%3Dd%26e"
    );
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
