import { stringify } from "csv-stringify/sync";
import * as caniuse from "./caniuse.mjs";
import { CaniuseGit } from "./caniuse.mjs";
import { caniuseIds } from "./web-features.mjs";

const caniuseIdsInWebFeatures = new Set(caniuseIds());

interface BurndownEntry {
  caniuseLiteVersion: string;
  dateAddedToCaniuse: string | null;
  caniuseId: string;
  title: string;
  shownOnCaniuse: boolean;
  citedByWebFeatures: boolean;
  link: string | null;
}

function burndownEntries(): BurndownEntry[] {
  const entries: BurndownEntry[] = [];

  const caniuseLiteVersion = caniuse.version();
  const caniuseSrc = new CaniuseGit();

  process.on("SIGINT", function () {
    caniuseSrc.close();
  });

  try {
    for (const [id, feature] of caniuse.entries()) {
      if (id.startsWith("mdn-")) {
        continue; // These are weird custom imports to caniuse-lite
      }
      entries.push({
        caniuseLiteVersion,
        caniuseId: id,
        title: feature.title,
        shownOnCaniuse: feature.shown,
        dateAddedToCaniuse:
          caniuseSrc.getAddedDateTime(id)?.toLocaleString() ?? null,
        citedByWebFeatures: caniuseIdsInWebFeatures.has(id),
        link: feature.shown
          ? formatLink(`https://caniuse.com/${id}`, feature.title)
          : null,
      });
    }
  } finally {
    caniuseSrc.close();
  }

  return entries;
}

function formatLink(url: string, title: string) {
  return `=HYPERLINK("${url}", "${title.replaceAll('"', '""')}")`;
}

export function tsv() {
  return stringify(burndownEntries(), {
    header: false,
    delimiter: "\t",
    cast: { boolean: (b) => (b ? "TRUE" : "FALSE") },
  });
}
