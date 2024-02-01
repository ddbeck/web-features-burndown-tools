import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

import { execaSync } from "execa";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import assert from "node:assert";

const CACHE_PATH = "./.mdn-content-inventory-cache.json";
const TOP1K = loadTop1000();

interface MDNContentRecord {
  slug: string;
  compatKey: string;
  inTop1000: string;
  lastSeen: string;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(stringify(records(), { header: true }));
}

function records(): MDNContentRecord[] {
  const result = [];
  const { commitHash, commitDate, items } = getInventoryQuick();
  for (const { frontmatter } of items) {
    if (frontmatter["browser-compat"] === undefined) {
      continue;
    }
    const compatKeys = Array.isArray(frontmatter["browser-compat"])
      ? frontmatter["browser-compat"]
      : [frontmatter["browser-compat"]];
    for (const compatKey of compatKeys) {
      result.push({
        slug: frontmatter.slug,
        compatKey,
        lastSeen: commitHash,
        lastSeenDate: commitDate,
        inTop1000: TOP1K.has(frontmatter.slug) ? "TRUE" : "FALSE",
      });
    }
  }
  return result;
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

function getInventoryQuick(commitHash?: string): Inventory {
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

  console.warn(`Cache miss. Getting inventory from Git [@${commitHash}]`);
  const newInventory = getInventory(commitHash);
  cache[commitHash] = newInventory;
  writeFileSync(CACHE_PATH, JSON.stringify(cache), { encoding: "utf-8" });
  return newInventory;
}

function getInventory(commitHash: string): Inventory {
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

function loadTop1000(csvPath?: string): Set<string> {
  if (csvPath === undefined) {
    csvPath = process.env["PAGE_VIEW_TRAFFIC_CSV"];
  }
  assert(typeof csvPath === "string", `${csvPath}`);

  const csv = parse(readFileSync(csvPath, { encoding: "utf-8" }), {
    columns: true,
    skip_empty_lines: true,
  }) as { page: string }[];

  const slugs = csv.map((row) => row.page);
  return new Set(slugs.slice(0, 1000));
}
