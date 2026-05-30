import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeCity } from "../reverse-geocode/normalize.js";

test("normalizeCity: pass-through for clean names", () => {
  assert.equal(normalizeCity("Stockholm"), "Stockholm");
  assert.equal(normalizeCity("Tokyo"), "Tokyo");
  assert.equal(normalizeCity("Helsinki"), "Helsinki");
});

test("normalizeCity: strips Municipality suffix", () => {
  assert.equal(normalizeCity("Stockholm Municipality"), "Stockholm");
  assert.equal(normalizeCity("Espoo Municipality"), "Espoo");
});

test("normalizeCity: handles null / undefined / empty", () => {
  assert.equal(normalizeCity(undefined), undefined);
  assert.equal(normalizeCity(null), null);
  assert.equal(normalizeCity(""), "");
});

test("normalizeCity: doesn't strip Municipality mid-word", () => {
  // "Municipality" not at end as own word stays
  assert.equal(normalizeCity("Foo Municipalityx"), "Foo Municipalityx");
});

test("normalizeCity: falls back to raw if strip leaves empty", () => {
  assert.equal(normalizeCity("Municipality"), "Municipality");
});
