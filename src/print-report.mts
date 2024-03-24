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

  console.log(formatSourcesTable(comp));
  console.log();
  console.log(formatWebFeaturesTable(comp));
  console.log();
  console.log(`From ${start} to ${end} (${duration.total("day")} days)`);
}

function compare(a: ProgressReport, b: ProgressReport) {
  return {
    browserCompatData: {
      count: b.browserCompatData.keys,
      citedByWebFeatures: b.webFeatures.compatKeysCited,
      citedByWebFeaturesChangedAbsolute:
        b.browserCompatData.keys - a.browserCompatData.keys,
      citedByWebFeaturesChangedRatio:
        (b.browserCompatData.keys - a.browserCompatData.keys) /
        a.browserCompatData.keys,
    },
    caniuse: {
      count: b.caniuse.ids,
      citedByWebFeatures: b.webFeatures.caniuseIdsCited,
      citedByWebFeaturesChangedAbsolute:
        b.webFeatures.caniuseIdsCited - a.webFeatures.caniuseIdsCited,
      citedByWebFeaturesChangedRatio:
        (b.webFeatures.caniuseIdsCited - a.webFeatures.caniuseIdsCited) /
        a.caniuse.ids,
    },
    webFeatures: {
      count: b.webFeatures.ids,
      countChangedAbsolute: b.webFeatures.ids - a.webFeatures.ids,
      countChangedRatio:
        (b.webFeatures.ids - a.webFeatures.ids) / a.webFeatures.ids,
    },
  };
}

function formatSourcesTable(c: ReturnType<typeof compare>): string {
  const table = [
    ["Source", "Count", "Cited by web-features", "Change", "%"],
    [
      "@mdn/browser-compat-data keys",
      c.browserCompatData.count,
      c.browserCompatData.citedByWebFeatures,
      c.browserCompatData.citedByWebFeaturesChangedAbsolute,
      formatChange(c.browserCompatData.citedByWebFeaturesChangedRatio),
    ],
    [
      "caniuse features",
      c.caniuse.count,
      c.caniuse.citedByWebFeatures,
      c.caniuse.citedByWebFeaturesChangedAbsolute,
      formatChange(c.caniuse.citedByWebFeaturesChangedRatio),
    ],
  ].map((row) => row.map((cell) => `${cell}`));

  return markdownTable(table);
}

function formatWebFeaturesTable(c: ReturnType<typeof compare>): string {
  return markdownTable(
    [
      ["web-features feature count", "Change", "%"],
      [
        c.webFeatures.count,
        c.webFeatures.countChangedAbsolute,
        formatChange(c.webFeatures.countChangedRatio),
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

if (import.meta.url.startsWith("file:")) {
  if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
  }
}
