import { stringify } from "csv-stringify/sync";
import * as bcd from "./browser-compat-data.mjs";
import * as mdn from "./mdn-content.mjs";
import * as webFeatures from "./web-features.mjs";
import { computeBaseline } from "@ddbeck/strict-browser-compat-data/baseline";

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
  // computedBaselineHighDate: string | null;
  notes: "";
}

function toBurndownEntry(compatKey: string): BurndownEntry {
  let computedBaselineLowDate: string | null = "unresolved";
  try {
    computedBaselineLowDate = computeBaseline({ compatKey }).baseline_low_date;
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
