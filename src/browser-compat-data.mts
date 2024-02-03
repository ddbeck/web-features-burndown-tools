import { execaSync } from "execa";

import { walk } from "@ddbeck/strict-browser-compat-data";

export const commitHash = getPackageHash();

export function compatKeys() {
  const result = [];
  for (const { path } of walk()) {
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
