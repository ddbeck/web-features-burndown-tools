import { execaSync } from "execa";

import webFeatures from "web-features";

export function ids(): string[] {
  return Object.entries(webFeatures).map(([id]) => id);
}

export function caniuseIds(): string[] {
  const ids = [];

  for (const [, { caniuse }] of Object.entries(webFeatures)) {
    if (Array.isArray(caniuse)) {
      ids.push(...caniuse);
    } else if (typeof caniuse === "string") {
      ids.push(caniuse);
    }
  }

  return ids;
}

export function compatKeys(): string[] {
  const result = [];

  for (const [, featureData] of Object.entries(webFeatures)) {
    for (const compatKey of featureData.compat_features ?? []) {
      result.push(compatKey);
    }
  }

  return result;
}

export function version(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);
  const { dependencies } = JSON.parse(stdout);
  return dependencies["web-features"].version;
}
