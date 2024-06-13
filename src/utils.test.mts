import { Temporal } from "@js-temporal/polyfill";
import assert from "assert/strict";
import { computeBaseline } from "compute-baseline";
import { browser } from "compute-baseline/browser-compat-data";
import { findlastIntroducedDate } from "./utils.mjs";

describe("findlastIntroducedDate", function () {
  it("returns the last of a series of release dates", function () {
    const actual = findlastIntroducedDate(
      computeBaseline({ compatKeys: ["css.properties.border-color"] }),
    );
    const expected = browser("edge").version("12").date;

    assert(actual);
    assert(expected);
    assert.equal(Temporal.PlainDate.compare(actual, expected), 0);
  });
});
