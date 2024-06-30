import { execFileSync } from "child_process";
import winston from "winston";
import yargs from "yargs";
import { syncCapture, syncLoud } from "../src/exec.mjs";
import { okOrQuit } from "./prompt.mjs";

const argv = await yargs(process.argv)
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
  })
  .parseSync();

const logger = winston.createLogger({
  level: argv.verbose > 0 ? "debug" : "warn",
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.simple(),
  ),
  transports: new winston.transports.Console(),
});

logger.debug("Calculating statistics…");
const reportCmd = ["npx", ["tsx", "./src/print-report.mts"]] as const;
const reportMessage = execFileSync(reportCmd[0], reportCmd[1], {
  stdio: "pipe",
});

process.stdout.write("\n");
process.stdout.write(reportMessage);
process.stdout.write("\n");

await okOrQuit(`Do you want to publish the above message to ${argv.url}?`);
syncLoud("gh", ["issue", "comment", `--body=${reportMessage}`, argv.url]);

const commentUrl = syncCapture("gh", [
  "issue",
  "view",
  "--json=comments",
  "--jq",
  ".comments | last | .url",
  argv.url,
]);

logger.info(`Posted to ${commentUrl}`);
