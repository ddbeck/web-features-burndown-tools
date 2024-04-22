import { stringify } from "csv-stringify/sync";

import { computeBaseline } from "compute-baseline";

import * as bcd from "./browser-compat-data.mjs";
import * as mdn from "./mdn-content.mjs";
import * as webFeatures from "./web-features.mjs";

export function tsv(): string {
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

  const mdnContent = new mdn.MdnContentGit();

  const compatKeysCitedByMDN = new Set(mdnContent.compatKeys());
  const compatKeysCitedByMDNTop1000 = new Set(
    mdnContent.compatKeys({ onlyTop1000Pages: true }),
  );
  const compatKeysCitedByWebFeatures = new Set(webFeatures.compatKeys());

  interface BurndownEntry {
    bcdCommitHash: string;
    compatKey: string;
    citedByMDNPage: boolean;
    citedByMDNTop1000Page: boolean;
    citedByWebFeatures: boolean | null;
    computedBaselineLowDate: string | null | "unresolved";
    computedBaselineHighDate: string | null | "unresolved";
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
        !(
          err instanceof Error &&
          (err.message?.includes("Cannot expand support") ||
            err.message?.includes("contains no support data"))
        )
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
    };
  }

  return stringify(compatKeys.map(toBurndownEntry), {
    header: false,
    delimiter: "\t",
    cast: { boolean: (b) => (b ? "TRUE" : "FALSE") },
  });
}
