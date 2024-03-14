import { execaSync } from "execa";
import { Temporal } from "@js-temporal/polyfill";

import { caniuseIds } from "./web-features.mjs";
import { getTempDir } from "./temp.mjs";
import { existsSync, rmSync } from "fs";
import { join } from "path";
import { stringify } from "csv-stringify/sync";
import * as caniuse from "./caniuse.mjs";

const caniuseIdsInWebFeatures = new Set(caniuseIds());

interface BurndownEntry {
  caniuseLiteVersion: string;
  dateAddedToCaniuse: string | null;
  caniuseId: string;
  title: string;
  shownOnCaniuse: boolean;
  citedByWebFeatures: boolean;
  link: string | null;
}

function burndownEntries(): BurndownEntry[] {
  const entries: BurndownEntry[] = [];

  const caniuseLiteVersion = caniuse.version();
  const caniuseSrc = new CaniuseGit();

  process.on("SIGINT", function () {
    caniuseSrc.close();
  });

  try {
    for (const [id, feature] of caniuse.entries()) {
      if (id.startsWith("mdn-")) {
        continue; // These are weird custom imports to caniuse-lite
      }
      entries.push({
        caniuseLiteVersion,
        caniuseId: id,
        title: feature.title,
        shownOnCaniuse: feature.shown,
        dateAddedToCaniuse:
          caniuseSrc.getAddedDateTime(id)?.toLocaleString() ?? null,
        citedByWebFeatures: caniuseIdsInWebFeatures.has(id),
        link: feature.shown
          ? formatLink(`https://caniuse.com/${id}`, feature.title)
          : null,
      });
    }
  } finally {
    caniuseSrc.close();
  }

  return entries;
}

class CaniuseGit {
  cloned: boolean;
  tempDir: string;

  constructor() {
    this.tempDir = getTempDir();
    this.cloned = false;
    console.warn(`Created ${this.tempDir}`);
    this.clone();
  }

  clone() {
    console.warn("Cloning Fryd/caniuse…");
    execaSync("git", ["clone", "https://github.com/Fyrd/caniuse", "."], {
      cwd: this.tempDir,
    });
    this.cloned = true;
    console.warn("Finished cloning");
  }

  getAddedDateTime(id: string): Temporal.Instant | null {
    // TODO: cache these results somewhere
    const jsonFile = join(this.tempDir, `features-json/${id}.json`);
    if (existsSync(jsonFile)) {
      const commitDates = execaSync(
        "git",
        [
          "log",
          "--diff-filter=A",
          "--follow",
          "--date=iso",
          "--format=%aI",
          "--",
          jsonFile,
        ], // https://stackoverflow.com/questions/2390199/finding-the-date-time-a-file-was-first-added-to-a-git-repository
        { cwd: this.tempDir },
      ).stdout;
      const firstLine = commitDates.split("\n").at(-1);
      if (firstLine === undefined) {
        throw new Error("This should never happen");
      }
      return Temporal.Instant.from(firstLine);
    }
    return null;
  }

  close() {
    rmSync(this.tempDir, { recursive: true, force: true });
    console.warn(`Removed ${this.tempDir}`);
  }
}

function formatLink(url: string, title: string) {
  return `=HYPERLINK("${url}", "${title.replaceAll('"', '""')}")`;
}

export function tsv() {
  return stringify(burndownEntries(), {
    header: false,
    delimiter: "\t",
    cast: { boolean: (b) => (b ? "TRUE" : "FALSE") },
  });
}
