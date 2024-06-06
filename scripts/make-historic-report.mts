import { Temporal } from "@js-temporal/polyfill";
import assert from "assert";
import { execaSync } from "execa";

const TODAY = Temporal.Now.instant().toZonedDateTimeISO("UTC").startOfDay();
const START_DATE = TODAY.subtract({ weeks: 2 });

// Note: If you want to generate all historic data from inception, then you probably want to replace the above with this:
// const START_DATE = Temporal.Instant.from(
//   "2023-09-28T00:00:00.000Z",
// ).toZonedDateTimeISO("UTC");

function npmReleases(pkg: string) {
  const { stdout } = execaSync("npm", ["view", pkg, "time", "--json"]);
  const releases = Object.entries(JSON.parse(stdout)) as [
    version: string,
    dt: string,
  ][];
  const releasesDts = releases
    .map<
      [string, Temporal.ZonedDateTime]
    >(([version, dt]) => [version, Temporal.Instant.from(dt).toZonedDateTimeISO("UTC")])
    .filter(([version]) => version !== "created" && version !== "modified");
  releasesDts.sort((a, b) => Temporal.ZonedDateTime.compare(a[1], b[1]));
  return releasesDts;
}

function findNearestRelease(
  releases: ReturnType<typeof npmReleases>,
  target: Temporal.ZonedDateTime,
) {
  let nearest: (typeof releases)[0] | null = null;

  for (const [version, dt] of releases) {
    if (Temporal.ZonedDateTime.compare(dt, target) <= 0) {
      nearest = [version, dt];
    } else {
      break;
    }
  }

  if (nearest === null) {
    throw new Error(`Could not find release nearest to ${target}`);
  }

  return nearest;
}

function findNearestContentInventory(
  releases: ReturnType<typeof npmReleases>,
  target: Temporal.ZonedDateTime,
) {
  let nearest: (typeof releases)[0] | null = null;

  for (const [version, dt] of releases) {
    const [, buildinfo] = version.split("-");
    assert(buildinfo);
    const [yyymmdd] = buildinfo.split(".");
    assert(yyymmdd);

    const yyyymmddTarget = target.toString().slice(0, 10).replaceAll("-", "");

    if (yyymmdd.localeCompare(yyyymmddTarget) <= 0) {
      nearest = [version, dt];
    } else {
      break;
    }
  }

  if (nearest === null) {
    throw new Error(`Could not find release nearest to ${target}`);
  }

  return nearest;
}

function installNpmPackage(pkgSpec: string) {
  execaSync("npm", ["--silent", "install", pkgSpec], { stdio: "inherit" });
}

const now = Temporal.Now.zonedDateTimeISO("UTC");
let target = START_DATE;

while (Temporal.ZonedDateTime.compare(target, now) < 1) {
  const pkgs = ["@mdn/browser-compat-data", "web-features", "caniuse-lite"];

  for (const pkg of pkgs) {
    const [version, dt] = findNearestRelease(npmReleases(pkg), target);
    const pkgSpec = `${pkg}@${version}`;
    console.warn(`Installing ${pkgSpec} (${dt})`);
    installNpmPackage(pkgSpec);
  }

  const [mdnContentRelease] = findNearestContentInventory(
    npmReleases("@ddbeck/mdn-content-inventory"),
    target,
  );
  installNpmPackage(`@ddbeck/mdn-content-inventory@${mdnContentRelease}`);
  execaSync("npx", ["tsx", "./src/generate-report.mts"], {
    env: { REPORT_DATE: target.toString() },
    stdio: "inherit",
  });
  target = target.add({ days: 1 });
}

console.log("Undoing changes to `package.json` and `package-lock.json`.");
execaSync(
  "git",
  ["restore", "--worktree", "package.json", "package-lock.json"],
  { stdio: "inherit" },
);
