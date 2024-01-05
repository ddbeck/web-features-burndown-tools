import * as url from "node:url";
import { readFileSync } from "node:fs";

import { database } from "./database.mjs";

function initDatabase() {
  database().exec(readFileSync("./src/init.sql", "utf8"));
}

if (import.meta.url.startsWith("file:")) {
  const modulePath = url.fileURLToPath(import.meta.url);
  if (process.argv[1] === modulePath) {
    initDatabase();
  }
}
