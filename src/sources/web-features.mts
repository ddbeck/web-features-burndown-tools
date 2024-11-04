import { feature } from "compute-baseline/browser-compat-data";
import { execaSync } from "execa";

import * as wf from "web-features";

// Handle old-style import from web-features
const features = (
  "default" in wf ? wf.default : wf.features
) as typeof wf.features;

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

export function compatKeysFiltered(opts?: {
  requireStandardTrack?: boolean;
  requireNonDeprecated?: boolean;
}): string[] {
  const requireStandardTrack = opts?.requireStandardTrack ?? false;
  const requireNonDeprecated = opts?.requireNonDeprecated ?? false;

  const result = [];

  for (const [, featureData] of Object.entries(features)) {
    for (const compatKey of featureData.compat_features ?? []) {
      if (!requireNonDeprecated && !requireStandardTrack) {
        result.push(compatKey);
      }

      let f;
      try {
        f = feature(compatKey);
      } catch (err) {
        if (err instanceof Error && err.message.includes("unindexable")) {
          console.warn(
            `Couldn't determine if ${compatKey} (unindexable) was standard and non-deprecated. Ignoring it.`,
          );
          continue;
        }
        throw err;
      }

      if (requireStandardTrack && f.standard_track === false) {
        continue;
      }
      if (requireNonDeprecated && f.deprecated === true) {
        continue;
      }
      result.push(f.id);
    }
  }

  return result;
}

export function version(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);
  const { dependencies } = JSON.parse(stdout);
  return dependencies["web-features"].version;
}
