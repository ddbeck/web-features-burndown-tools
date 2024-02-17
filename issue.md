## Burndowns for BCD, MDN, and Caniuse

I've created burndown lists for web platform features known elsewhere that aren't yet reflected in web-features.
These burndown lists can help us focus our attention on adding the most-interesting features first.
Sources for features include:

- mdn/browser-compat-data (BCD) keys (excluding WebDriver and webextensions data)
- BCD keys cited by mdn/content frontmatter
- _Can I use…?_ features (via `caniuse-lite`)

## How to view the burndown lists

The burndown lists contain a _lot_ of entries (over 14,000), so you'll probably want to use **Filter views**.

The BCD and MDN burndown list has the following filter views:

- [Baseline 2016 and later candidates](https://docs.google.com/spreadsheets/d/1RVgaq4ruHYeJvLCky-h2VAreRP5j_CKifaBvwYEhsL0/edit#gid=1279455993&fvid=1174174519) — BCD keys with Baseline dates possible from 2016 and later (dates are computed, not reviewed)
- [MDN top 1k](https://docs.google.com/spreadsheets/d/1RVgaq4ruHYeJvLCky-h2VAreRP5j_CKifaBvwYEhsL0/edit#gid=1279455993&fvid=1507948958) — BCD keys cited by the top 1000 trafficked pages on MDN
- [Unresolved Baseline dates](https://docs.google.com/spreadsheets/d/1RVgaq4ruHYeJvLCky-h2VAreRP5j_CKifaBvwYEhsL0/edit#gid=1279455993&fvid=1437656086) — BCD keys where a Baseline date could not be computed (usually because of incomplete data in BCD)

### How to use the burndown lists

Find some feature or features that are interesting (e.g., Baseline 2016 and later candidate).
Create feature PRs.
When the PRs merge, mark the checkbox for cited in web-features.
