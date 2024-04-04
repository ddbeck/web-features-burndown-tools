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
    browserCompatDataVersion: string;
    caniuseLiteVersion: string;
    mdnContentCommitHash: string;
    webFeaturesVersion: string;
  };

  browserCompatData: {
    keys: string[];
  };

  mdnContent: {
    browserCompatKeys: string[];
  };

  caniuse: {
    ids: string[];
  };

  webFeatures: {
    ids: string[];
    mdnBrowserCompatDataKeys: string[]; // Unique citations!
    caniuseIds: string[]; // Unique citations!
  };
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

function unique<T>(items: Iterable<T>): Array<T> {
  return [...new Set(items)];
}

function calculateProgress(mdnContentHash?: string): ProgressReport {
  const mdnContentGit = new mdn.MdnContentGit();

  return {
    meta: {
      date: Temporal.ZonedDateTime.from(
        process.env["REPORT_DATE"] ??
          Temporal.Now.zonedDateTimeISO("UTC").toString(),
      ),
      browserCompatDataVersion: bcd.version,
      mdnContentCommitHash:
        mdnContentGit.getInventory(mdnContentHash).commitHash,
      webFeaturesVersion: webFeaturesData.version(),
      caniuseLiteVersion: caniuseData.version(),
    },
    browserCompatData: {
      keys: bcd.compatKeys([
        "api",
        "css",
        "html",
        "http",
        "javascript",
        "mathml",
        "svg",
        "webassembly",
      ]),
    },
    mdnContent: {
      browserCompatKeys: unique(
        mdnContentGit.compatKeys(
          mdnContentHash ? { commitHash: mdnContentHash } : undefined,
        ),
      ),
    },
    caniuse: {
      ids: caniuseData.ids(),
    },
    webFeatures: {
      ids: webFeaturesData.ids(),
      mdnBrowserCompatDataKeys: unique(webFeaturesData.compatKeys()),
      caniuseIds: unique(webFeaturesData.caniuseIds()),
    },
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

if (import.meta.url.startsWith("file:")) {
  const modulePath = fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    main();
  }
}
