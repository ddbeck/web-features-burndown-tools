import { execaSync } from "execa";

import { Compat } from "compute-baseline/browser-compat-data";

export const commitHash = getPackageHash();
export const version = getVersion();

export function compatKeys(entryPoints: string[]) {
  const result = [];
  const compat = new Compat();
  for (const feature of compat.walk(entryPoints)) {
    result.push(feature.id);
  }
  return result;
}

function getPackageHash(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);

  const { dependencies } = JSON.parse(stdout);
  const url = new URL(dependencies["@mdn/browser-compat-data"].resolved);
  const hash = url.hash.slice(1); // omit leading `#`
  return hash;
}

function getVersion(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);
  const { dependencies } = JSON.parse(stdout);
  const hash = dependencies["@mdn/browser-compat-data"].version;
  if (hash === undefined) {
    throw Error("Failed to get hash for @mdn/browser-compat-data");
  }
  return hash;
}
