import { Temporal } from "@js-temporal/polyfill";
import { computeBaseline } from "compute-baseline";

export function findlastIntroducedDate(
  calculation: ReturnType<typeof computeBaseline>,
): Temporal.PlainDate | undefined {
  const dates = [];
  for (const initialSupport of calculation.support.values()) {
    if (initialSupport) {
      const { release } = initialSupport;
      if (release.date) {
        dates.push(release.date);
      }
    }
  }

  dates.sort(Temporal.PlainDate.compare);
  return dates.at(-1);
}
