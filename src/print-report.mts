import { Temporal } from "@js-temporal/polyfill";
import { markdownTable } from "markdown-table";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import yargs from "yargs";
import { ProgressReport } from "./generate-report.mjs";
import { temporalToFileName } from "./temporal-to-file-name.mjs";

const TODAY = Temporal.Now.instant().toZonedDateTimeISO("UTC").startOfDay();

function main() {
  const argv = yargs(process.argv.slice(2))
    .command(
      "$0 [from] [to]",
      "Print progress from one report to the another.",
      (yargs) => {
        yargs
          .positional("from", {
            describe: "Path to starting report JSON file",
            type: "string",
            default: `reports/${temporalToFileName(TODAY.subtract({ days: 7 }))}`,
          })
          .positional("to", {
            describe: "Path to ending report JSON file",
            type: "string",
            default: `reports/${temporalToFileName(TODAY)}`,
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

  const start = Temporal.PlainDate.from(fromReport.meta.date);
  const end = Temporal.PlainDate.from(toReport.meta.date);
  const duration = start.until(end);

  console.log(formatSourcesTable(fromReport, toReport));
  console.log();
  console.log(formatCoverageTable(fromReport, toReport));
  console.log();
  console.log(`From ${start} to ${end} (${duration.total("day")} days)`);
}

function relativeChange(before: number, after: number): string {
  return formatChange((after - before) / before);
}

function formatSourcesTable(a: ProgressReport, b: ProgressReport): string {
  const table = [
    [
      "",
      `Before (${Temporal.PlainDate.from(a.meta.date)})`,
      `After (${Temporal.PlainDate.from(b.meta.date)})`,
      `Net`,
      `Change (%)`,
    ],
    [
      "features in web-features",
      a.webFeatures.ids.length,
      b.webFeatures.ids.length,
      formatNet(b.webFeatures.ids.length - a.webFeatures.ids.length),
      relativeChange(a.webFeatures.ids.length, b.webFeatures.ids.length),
    ],
    [
      "compat keys mapped to web-features",
      a.webFeatures.mdnBrowserCompatDataKeys.length,
      b.webFeatures.mdnBrowserCompatDataKeys.length,
      formatNet(
        b.webFeatures.mdnBrowserCompatDataKeys.length -
          a.webFeatures.mdnBrowserCompatDataKeys.length,
      ),
      relativeChange(
        a.webFeatures.mdnBrowserCompatDataKeys.length,
        b.webFeatures.mdnBrowserCompatDataKeys.length,
      ),
    ],
    [
      "caniuse IDs in web-features",
      a.webFeatures.caniuseIds.length,
      b.webFeatures.caniuseIds.length,
      formatNet(
        b.webFeatures.caniuseIds.length - a.webFeatures.caniuseIds.length,
      ),
      relativeChange(
        a.webFeatures.caniuseIds.length,
        b.webFeatures.caniuseIds.length,
      ),
    ],
  ].map((row) => row.map((cell) => `${cell}`));

  return markdownTable(table, { align: ["l", "r", "r", "r", "r"] });
}

function formatCoverageTable(a: ProgressReport, b: ProgressReport): string {
  return markdownTable(
    [
      ["Coverage", "Before", "Before %", "After", "After %", "Change (points)"],
      [
        "caniuse IDs",
        `${a.webFeatures.caniuseIds.length} of ${a.caniuse.ids.length}`,
        formatPercentage(
          a.webFeatures.caniuseIds.length / a.caniuse.ids.length,
        ),
        `${b.webFeatures.caniuseIds.length} of ${b.caniuse.ids.length}`,
        formatPercentage(
          b.webFeatures.caniuseIds.length / b.caniuse.ids.length,
        ),
        formatChange(
          b.webFeatures.caniuseIds.length / b.caniuse.ids.length -
            a.webFeatures.caniuseIds.length / a.caniuse.ids.length,
        ),
      ],
      [
        "browser-compat-data keys",
        `${a.webFeatures.mdnBrowserCompatDataKeys.length} of ${a.browserCompatData.keys.length}`,
        formatPercentage(
          a.webFeatures.mdnBrowserCompatDataKeys.length /
            a.browserCompatData.keys.length,
        ),
        `${b.webFeatures.mdnBrowserCompatDataKeys.length} of ${b.browserCompatData.keys.length}`,
        formatPercentage(
          b.webFeatures.mdnBrowserCompatDataKeys.length /
            b.browserCompatData.keys.length,
        ),
        formatChange(
          b.webFeatures.mdnBrowserCompatDataKeys.length /
            b.browserCompatData.keys.length -
            a.webFeatures.mdnBrowserCompatDataKeys.length /
              a.browserCompatData.keys.length,
        ),
      ],
      [
        "browser-compat-data keys (standard, non-deprecated)",
        `${a.webFeatures.mdnBrowserCompatDataStandardNonDeprecatedKeys.length} of ${a.browserCompatData.standardNonDeprecatedKeys.length}`,
        formatPercentage(
          a.webFeatures.mdnBrowserCompatDataStandardNonDeprecatedKeys.length /
            a.browserCompatData.standardNonDeprecatedKeys.length,
        ),
        `${b.webFeatures.mdnBrowserCompatDataStandardNonDeprecatedKeys.length} of ${b.browserCompatData.standardNonDeprecatedKeys.length}`,
        formatPercentage(
          b.webFeatures.mdnBrowserCompatDataStandardNonDeprecatedKeys.length /
            b.browserCompatData.standardNonDeprecatedKeys.length,
        ),
        formatChange(
          b.webFeatures.mdnBrowserCompatDataStandardNonDeprecatedKeys.length /
            b.browserCompatData.standardNonDeprecatedKeys.length -
            a.webFeatures.mdnBrowserCompatDataStandardNonDeprecatedKeys.length /
              a.browserCompatData.standardNonDeprecatedKeys.length,
        ),
      ],
    ].map((row) => row.map((cell) => `${cell}`)),
    { align: ["l", "r", "r", "r", "r", "r"] },
  );
}

function sign(number: number) {
  return number > 0 ? "+" : number < 0 ? "" : "±";
}

function formatNet(number: number) {
  return `${sign(number)}${number}`;
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
