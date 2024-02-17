import { execaSync } from "execa";

import { walk } from "@ddbeck/strict-browser-compat-data/browser-compat-data";

export const commitHash = getPackageHash();
export const version = getVersion();

export function compatKeys(entryPoints: string[]) {
  const result = [];
  for (const { path } of walk(entryPoints)) {
    result.push(path as string);
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
  return dependencies["@mdn/browser-compat-data"].version;
}
