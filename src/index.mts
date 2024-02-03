import { stringify } from "csv-stringify/sync";
import * as bcd from "./browser-compat-data.mjs";
import * as mdn from "./mdn-content.mjs";
import * as webFeatures from "./web-features.mjs";

const compatKeys = bcd.compatKeys();
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
  // computedBaselineLowDate: Date | null;
  // computedBaselineHighDate: Date | null;
  notes: "";
}

function toBurndownEntry(compatKey: string): BurndownEntry {
  return {
    bcdCommitHash,
    compatKey,
    citedByMDNPage: compatKeysCitedByMDN.has(compatKey),
    citedByMDNTop1000Page: compatKeysCitedByMDNTop1000.has(compatKey),
    citedByWebFeatures: compatKeysCitedByWebFeatures.has(compatKey),
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
