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
  assert.equal(normalizeCity("Aabenraa Municipality"), "Aabenraa");
});

test("normalizeCity: strips Malaysian Municipal Council suffix", () => {
  assert.equal(normalizeCity("Selayang Municipal Council"), "Selayang");
});

test("normalizeCity: strips Swedish kommun / stad suffix", () => {
  assert.equal(normalizeCity("Norrtälje kommun"), "Norrtälje");
  assert.equal(normalizeCity("Malmö stad"), "Malmö");
  assert.equal(normalizeCity("Borås kommun"), "Borås");
});

test("normalizeCity: strips Stadtgebiet prefix (German)", () => {
  assert.equal(normalizeCity("Stadtgebiet Bremen"), "Bremen");
});

test("normalizeCity: anglicizes Göteborgs Stad via override", () => {
  assert.equal(normalizeCity("Göteborgs Stad"), "Gothenburg");
  assert.equal(normalizeCity("Göteborgs stad"), "Gothenburg");
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
