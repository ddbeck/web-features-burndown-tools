import { stringify } from "csv-stringify/sync";

import { computeBaseline } from "compute-baseline";

import * as bcd from "./browser-compat-data.mjs";
import * as mdn from "./sources/mdn-content-inventory.mjs";
import * as mdnTraffic from "./sources/mdn-traffic-spreadsheet.mjs";
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

  const compatKeysCitedByMDN = new Set(mdn.compatKeys);
  const compatKeysCitedByMDNTop1000 = (() => {
    const top1000Slugs = new Set(mdnTraffic.slugsByTrafficRank().slice(0, 999));
    const result: string[] = [];
    for (const [slug, keys] of mdn.slugsToCompatKeys.entries()) {
      if (top1000Slugs.has(slug)) {
        result.push(...keys);
      }
    }
    return new Set(result);
  })();
  const compatKeysCitedByWebFeatures = new Set(webFeatures.compatKeys());

  interface BurndownEntry {
    bcdCommitHash: string;
    compatKey: string;
    citedByMDNPage: boolean;
    citedByMDNTop1000Page: boolean;
    citedByWebFeatures: boolean | null;
    isBaseline: boolean | null;
    computedBaselineLowDate: string | null | "unresolved";
    computedBaselineHighDate: string | null | "unresolved";
    engineCount: number;
  }

  function toBurndownEntry(compatKey: string): BurndownEntry {
    let computedBaselineLowDate: string | null = "unresolved";
    let computedBaselineHighDate: string | null = "unresolved";
    let engineCount: number = 0;
    try {
      const calculation = computeBaseline({
        compatKeys: [compatKey],
        checkAncestors: false,
      });
      computedBaselineLowDate = calculation.baseline_low_date;
      computedBaselineHighDate = calculation.baseline_high_date;
      engineCount = countEngines(calculation);
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
      isBaseline:
        typeof computedBaselineLowDate === "string" &&
        computedBaselineLowDate !== "unresolved",
      computedBaselineLowDate,
      computedBaselineHighDate,
      engineCount,
    };
  }

  return stringify(compatKeys.map(toBurndownEntry), {
    header: false,
    delimiter: "\t",
    cast: { boolean: (b) => (b ? "TRUE" : "FALSE") },
  });
}

function countEngines(calculation: ReturnType<typeof computeBaseline>): number {
  const engines = new Set<string>();
  for (const [, release] of calculation.support.entries()) {
    if (release) {
      const { engine } = release.browser.current().data;
      if (engine) {
        engines.add(engine);
      }
    }
  }

  return engines.size;
}
