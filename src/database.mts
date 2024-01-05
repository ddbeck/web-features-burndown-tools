import Database from "better-sqlite3";

let db: Database.Database | null = null;

export function database() {
  if (db === null) {
    db = new Database("burndown.db");
    db.pragma("foreign_keys = ON");
  }

  return db;
}
