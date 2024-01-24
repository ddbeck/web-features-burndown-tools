import url from "node:url";

import { execaSync } from "execa";
import { walk } from "@ddbeck/strict-browser-compat-data";

import { database } from "../database.mjs";

const db = database();

function load() {
  const compatKeys: string[] = [];

  for (const { path } of walk()) {
    compatKeys.push(path);
  }

  const commitHash = getPackageHash();
  const commitDate = getDate(commitHash);

  insertHash({ commitHash, commitDate });
  insertLatest(commitHash);

  upsertKeys(commitHash, compatKeys);
}

function getPackageHash(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);

  const { dependencies } = JSON.parse(stdout);
  const url = new URL(dependencies["@mdn/browser-compat-data"].resolved);
  const hash = url.hash.slice(1); // omit leading `#`
  return hash;
}

function getDate(hash: string): string {
  const { stdout } = execaSync("gh", [
    "api",
    `/repos/mdn/browser-compat-data/commits/${hash}`,
    "--jq",
    ".commit.author.date",
  ]);
  return stdout;
}

function insertHash(row: { commitHash: string; commitDate: string }) {
  const statement = db.prepare(
    `INSERT INTO browser_compat_data_hashes (commit_hash, commit_date)
    VALUES (@commitHash, @commitDate)
    ON CONFLICT DO NOTHING`,
  );
  statement.run(row);
}

function getCurrentHash(): string | null {
  const select = db.prepare(
    "SELECT browser_compat_data_latest.commit_hash FROM browser_compat_data_latest",
  );
  const row = select.get();
  if (row && typeof row === "object") {
    if ("hash" in row && typeof row.hash === "string") {
      return row.hash;
    }
  }
  return null;
}

function insertLatest(commitHash: string) {
  const previousHash: string = getCurrentHash() ?? "null";

  const del = db.prepare("DELETE FROM browser_compat_data_latest"); // Clear existing entries
  const insert = db
    .prepare(
      "INSERT INTO browser_compat_data_latest (commit_hash) VALUES (@commitHash)",
    )
    .bind({ commitHash });

  db.transaction(() => {
    del.run();
    insert.run();
  })();

  console.log(
    `Updated @mdn/browser-compat-data hash from ${previousHash.slice(
      -6,
    )} to ${commitHash.slice(-6)}`,
  );
}

function upsertKeys(commitHash: string, keys: string[]) {
  const upsertKey = db.prepare(
    `INSERT INTO browser_compat_data_keys (featureKey, commitHash)
    VALUES (@key, @hash)
    ON CONFLICT (key) DO UPDATE SET hash = @hash`,
  );
  db.transaction(() => {
    for (const featureKey of keys) {
      upsertKey.run({ commitHash, featureKey });
    }
  })();
  console.log(`Added or updated ${keys.length} compat keys`);
}

if (import.meta.url.startsWith("file:")) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    load();
  }
}
