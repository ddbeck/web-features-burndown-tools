import { join } from "node:path";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import assert from "node:assert";

import { execaSync } from "execa";
import { parse } from "csv-parse/sync";

const CACHE_PATH = "./.mdn-content-inventory-cache.json";

export function compatKeys(options?: {
  commitHash?: string;
  onlyTop1000Pages?: boolean;
}): string[] {
  const { commitHash, onlyTop1000Pages } = {
    ...options,
    ...{ onlyTop1000Pages: false },
  };
  const top1kSlugs = onlyTop1000Pages ? getTop1000Slugs() : null;

  const { items } = getInventory(commitHash);
  const result: string[] = [];
  for (const { frontmatter } of items) {
    const { "browser-compat": browserCompat } = frontmatter;
    const keys = Array.isArray(browserCompat)
      ? browserCompat
      : typeof browserCompat === "string"
        ? [browserCompat]
        : [];

    for (const key of keys) {
      if (top1kSlugs === null) {
        result.push(key);
      } else {
        throw new Error("Not implemented");
      }
    }
  }

  return result;
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
  }) as { page: string }[];

  return new Set(csv.map(({ page }) => page));
}

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

function getInventory(commitHash?: string): Inventory {
  if (typeof commitHash !== "string") {
    commitHash = execaSync("git", [
      "ls-remote",
      "https://github.com/mdn/content",
      "refs/heads/main",
    ])
      .stdout.split("refs/heads/main")[0]
      ?.trim();
    assert(typeof commitHash === "string");
  }

  let cache: { [hash: string]: Inventory } = {};
  try {
    cache = JSON.parse(
      readFileSync(CACHE_PATH, {
        encoding: "utf-8",
      }),
    ) as { [hash: string]: Inventory };
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "ENOENT") {
      console.warn(`No cache found: ${err}`);
      cache = {};
    } else {
      throw err;
    }
  }

  const cacheLookup = cache[commitHash] ?? null;
  if (cacheLookup !== null) {
    return cacheLookup;
  }

  console.warn(`Cache miss. Building mdn/content inventory @ ${commitHash}`);
  const newInventory = getInventoryViaClone(commitHash);
  cache[commitHash] = newInventory;
  writeFileSync(CACHE_PATH, JSON.stringify(cache), { encoding: "utf-8" });
  return newInventory;
}

function getInventoryViaClone(commitHash: string): Inventory {
  const tempDir = mkdtempSync(join(tmpdir(), "web-features-burndown-tools-"));
  const inTemp = (file: string, args: string[]) =>
    execaSync(file, args, { cwd: tempDir });
  try {
    console.warn(tempDir);
    inTemp("git", [
      "clone",
      "--filter=tree:0",
      "https://github.com/mdn/content",
      ".",
    ]);
    inTemp("git", ["checkout", commitHash]);
    const commitDate = inTemp("git", [
      "show",
      "--no-patch",
      "--format=%ci",
      "HEAD",
    ]).stdout;

    inTemp("yarn", []);
    const items = JSON.parse(
      inTemp("yarn", ["run", "--silent", "content", "inventory"]).stdout,
    ) as InventoryItem[];

    return { items, commitHash, commitDate };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
