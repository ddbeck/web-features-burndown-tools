import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path/posix";

export function getTempDir(): string {
  return mkdtempSync(join(tmpdir(), "web-features-burndown-tools-"));
}
