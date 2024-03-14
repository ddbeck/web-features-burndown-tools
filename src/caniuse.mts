import { Temporal } from "@js-temporal/polyfill";
import * as lite from "caniuse-lite";
import { execaSync } from "execa";
import { existsSync, rmSync } from "fs";
import { join } from "path/posix";
import { getTempDir } from "./temp.mjs";

export function ids(): string[] {
  return Object.keys(lite.features);
}

export function* entries(): Generator<[id: string, feature: lite.Feature]> {
  for (const [id, data] of Object.entries(lite.features)) {
    yield [id, lite.feature(data)];
  }
}

export function version(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);
  const { dependencies } = JSON.parse(stdout);
  return dependencies["caniuse-lite"].version;
}
export class CaniuseGit {
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
