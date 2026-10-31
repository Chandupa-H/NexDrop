import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart } from "./bar-chart";

describe("BarChart", () => {
  it("renders all seven bars and highlights Today with whole-number ticks", () => {
    render(
      <BarChart
        yMax={22}
        items={Array.from({ length: 7 }, (_, index) => ({
          key: String(index),
          label: index === 6 ? "Today" : `Day ${index + 1}`,
          value: index + 1,
          highlight: index === 6,
          ariaLabel: `Day ${index + 1}: ${index + 1} deliveries`,
        }))}
      />
    );

    expect(screen.getAllByRole("button")).toHaveLength(7);
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Day 7: 7 deliveries" })).toHaveClass(
      "is-highlighted"
    );
    expect(screen.getByText("25")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
  });
});
