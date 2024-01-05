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

  const hash = getPackageHash();
  const date = getDate(hash);

  insertHash({ hash, date });
  insertLatest(hash);

  upsertKeys(hash, compatKeys);
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

function insertHash(row: { hash: string; date: string }) {
  const statement = db.prepare(
    `INSERT INTO Browser_Compat_Data_Hashes (hash, date)
    VALUES (@hash, @date)
    ON CONFLICT DO NOTHING`,
  );
  statement.run(row);
}

function getCurrentHash(): string | null {
  const select = db.prepare(
    "SELECT Browser_Compat_Data_Latest.hash FROM Browser_Compat_Data_Latest",
  );
  const row = select.get();
  if (row && typeof row === "object") {
    if ("hash" in row && typeof row.hash === "string") {
      return row.hash;
    }
  }
  return null;
}

function insertLatest(hash: string) {
  const previousHash: string = getCurrentHash() ?? "null";

  const del = db.prepare("DELETE FROM Browser_Compat_Data_Latest"); // Clear existing entries
  const insert = db
    .prepare("INSERT INTO Browser_Compat_Data_Latest (hash) VALUES (@hash)")
    .bind({ hash });

  db.transaction(() => {
    del.run();
    insert.run();
  })();

  console.log(
    `Updated @mdn/browser-compat-data hash from ${previousHash.slice(
      -6,
    )} to ${hash.slice(-6)}`,
  );
}

function upsertKeys(hash: string, keys: string[]) {
  const upsertKey = db.prepare(
    `INSERT INTO Browser_Compat_Data_Keys (key, hash)
    VALUES (@key, @hash)
    ON CONFLICT (key) DO UPDATE SET hash = @hash`,
  );
  db.transaction(() => {
    for (const key of keys) {
      upsertKey.run({ hash, key });
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
