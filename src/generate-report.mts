import { Temporal } from "@js-temporal/polyfill";

import * as bcd from "./browser-compat-data.mjs";
import * as caniuseData from "./caniuse.mjs";
import * as mdn from "./mdn-content.mjs";
import * as webFeaturesData from "./web-features.mjs";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

export interface ProgressReport {
  meta: {
    date: Temporal.ZonedDateTime;
    bcdVersion: string;
    mdnContentCommitHash: string;
    webFeaturesVersion: string;
    caniuseLiteVersion: string;
  };

  browserCompatData: {
    keys: number;
    keysChange: number | null;
  };

  mdnContent: {
    compatKeysCited: number;
    compatKeysCitedChange: number | null;
  };

  caniuse: {
    ids: number;
    idsChange: number | null;
  };

  webFeatures: {
    ids: number;
    idsChange: number | null;
    compatKeysCited: number;
    compatKeysCitedChange: number | null;
    caniuseIdsCited: number;
    caniuseIdsCitedChange: number | null;
  };
}

function calculateProgress(
  previous?: ProgressReport,
  mdnContentHash?: string,
): ProgressReport {
  const meta: ProgressReport["meta"] = {
    date: Temporal.ZonedDateTime.from(
      process.env["REPORT_DATE"] ??
        Temporal.Now.zonedDateTimeISO(Temporal.Now.timeZoneId()).toString(),
    ),
    bcdVersion: bcd.version,
    mdnContentCommitHash: new mdn.MdnContentGit().getInventory(mdnContentHash)
      .commitHash,
    webFeaturesVersion: webFeaturesData.version(),
    caniuseLiteVersion: caniuseData.version(),
  };

  const browserCompatData: ProgressReport["browserCompatData"] = {
    keys: bcd.compatKeys([
      "api",
      "css",
      "html",
      "http",
      "javascript",
      "mathml",
      "svg",
      "webassembly",
    ]).length,
    keysChange: null,
  };

  const mdnContent: ProgressReport["mdnContent"] = {
    compatKeysCited: new mdn.MdnContentGit().compatKeys().length,
    compatKeysCitedChange: null,
  };

  const caniuse: ProgressReport["caniuse"] = {
    ids: caniuseData.ids().length,
    idsChange: null,
  };

  const webFeatures: ProgressReport["webFeatures"] = {
    ids: webFeaturesData.ids().length,
    idsChange: null,
    compatKeysCited: webFeaturesData.compatKeys().length,
    compatKeysCitedChange: null,
    caniuseIdsCited: webFeaturesData.caniuseIds().length,
    caniuseIdsCitedChange: null,
  };

  if (typeof previous !== "undefined") {
    browserCompatData.keysChange =
      browserCompatData.keys - previous.browserCompatData.keys;

    mdnContent.compatKeysCitedChange =
      mdnContent.compatKeysCited - previous.mdnContent.compatKeysCited;

    caniuse.idsChange = caniuse.ids - previous.caniuse.ids;

    webFeatures.idsChange = webFeatures.ids - previous.webFeatures.ids;
    webFeatures.compatKeysCitedChange =
      webFeatures.compatKeysCited - previous.webFeatures.compatKeysCited;
    webFeatures.caniuseIdsCitedChange =
      webFeatures.caniuseIdsCited - previous.webFeatures.caniuseIdsCited;
  }

  return {
    meta,
    browserCompatData,
    mdnContent,
    caniuse,
    webFeatures,
  };
}

export function getReportsDir(): string {
  if (typeof process.env["REPORTS_DIR"] !== "string") {
    throw Error("REPORTS_DIR environment variable not set");
  }
  return process.env["REPORTS_DIR"];
}

function getMDNContentHash(): string | undefined {
  if (typeof process.env["MDN_CONTENT_HASH"] !== "string") {
    return undefined;
  }
  return process.env["MDN_CONTENT_HASH"];
}

function getPreviousReport(): ProgressReport | undefined {
  const reportsDir = getReportsDir();
  const files = readdirSync(reportsDir);
  files.sort();
  const lastFile = files.at(-1);
  if (!lastFile) {
    console.warn(
      "Previous report not found! Creating an initial report instead.",
    );
    return undefined;
  }
  const source = readFileSync(join(reportsDir, lastFile), {
    encoding: "utf-8",
  });
  return parseReport(source);
}

function replacer(_key: string, value: unknown) {
  if (value instanceof Temporal.ZonedDateTime) {
    return value.toString();
  }
  return value;
}

function reviver(key: string, value: unknown) {
  if (key === "date" && typeof value === "string") {
    return Temporal.ZonedDateTime.from(value);
  }
  return value;
}

export function parseReport(src: string): ProgressReport {
  return JSON.parse(src, reviver);
}

function main() {
  const previous = getPreviousReport();
  const dest = getReportsDir();

  console.warn(`Using previous report: ${previous}`);
  console.warn(`Using mdn/content commit: ${getMDNContentHash()}`);
  console.warn(`Writing reports to: ${getReportsDir()}`);

  const result = calculateProgress(previous, getMDNContentHash());

  writeFileSync(
    `${dest}/${result.meta.date.toPlainDateTime().toString().replaceAll(/[.:]/g, "")}.json`,
    JSON.stringify(result, replacer, 2),
    {
      encoding: "utf-8",
    },
  );
}

if (import.meta.url.startsWith("file:")) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main();
  }
}
