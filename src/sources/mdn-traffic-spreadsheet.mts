import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";

export function slugsByTrafficRank(
  csvPath = process.env["PAGE_VIEW_TRAFFIC_CSV"],
): string[] {
  if (csvPath === undefined) {
    throw new Error(
      "No page view traffic CSV path. Call with csvPath argument or set PAGE_VIEW_TRAFFIC_CSV environment variable.",
    );
  }

  const csv = parse(readFileSync(csvPath, { encoding: "utf-8" }), {
    columns: true,
    skip_empty_lines: true,
  }) as { page: string }[];

  return csv.map(({ page }) => page);
}
