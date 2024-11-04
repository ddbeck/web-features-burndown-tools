import { Temporal } from "@js-temporal/polyfill";

import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import * as caniuseData from "./caniuse.mjs";
import * as bcd from "./sources/browser-compat-data.mjs";
import * as mdn from "./sources/mdn-content-inventory.mjs";
import * as webFeaturesData from "./sources/web-features.mjs";

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
    standardNonDeprecatedKeys: string[];
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
    mdnBrowserCompatDataStandardNonDeprecatedKeys: string[];
    // mdnBrowserCompatDataKeysByLastImplemented: Map<number, string[]>;
    caniuseIds: string[]; // Unique citations!
  };
}

function main() {
  const dest = getReportsDir();

  const result = calculateProgress();
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

function calculateProgress(): ProgressReport {
  return {
    meta: {
      date: Temporal.ZonedDateTime.from(
        process.env["REPORT_DATE"] ??
          Temporal.Now.zonedDateTimeISO("UTC").toString(),
      ),
      browserCompatDataVersion: bcd.version,
      mdnContentCommitHash: mdn.metadata.commit,
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
      standardNonDeprecatedKeys: bcd.compatKeysFiltered(
        [
          "api",
          "css",
          "html",
          "http",
          "javascript",
          "mathml",
          "svg",
          "webassembly",
        ],
        { requireNonDeprecated: true, requireStandardTrack: true },
      ),
    },
    mdnContent: {
      browserCompatKeys: unique(mdn.compatKeys),
    },
    caniuse: {
      ids: caniuseData.ids(),
    },
    webFeatures: {
      ids: webFeaturesData.ids(),
      mdnBrowserCompatDataKeys: unique(webFeaturesData.compatKeys()),
      mdnBrowserCompatDataStandardNonDeprecatedKeys: unique(
        webFeaturesData.compatKeysFiltered({
          requireNonDeprecated: true,
          requireStandardTrack: true,
        }),
      ),
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
