import { execaSync } from "execa";

import * as wf from "web-features";

// Handle old-style import from web-features
const features = (
  "default" in wf ? wf.default : wf.features
) as typeof wf.default;

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
