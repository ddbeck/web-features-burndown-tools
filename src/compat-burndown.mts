import { stringify } from "csv-stringify/sync";

import { computeBaseline } from "@ddbeck/strict-browser-compat-data/baseline";

import * as bcd from "./browser-compat-data.mjs";
import * as mdn from "./mdn-content.mjs";
import * as webFeatures from "./web-features.mjs";

const compatKeys = bcd.compatKeys([
  "api",
  "css",
  "html",
  "http",
  "javascript",
  "mathml",
  "svg",
  "webassembly",
]);
const bcdCommitHash = bcd.commitHash;

const compatKeysCitedByMDN = new Set(mdn.compatKeys());
const compatKeysCitedByMDNTop1000 = new Set(
  mdn.compatKeys({ onlyTop1000Pages: true }),
);
const compatKeysCitedByWebFeatures = new Set(webFeatures.compatKeys());

export interface BurndownEntry {
  bcdCommitHash: string;
  compatKey: string;
  citedByMDNPage: boolean;
  citedByMDNTop1000Page: boolean;
  citedByWebFeatures: boolean | null;
  computedBaselineLowDate: string | null | "unresolved";
  computedBaselineHighDate: string | null | "unresolved";
  notes: "";
}

function toBurndownEntry(compatKey: string): BurndownEntry {
  let computedBaselineLowDate: string | null = "unresolved";
  let computedBaselineHighDate: string | null = "unresolved";
  try {
    const calculation = computeBaseline({
      compatKeys: [compatKey],
      checkAncestors: false,
    });
    computedBaselineLowDate = calculation.baseline_low_date;
    computedBaselineHighDate = calculation.baseline_high_date;
  } catch (err) {
    if (
      !(err instanceof Error && err.message?.includes("Cannot expand support"))
    ) {
      throw err;
    }
  }

  return {
    bcdCommitHash,
    compatKey,
    citedByMDNPage: compatKeysCitedByMDN.has(compatKey),
    citedByMDNTop1000Page: compatKeysCitedByMDNTop1000.has(compatKey),
    citedByWebFeatures: compatKeysCitedByWebFeatures.has(compatKey),
    computedBaselineLowDate,
    computedBaselineHighDate,
    notes: "",
  };
}

const rows: BurndownEntry[] = compatKeys.map(toBurndownEntry);

console.log(
  stringify(rows, {
    header: true,
    delimiter: "\t",
    cast: { boolean: (b) => (b ? "TRUE" : "FALSE") },
  }),
);
