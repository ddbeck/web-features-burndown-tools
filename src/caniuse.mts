import * as lite from "caniuse-lite";
import { execaSync } from "execa";

export function ids(): string[] {
  return Object.keys(lite.features);
}

export function* entries(): Generator<[id: string, feature: lite.Feature]> {
  for (const [id, data] of Object.entries(lite.features)) {
    yield [id, lite.feature(data)];
  }
}

export function version(): string {
  const { stdout } = execaSync("npm", ["list", "--json"]);
  const { dependencies } = JSON.parse(stdout);
  return dependencies["caniuse-lite"].version;
}
