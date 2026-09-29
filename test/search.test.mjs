import assert from "node:assert/strict";
import { test } from "node:test";
import { findMatches } from "../lib/search.ts";

const names = ["steveennn", "party-parrot", "parrot", "partying-face", "cat", "catjam", "sad_cat", "thisisfine", "parry"];

test("finds names with doubled letters and extra repeats", () => {
  assert.deepEqual(findMatches("steeven", names), ["steveennn"]);
  assert.deepEqual(findMatches("steven", names), ["steveennn"]);
});

test("tolerates small typos in longer queries", () => {
  assert.deepEqual(findMatches("stevne", names), ["steveennn"]);
  assert.deepEqual(findMatches("thisisfnie", names), ["thisisfine"]);
});

test("ranks exact, then prefix, then word prefix, then substring", () => {
  assert.deepEqual(findMatches("cat", names), ["cat", "catjam", "sad_cat"]);
  assert.deepEqual(findMatches("parrot", names), ["parrot", "party-parrot"]);
});

test("does not fuzz short queries", () => {
  assert.deepEqual(findMatches("cay", names), []);
});

test("returns every name sorted for an empty query", () => {
  assert.deepEqual(findMatches("", names), [...names].sort());
});
