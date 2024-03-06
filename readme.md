# web-features-burndown-tools

## Generate a burndown list for features in mdn/browser-compat-data and mdn/content

**Note:** To determine the top 1000 pages on MDN, you'll need a CSV file containing a column with a `page` where each row is an MDN slug, sorted by proportion of MDN's total traffic (highest first).
Set `PAGE_VIEW_TRAFFIC_CSV` environment variable to the path to the CSV file.

```sh
$ npx tsx ./src/compat-burndown.mts
```

## Generate a burndown list for features in mdn/browser-compat-data and mdn/content

```sh
$ npx tsx ./src/caniuse-burndown.mts
```

## Updating spreadsheets

0. Make sure there are no notes in the notes column. This procedure won't work if the existing rows need to be updated.
1. Run `npx tsx ./src/compat-burndown.mts > compat.tsv`.
2. Open the unfiltered burndown spreadsheet.
3. Run `tail +2 compat.tsv | pbcopy` (on macOS).
4. Paste into cell A2.
5. For each filter view, set the ranges to A1:H.
6. Repeat for `caniuse-burndown.mts`.
