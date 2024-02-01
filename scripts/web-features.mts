import { execaSync } from "execa";
import { fileURLToPath } from "url";
import { stringify } from "csv-stringify/sync";

import webFeatures from "web-features";

interface WebFeaturesRecord {
  webFeatureId: string;
  compatKey: string;
  lastSeen: string;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log(stringify(records(), { header: true }));
}

function records(): WebFeaturesRecord[] {
  const result = [];

  const version = getPackageVersion();
  for (const [webFeatureId, feature] of Object.entries(webFeatures)) {
    for (const compatKey of feature.compat_features ?? []) {
      const row = { webFeatureId, compatKey, lastSeen: version };
      result.push(row);
    }
  }

  return result;
}

function getPackageVersion(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);
  const { dependencies } = JSON.parse(stdout);
  return dependencies["web-features"].version;
}
