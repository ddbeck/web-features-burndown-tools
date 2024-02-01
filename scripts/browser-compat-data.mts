import { execaSync } from "execa";
import { stringify } from "csv-stringify/sync";

import { fileURLToPath } from "url";

import { walk } from "@ddbeck/strict-browser-compat-data";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(stringify(records(), { header: true }));
}

function records(): { lastSeen: string; compatKey: string }[] {
  const hash = getPackageHash();

  const result = [];
  for (const compatKey of compatKeys()) {
    result.push({ lastSeen: hash, compatKey });
  }

  return result;
}

function* compatKeys() {
  for (const { path } of walk()) {
    yield path as string;
  }
}

function getPackageHash(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);

  const { dependencies } = JSON.parse(stdout);
  const url = new URL(dependencies["@mdn/browser-compat-data"].resolved);
  const hash = url.hash.slice(1); // omit leading `#`
  return hash;
}
