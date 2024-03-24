import { Temporal } from "@js-temporal/polyfill";

import * as bcd from "./browser-compat-data.mjs";
import * as caniuseData from "./caniuse.mjs";
import * as mdn from "./mdn-content.mjs";
import * as webFeaturesData from "./web-features.mjs";
import { fileURLToPath } from "url";
import { writeFileSync } from "fs";

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
  };

  mdnContent: {
    compatKeysCited: number;
  };

  caniuse: {
    ids: number;
  };

  webFeatures: {
    ids: number;
    compatKeysCited: number;
    caniuseIdsCited: number;
  };
}

function calculateProgress(mdnContentHash?: string): ProgressReport {
  const mdnContentGit = new mdn.MdnContentGit();
  const meta: ProgressReport["meta"] = {
    date: Temporal.ZonedDateTime.from(
      process.env["REPORT_DATE"] ??
        Temporal.Now.zonedDateTimeISO(Temporal.Now.timeZoneId()).toString(),
    ),
    bcdVersion: bcd.version,
    mdnContentCommitHash: mdnContentGit.getInventory(mdnContentHash).commitHash,
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
  };

  const mdnContent: ProgressReport["mdnContent"] = {
    compatKeysCited: mdnContentGit.compatKeys(
      mdnContentHash ? { commitHash: mdnContentHash } : undefined,
    ).length,
  };

  const caniuse: ProgressReport["caniuse"] = {
    ids: caniuseData.ids().length,
  };

  const webFeatures: ProgressReport["webFeatures"] = {
    ids: webFeaturesData.ids().length,
    compatKeysCited: webFeaturesData.compatKeys().length,
    caniuseIdsCited: webFeaturesData.caniuseIds().length,
  };

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
  const dest = getReportsDir();

  console.warn(`Using mdn/content commit: ${getMDNContentHash()}`);
  const result = calculateProgress(getMDNContentHash());
  console.warn(`Writing reports to: ${getReportsDir()}`);

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
