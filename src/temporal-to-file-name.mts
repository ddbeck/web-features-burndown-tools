import { Temporal } from "@js-temporal/polyfill";

export function temporalToFileName(dt: Temporal.ZonedDateTime) {
  return dt.toPlainDateTime().toString().replaceAll(/[.:]/g, "") + ".json";
}
