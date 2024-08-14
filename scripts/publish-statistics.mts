import { Temporal } from "@js-temporal/polyfill";
import { execFileSync } from "child_process";
import winston from "winston";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { syncCapture, syncLoud } from "../src/exec.mjs";
import { okOrQuit } from "./prompt.mjs";

const TODAY = Temporal.Now.instant().toZonedDateTimeISO("UTC").startOfDay();

const argv = yargs(hideBin(process.argv))
  .command("$0 [from] [to]", "Print a report", (yargs) => {
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
      })
      .option("url", {
        type: "string",
        description: "GitHub issue URL",
        default: "https://github.com/web-platform-dx/web-features/issues/788",
      })
      .option("verbose", {
        alias: "v",
        type: "count",
        description: "Show more logging messages",
        default: 0,
      });
  })

  .parseSync();

const logger = winston.createLogger({
  level: (argv.verbose as number) > 0 ? "debug" : "warn",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: new winston.transports.Console(),
});

logger.debug("Calculating statistics…");
const reportCmd = [
  "npx",
  ["tsx", "./src/print-report.mts", argv.from as string, argv.to as string],
] as const;
const reportMessage = execFileSync(reportCmd[0], reportCmd[1], {
  stdio: "pipe",
});

process.stdout.write("\n");
process.stdout.write(reportMessage);
process.stdout.write("\n");

await okOrQuit(`Do you want to publish the above message to ${argv.url}?`);
syncLoud("gh", [
  "issue",
  "comment",
  `--body=${reportMessage}`,
  argv.url as string,
]);

const commentUrl = syncCapture("gh", [
  "issue",
  "view",
  "--json=comments",
  "--jq",
  ".comments | last | .url",
  argv.url as string,
]);

logger.info(`Posted to ${commentUrl}`);

function temporalToFileName(dt: Temporal.ZonedDateTime) {
  return dt.toPlainDateTime().toString().replaceAll(/[.:]/g, "") + ".json";
}
