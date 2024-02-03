import { execaSync } from "execa";

import webFeatures from "web-features";

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
