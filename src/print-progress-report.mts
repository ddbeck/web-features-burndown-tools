import { Temporal } from "@js-temporal/polyfill";
import { readFileSync } from "node:fs";
import yargs from "yargs";
import { ProgressReport } from "./generate-report.mjs";
import { temporalToFileName } from "./temporal-to-file-name.mjs";

const TODAY = Temporal.Now.instant().toZonedDateTimeISO("UTC").startOfDay();
const IDEAL_END = Temporal.PlainDate.from("2024-12-06").toZonedDateTime(
  TODAY.getTimeZone(),
);
const DROP_DEAD_END = Temporal.PlainDate.from("2024-12-20").toZonedDateTime(
  TODAY.getTimeZone(),
);

function main() {
  const argv = yargs(process.argv.slice(2))
    .command(
      "$0 [report]",
      "Print progress from one report to the another.",
      (yargs) => {
        yargs.positional("report", {
          describe: "Path to starting report JSON file",
          type: "string",
          default: `reports/${temporalToFileName(TODAY)}`,
        });
      },
    )
    .parseSync();

  const reportFp = argv.report as string;

  const report = JSON.parse(
    readFileSync(reportFp, { encoding: "utf-8" }),
  ) as ProgressReport;

  const idealDaysToGo = TODAY.until(IDEAL_END, { smallestUnit: "day" }).days;
  const idealWeeksToGo = TODAY.until(IDEAL_END, { smallestUnit: "week" }).weeks;
  const dropDeadDaysToGo = TODAY.until(DROP_DEAD_END, {
    smallestUnit: "day",
  }).days;
  const dropDeadWeeksToGo = TODAY.until(DROP_DEAD_END, {
    smallestUnit: "week",
  }).weeks;

  const keysTotal = report.browserCompatData.keys.length;
  const keysDone = report.webFeatures.mdnBrowserCompatDataKeys.length;
  const keysToGo = keysTotal - keysDone;

  console.log(`Features remaining:  ${keysToGo}`);
  console.log();

  console.log(`Ideal days to go:    ${idealDaysToGo}`);
  console.log(`Ideal keys per week: ${Math.ceil(keysToGo / idealWeeksToGo)}`);
  console.log(`Ideal keys per day:  ${Math.ceil(keysToGo / idealDaysToGo)}`);
  console.log();

  console.log(`Drop-dead days to go:    ${dropDeadDaysToGo}`);
  console.log(
    `Drop-dead keys per week: ${Math.ceil(keysToGo / dropDeadWeeksToGo)}`,
  );
  console.log(
    `Drop-dead keys per day:  ${Math.ceil(keysToGo / dropDeadDaysToGo)}`,
  );
}

main();
