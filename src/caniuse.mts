import { Temporal } from "@js-temporal/polyfill";
import assert from "assert";
import * as lite from "caniuse-lite";
import { execaSync } from "execa";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { join } from "path";

function isActuallyFromBCD(id: string) {
  // caniuse-lite modifies caniuse with some custom additions from BCD. Since
  // we're already working with BCD directly, don't duplicate them here.
  // https://github.com/browserslist/caniuse-lite/blob/706b6767c0ccd097e46486ea637af405f8d27fec/copy-mdn.js
  if (
    id.startsWith("mdn-") ||
    [
      "css-autofill",
      "css-file-selector-button",
      "css-print-color-adjust",
      "css-width-stretch",
    ].includes(id)
  ) {
    return true;
  }
  return false;
}

export function ids(): string[] {
  return Object.keys(lite.features).filter((id) => !isActuallyFromBCD(id));
}

export function* entries(): Generator<[id: string, feature: lite.Feature]> {
  for (const [id, data] of Object.entries(lite.features)) {
    if (isActuallyFromBCD(id)) {
      continue;
    }
    yield [id, lite.feature(data)];
  }
}

export function version(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);
  const { dependencies } = JSON.parse(stdout);
  return dependencies["caniuse-lite"].version;
}

type CaniuseCache = Map<string, Temporal.Instant>;

export class CaniuseGit {
  repoPath: string;
  ref: string;
  cachePath: string;
  cache: CaniuseCache;

  constructor(repoPath: string, cachePath: string, options?: { ref?: string }) {
    this.repoPath = resolve(repoPath);
    this.cachePath = resolve(cachePath);
    this.ref = options?.ref ?? "main";

    if (!this.isCloned()) {
      this.clone();
    }
    this.checkOut();
    this.cache = this.deserializeCache();
  }

  isCloned(): boolean {
    if (existsSync(this.repoPath)) {
      if (existsSync(join(this.repoPath, "/.git"))) {
        const { stdout } = execaSync("git", ["status", "--porcelain"], {
          stdio: ["inherit", "pipe"],
          cwd: this.repoPath,
        });
        if (stdout.split("\n").length > 1) {
          throw new Error("Dirty clone!");
        }
        return true;
      }
    }
    return false;
  }

  clone() {
    const repo = "https://github.com/Fyrd/caniuse.git";
    console.warn(`Cloning ${repo} to ${this.repoPath}`);
    execaSync("git", ["clone", repo, this.repoPath], {
      stdio: ["inherit", "pipe"],
    });
    console.warn(`Finished cloning ${repo} to ${this.repoPath}`);
  }

  checkOut(): void {
    const cmds: [cmd: string, args: string[]][] = [
      ["git", ["pull", "origin", "main"]],
      ["git", ["checkout", this.ref]],
    ];
    for (const [cmd, args] of cmds) {
      const { exitCode } = execaSync(cmd, args, {
        cwd: this.repoPath,
        stdio: "inherit",
      });
      if (exitCode !== 0) {
        throw Error(`There was a problem checking out ${this.ref}`);
      }
    }
  }

  getAddedDateTime(id: string): Temporal.Instant | null {
    const added = this.cache.get(id);
    if (added !== undefined) {
      return added;
    }

    const jsonFile = join(this.repoPath, `features-json/${id}.json`);
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
        { cwd: this.repoPath },
      ).stdout;
      const firstLine = commitDates.split("\n").at(-1);
      if (firstLine === undefined) {
        throw new Error("This should never happen");
      }
      const instant = Temporal.Instant.from(firstLine);

      this.cache.set(id, instant);
      this.serializeCache();

      return instant;
    }
    console.warn(`caniuse: ${id} has no corresponding JSON in ${jsonFile}`);
    return null;
  }

  serializeCache() {
    const serializable = [];
    for (const [id, created] of this.cache.entries()) {
      serializable.push([id, created.toString()]);
    }
    const json = JSON.stringify(serializable, undefined, 2);
    writeFileSync(this.cachePath, json, { encoding: "utf-8" });
  }

  deserializeCache() {
    const result: CaniuseCache = new Map();

    if (!existsSync(this.cachePath)) {
      this.cache = result;
      return result;
    }
    const source = readFileSync(this.cachePath, { encoding: "utf-8" });
    const incoming = JSON.parse(source) as unknown;

    assert(Array.isArray(incoming));
    for (const item of incoming) {
      assert(Array.isArray(item));
      assert(item.length === 2);

      const [id, created] = item;

      assert(typeof id === "string");
      assert(typeof created === "string");

      result.set(id, Temporal.Instant.from(created));
    }

    return result;
  }
}
