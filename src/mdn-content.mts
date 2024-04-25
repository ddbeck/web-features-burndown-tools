import { createStringifyStream } from "big-json";
import { parse } from "csv-parse/sync";
import { execaSync } from "execa";
import assert from "node:assert";
import { createWriteStream, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface Inventory {
  commitHash: string;
  commitDate: string;
  items: InventoryItem[];
}

interface InventoryItem {
  path: string;
  frontmatter: Frontmatter;
}

interface Frontmatter {
  title: string;
  slug: string;
  "page-type": string;
  "browser-compat"?: string | string[];
}

type MdnContentCache = Map<string, Inventory>;

export class MdnContentGit {
  repoPath: string;
  cachePath: string;
  cache: Map<string, Inventory>;

  constructor(
    repoPath: string = process.env["MDN_CONTENT_REPO_PATH"] ?? "./.mdn-content",
    cachePath: string = "./.mdn-content-inventory-cache.json",
  ) {
    this.repoPath = resolve(repoPath);
    this.cachePath = resolve(cachePath);
    this.cache = this.deserializeCache();
  }

  compatKeys(options?: {
    commitHash?: string;
    onlyTop1000Pages?: boolean;
  }): string[] {
    const { commitHash, onlyTop1000Pages } = {
      ...{ onlyTop1000Pages: false },
      ...options,
    };
    const top1kSlugs = onlyTop1000Pages ? getTop1000Slugs() : null;
    const { items } = this.getInventory(commitHash);
    const result: string[] = [];
    for (const { frontmatter } of items) {
      const { "browser-compat": browserCompat } = frontmatter;
      const keys = Array.isArray(browserCompat)
        ? browserCompat
        : typeof browserCompat === "string"
          ? [browserCompat]
          : [];

      for (const key of keys) {
        if (top1kSlugs === null || top1kSlugs.has(frontmatter.slug)) {
          result.push(key);
        }
      }
    }

    return result;
  }

  getInventory(ref?: string): Inventory {
    if (typeof ref !== "string") {
      ref = this.getMainCommitHash();
    }

    let result;
    const cacheLookup = this.cache.get(ref);
    if (cacheLookup === undefined) {
      console.warn(`Cache miss. Generating mdn/content inventory @ ${ref}`);
      result = this.generateInventory(ref);
      this.cache.set(ref, result);
      this.serializeCache();
    } else {
      result = cacheLookup;
    }
    return result;
  }

  generateInventory(commitHash: string): Inventory {
    if (!this.isCloned()) {
      this.clone();
    }

    const inRepo = (file: string, args: string[]) =>
      execaSync(file, args, { cwd: this.repoPath, stdio: ["inherit", "pipe"] });

    inRepo("git", ["fetch", "origin", "main"]);
    inRepo("git", ["checkout", commitHash]);
    const commitDate = inRepo("git", [
      "show",
      "--no-patch",
      "--format=%ci",
      "HEAD",
    ]).stdout;
    this.clean();
    inRepo("yarn", ["install", "--frozen-lockfile"]);
    const items = JSON.parse(
      inRepo("yarn", ["run", "--silent", "content", "inventory"]).stdout,
    ) as InventoryItem[];
    this.clean();
    return { items, commitHash, commitDate };
  }

  isCloned(): boolean {
    if (existsSync(this.repoPath)) {
      if (existsSync(join(this.repoPath, "/.git"))) {
        const { stdout } = execaSync("git", ["status", "--porcelain"], {
          stdio: ["inherit", "pipe"],
          cwd: this.repoPath,
        });
        if (stdout.split("\n").length > 1) {
          throw new Error(`Dirty clone in ${this.repoPath}`);
        }
        return true;
      }
    }
    return false;
  }

  clean(): void {
    execaSync("rm", ["-rf", "node_modules"], { cwd: this.repoPath });
  }

  clone(): void {
    const repo = "https://github.com/mdn/content.git";
    console.warn(`Cloning ${repo} to ${this.repoPath}`);
    execaSync("git", ["clone", repo, this.repoPath], {
      stdio: ["inherit", "pipe"],
    });
    console.warn(`Finished cloning ${repo} to ${this.repoPath}`);
  }

  getMainCommitHash(): string {
    const hash = execaSync("git", [
      "ls-remote",
      "https://github.com/mdn/content",
      "refs/heads/main",
    ])
      .stdout.split("refs/heads/main")[0]
      ?.trim();
    assert(typeof hash === "string");
    return hash;
  }

  serializeCache() {
    const serializable = [];
    for (const [hash, inventory] of this.cache.entries()) {
      serializable.push([hash, inventory]);
    }

    const cacheStream = createWriteStream(this.cachePath);
    const stringifyStream = createStringifyStream({
      body: serializable,
    });
    stringifyStream.pipe(cacheStream);
    stringifyStream.on("error", (err) => {
      throw err;
    });
    stringifyStream.on("end", () => {
      console.log(`Cached to ${this.cachePath}`);
    });
  }

  deserializeCache(): MdnContentCache {
    const result: MdnContentCache = new Map();

    if (!existsSync(this.cachePath)) {
      this.cache = result;
      return result;
    }
    const source = readFileSync(this.cachePath, { encoding: "utf-8" });
    const incoming = JSON.parse(source) as [
      hash: string,
      inventory: Inventory,
    ][];

    for (const [hash, inventory] of incoming) {
      result.set(hash, inventory);
    }

    return result;
  }
}

function getTop1000Slugs(
  csvPath = process.env["PAGE_VIEW_TRAFFIC_CSV"],
): Set<string> {
  if (csvPath === undefined) {
    throw new Error(
      "No page view traffic CSV path. Call with path or set PAGE_VIEW_TRAFFIC_CSV environment variable.",
    );
  }

  const csv = parse(readFileSync(csvPath, { encoding: "utf-8" }), {
    columns: true,
    skip_empty_lines: true,
  }).slice(0, 1000) as { page: string }[];

  return new Set(csv.map(({ page }) => page));
}
