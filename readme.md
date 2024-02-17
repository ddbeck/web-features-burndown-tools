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
