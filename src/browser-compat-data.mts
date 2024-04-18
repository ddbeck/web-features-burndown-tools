import { execaSync } from "execa";

import { Compat } from "compute-baseline/browser-compat-data";

export const commitHash = getPackageHash();
export const version = getVersion();

// export class BrowserCompatData {
//   readonly viaImport: boolean;
//   readonly version: string;
//   readonly hash?: string;

//   constructor(opts?: { version: string } | { hash: string }) {
//     if (opts === undefined) {
//       this.viaImport = true;
//       // TODO: set this.version
//       // TODO: set this.hash
//       // TODO: use data from node_modules
//       // TODO: new Compat()
//       return;
//     }
//     this.viaImport = false;

//     if ("version" in opts) {
//       this.version = opts.version;
//       // TODO: set this.hash
//       // TODO: use data from download
//       // TODO: new Compat(<data>)
//       return;
//     }

//     if ("hash" in opts) {
//       this.hash = opts.hash;
//       // TODO: this.version
//       // TODO: use data from Git build
//       // TODO: new Compat(<data>)
//       return;
//     }
//   }
// }

export function compatKeys(entryPoints: string[]) {
  const result = [];
  const compat = new Compat();
  for (const { path } of compat.walk(entryPoints)) {
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
  const hash = dependencies["@mdn/browser-compat-data"].version;
  if (hash === undefined) {
    throw Error("Failed to get hash for @mdn/browser-compat-data");
  }
  return hash;
}
