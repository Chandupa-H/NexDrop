import { describe, expect, it } from "vitest";
import {
  getDateKeyInTimeZone,
  getTodayDateInTimeZone,
  getWeekdayInTimeZone,
} from "./format";

describe("Asia/Colombo dashboard dates", () => {
  it("uses the Colombo calendar day instead of the UTC day", () => {
    const instant = new Date("2026-10-30T20:00:00.000Z");

    expect(getTodayDateInTimeZone(instant)).toBe("2026-10-31");
    expect(getDateKeyInTimeZone("2026-10-30T20:00:00.000Z")).toBe("2026-10-31");
    expect(getWeekdayInTimeZone("2026-10-30T20:00:00.000Z")).toBe("Saturday");
  });

  it("preserves date-only values as local calendar dates", () => {
    expect(getDateKeyInTimeZone("2026-10-31")).toBe("2026-10-31");
    expect(getWeekdayInTimeZone("2026-10-31")).toBe("Saturday");
  });
});
