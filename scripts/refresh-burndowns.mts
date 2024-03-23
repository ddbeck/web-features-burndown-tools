import { writeFile } from "fs/promises";
import { join, relative } from "path";
import { fileURLToPath } from "url";

import prompts from "prompts";
import { Temporal } from "@js-temporal/polyfill";

import * as caniuseBurndown from "../src/caniuse-burndown.mjs";
import * as compatBurndown from "../src/compat-burndown.mjs";
import clipboard from "clipboardy";
import { execa } from "execa";

async function confirm(message: string) {
  let gate = false;
  while (gate === false) {
    const { confirmed } = await prompts({
      type: "confirm",
      name: "confirmed",
      message,
      stdout: process.stderr,
    });
    gate = confirmed;
  }
}

const bcdBurndownPasteTarget =
  "https://docs.google.com/spreadsheets/d/1RVgaq4ruHYeJvLCky-h2VAreRP5j_CKifaBvwYEhsL0/edit#gid=1279455993&range=A2";
const caniuseBurndownPasteTarget =
  "https://docs.google.com/spreadsheets/d/1RVgaq4ruHYeJvLCky-h2VAreRP5j_CKifaBvwYEhsL0/edit#gid=1126665231&range=A2";

const tsvsDir = new URL(join("..", "tsvs/"), import.meta.url);

const timestamp = Temporal.Now.zonedDateTimeISO("UTC").toString();
const bcdBurndownPath = new URL(join(`${timestamp}.bcd-mdn.tsv`), tsvsDir);
const caniuseBurndownPath = new URL(join(`${timestamp}.caniuse.tsv`), tsvsDir);

const { updatedSources } = await prompts({
  type: "confirm",
  name: "updatedSources",
  message: "Did you run `npm run update-sources` first?",
  stdout: process.stderr,
});
if (updatedSources === false) {
  console.warn("Run `npm run update-sources` then try again.");
  process.exit(1);
}

console.warn("Generating TSV for browser-compat-data and MDN burndown list.");
console.warn("This will may a few minutes, please wait.");
const bcdBurndownTsv = compatBurndown.tsv();
await writeFile(bcdBurndownPath, bcdBurndownTsv);
console.warn(
  `Wrote: ${relative(process.cwd(), fileURLToPath(bcdBurndownPath))}`,
);

console.warn("Generating TSV for caniuse burndown list.");
console.warn("This will may a few minutes, please wait.");
const caniuseBurndownTsv = caniuseBurndown.tsv();
await writeFile(caniuseBurndownPath, caniuseBurndownTsv);
console.warn(
  `Wrote: ${relative(process.cwd(), fileURLToPath(caniuseBurndownPath))}`,
);

await confirm("Are you ready to copy the BCD & MDN TSV to your clipboard?");

await clipboard.write(bcdBurndownTsv);
console.warn(`Open the sheet in your browser: ${bcdBurndownPasteTarget}`);
console.warn("Paste your clipboard into cell A2.");

await confirm("Have you pasted the TSV into the BCD & MDN burndown?");

await execa("git", ["add", `${fileURLToPath(bcdBurndownPath)}`], {
  stdio: "inherit",
  verbose: true,
});

console.warn(
  "Now it's time to update the ranges in the filter views for this sheet.",
);
await confirm(
  "Have you updated the ranges for every filter view on this sheet?",
);

confirm("Are you ready to copy the caniuse TSV to your clipboard?");

await clipboard.write(caniuseBurndownTsv);
console.warn(`Open the sheet in your browser: ${caniuseBurndownPasteTarget}`);
console.warn("Paste into cell A2");

await confirm("Have you pasted the TSV into the caniuse burndown?");

await execa("git", ["add", `${fileURLToPath(caniuseBurndownPath)}`], {
  stdio: "inherit",
  verbose: true,
});

console.warn(
  "Now it's time to update the ranges in the filter views for this sheet.",
);
await confirm(
  "Have you updated the ranges for every filter view on this sheet?",
);

await execa("git", ["status"], { stdio: "inherit", verbose: true });

const { readyToCommit } = await prompts({
  type: "confirm",
  name: "readyToCommit",
  message: "Are you ready to commit the staged changes (see above)?",
  stdout: process.stderr,
});
if (readyToCommit) {
  const commitMessage = `Add burndown TSVs for ${timestamp}`;
  await execa("git", ["commit", "--message", commitMessage], {
    stdio: "inherit",
    verbose: true,
  });
} else {
  console.warn("Warning: commit abandoned! Changes are still staged!");
  console.warn("Run `git status` for information.");
  console.warn(
    "Run `git restore --staged --worktree tsvs/` to abandon the changes.",
  );
  process.exit(1);
}
