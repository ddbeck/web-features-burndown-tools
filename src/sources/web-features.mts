import { execaSync } from "execa";

// Before v10: import features from "web-features";
import * as webFeatures from "web-features";

const features = (
  "features" in webFeatures ? webFeatures.features : webFeatures
) as typeof webFeatures.features;

export function ids(): string[] {
  return Object.entries(features).map(([id]) => id);
}

export function caniuseIds(): string[] {
  const ids = [];

  for (const [, { caniuse }] of Object.entries(features)) {
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

  for (const [, featureData] of Object.entries(features)) {
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
