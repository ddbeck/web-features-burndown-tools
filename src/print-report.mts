import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yargs from "yargs";
import { ProgressReport } from "./generate-report.mjs";
import { markdownTable } from "markdown-table";
import { Temporal } from "@js-temporal/polyfill";

function main() {
  const argv = yargs(process.argv.slice(2))
    .command(
      "$0 <from> <to>",
      "Print progress from one report to the another.",
      (yargs) => {
        yargs
          .positional("from", {
            describe: "Path to starting report JSON file",
            type: "string",
          })
          .positional("to", {
            describe: "Path to ending report JSON file",
            type: "string",
          });
      },
    )
    .parseSync();

  const from = argv.from as string;
  const to = argv.to as string;

  const fromReport = JSON.parse(
    readFileSync(from, { encoding: "utf-8" }),
  ) as ProgressReport;
  const toReport = JSON.parse(
    readFileSync(to, { encoding: "utf-8" }),
  ) as ProgressReport;

  const comp = compare(fromReport, toReport);
  const start = Temporal.PlainDate.from(fromReport.meta.date);
  const end = Temporal.PlainDate.from(toReport.meta.date);
  const duration = start.until(end);

  console.log(formatSourcesTable(fromReport, comp));
  console.log();
  console.log(formatWebFeaturesTable(fromReport, toReport, comp));
  console.log();
  console.log(`From ${start} to ${end} (${duration.total("day")} days)`);
}

function compare(a: ProgressReport, b: ProgressReport) {
  return {
    meta: {
      startDate: Temporal.PlainDate.from(a.meta.date),
      endDate: Temporal.PlainDate.from(b.meta.date),
    },
    browserCompatData: {
      count: b.browserCompatData.keys,
      citedByWebFeatures: b.webFeatures.compatKeysCited,
      citedByWebFeaturesChangedAbsolute:
        b.browserCompatData.keys - a.browserCompatData.keys,
      citedByWebFeaturesChangedRatio:
        (b.browserCompatData.keys - a.browserCompatData.keys) /
        a.browserCompatData.keys,
      coverageByWebFeatures:
        b.webFeatures.compatKeysCited / b.browserCompatData.keys,
    },
    caniuse: {
      count: b.caniuse.ids,
      citedByWebFeatures: b.webFeatures.caniuseIdsCited,
      citedByWebFeaturesChangedAbsolute:
        b.webFeatures.caniuseIdsCited - a.webFeatures.caniuseIdsCited,
      citedByWebFeaturesChangedRatio:
        (b.webFeatures.caniuseIdsCited - a.webFeatures.caniuseIdsCited) /
        a.caniuse.ids,
      coverageByWebFeatures: b.webFeatures.caniuseIdsCited / b.caniuse.ids,
    },
    webFeatures: {
      count: b.webFeatures.ids,
      countChangedAbsolute: b.webFeatures.ids - a.webFeatures.ids,
      countChangedRatio:
        (b.webFeatures.ids - a.webFeatures.ids) / a.webFeatures.ids,
    },
  };
}

function formatSourcesTable(
  a: ProgressReport,
  c: ReturnType<typeof compare>,
): string {
  const table = [
    [
      "",
      `Before (${c.meta.startDate})`,
      `After (${c.meta.endDate})`,
      `Net`,
      `Change (%)`,
    ],
    [
      "features in web-features",
      a.webFeatures.ids,
      c.webFeatures.count,
      c.webFeatures.countChangedAbsolute,
      formatChange(c.webFeatures.countChangedRatio),
    ],
    [
      "compat keys mapped to web-features",
      a.webFeatures.compatKeysCited,
      c.browserCompatData.citedByWebFeatures,
      c.browserCompatData.citedByWebFeaturesChangedAbsolute,
      formatChange(c.browserCompatData.citedByWebFeaturesChangedRatio),
    ],
    [
      "caniuse IDs in web-features",
      a.webFeatures.caniuseIdsCited,
      c.caniuse.citedByWebFeatures,
      c.caniuse.citedByWebFeaturesChangedAbsolute,
      formatChange(c.caniuse.citedByWebFeaturesChangedRatio),
    ],
  ].map((row) => row.map((cell) => `${cell}`));

  return markdownTable(table, { align: ["l", "r", "r", "r", "r"] });
}

function formatWebFeaturesTable(
  a: ProgressReport,
  b: ProgressReport,
  c: ReturnType<typeof compare>,
): string {
  return markdownTable(
    [
      ["Coverage", "Before", "Before %", "After", "After %", "Change (points)"],
      [
        "caniuse IDs",
        `${a.webFeatures.caniuseIdsCited} of ${a.caniuse.ids}`,
        formatPercentage(a.webFeatures.caniuseIdsCited / a.caniuse.ids),
        `${b.webFeatures.caniuseIdsCited} of ${b.caniuse.ids}`,
        formatPercentage(c.caniuse.coverageByWebFeatures),
        formatChange(
          c.caniuse.coverageByWebFeatures -
            a.webFeatures.caniuseIdsCited / a.caniuse.ids,
        ),
      ],
      [
        "browser-compat-data keys",
        `${a.webFeatures.compatKeysCited} of ${a.browserCompatData.keys}`,
        formatPercentage(
          a.webFeatures.compatKeysCited / a.browserCompatData.keys,
        ),
        `${b.webFeatures.compatKeysCited} of ${b.browserCompatData.keys}`,
        formatPercentage(c.browserCompatData.coverageByWebFeatures),
        formatChange(
          c.browserCompatData.coverageByWebFeatures -
            a.webFeatures.compatKeysCited / a.browserCompatData.keys,
        ),
      ],
    ].map((row) => row.map((cell) => `${cell}`)),
  );
}

function sign(number: number) {
  if (number > 0) {
    return "+";
  }
  if (number < 0) {
    return "-1";
  }
  return "±";
}

function formatChange(number: number) {
  return `${sign(number)}${(number * 100).toFixed(2)}%`;
}

function formatPercentage(number: number) {
  return `${(number * 100).toFixed(2)}%`;
}

if (import.meta.url.startsWith("file:")) {
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
  }
}
