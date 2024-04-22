import { createCanvas } from "canvas";
import { Chart, ChartItem } from "chart.js/auto";
import { readFileSync, readdirSync, writeFileSync } from "fs";
import {
  ProgressReport,
  getReportsDir,
  parseReport,
} from "./generate-report.mjs";
import { join } from "path";
import { Temporal } from "@js-temporal/polyfill";

const reports = (() => {
  const reportsDir = getReportsDir();
  const files = readdirSync(getReportsDir());
  const jsons = files.filter((f) => f.endsWith(".json"));

  const reports: ProgressReport[] = [];
  for (const f of jsons) {
    const report = parseReport(
      readFileSync(join(reportsDir, f), { encoding: "utf-8" }),
    );
    if (
      Temporal.ZonedDateTime.compare(
        Temporal.ZonedDateTime.from("2024-01-01[UTC]"),
        report.meta.date,
      ) < 1
    )
      reports.push(report);
  }

  // Get thursdays only
  const thursdays = reports.filter((r) => r.meta.date.dayOfWeek === 4);

  return thursdays;
})();

const CaniuseChartData = {
  datasets: [
    {
      label: "caniuse IDs",
      data: reports.map((report) => ({
        x: report.meta.date.toPlainDate().toString(),
        y: report.caniuse.ids.length,
      })),
    },
    {
      label: "caniuse IDs cited by web-features",
      data: reports.map((report) => ({
        x: report.meta.date.toPlainDate().toString(),
        y: report.webFeatures.caniuseIds.length,
      })),
    },
  ],
};
const BCDChartData = {
  datasets: [
    {
      label: "BCD keys",
      data: reports.map((report) => ({
        x: report.meta.date.toPlainDate().toString(),
        y: report.browserCompatData.keys.length,
      })),
    },
    {
      label: "BCD keys cited by web-features",
      data: reports.map((report) => ({
        x: report.meta.date.toPlainDate().toString(),
        y: report.webFeatures.mdnBrowserCompatDataKeys.length,
      })),
    },
  ],
};

const bcdCanvas = createCanvas(1200, 800);
new Chart(bcdCanvas.getContext("2d") as unknown as ChartItem, {
  type: "line",
  data: BCDChartData,
});
const bcd = bcdCanvas.toBuffer();
writeFileSync("bcd.png", bcd);

const caniuseCanvas = createCanvas(1200, 800);
new Chart(caniuseCanvas.getContext("2d") as unknown as ChartItem, {
  type: "line",
  data: CaniuseChartData,
});
const caniuse = caniuseCanvas.toBuffer();
writeFileSync("caniuse.png", caniuse);
