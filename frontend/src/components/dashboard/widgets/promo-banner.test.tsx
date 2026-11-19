import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PromoBanner } from "./promo-banner";

describe("PromoBanner", () => {
  it("renders title and subtitle", () => {
    render(
      <PromoBanner
        title="Island-wide Express"
        subtitle="Next-day delivery available across all provinces!"
      />
    );

    expect(screen.getByText("Island-wide Express")).toBeInTheDocument();
    expect(screen.getByText("Next-day delivery available across all provinces!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Learn more" })).toBeInTheDocument();
  });

  it("renders a link button when href is provided", () => {
    render(
      <PromoBanner
        title="Island-wide Express"
        subtitle="Next-day delivery available across all provinces!"
        href="/customer/book"
      />
    );

    const link = screen.getByRole("link", {
      name: "Island-wide Express - Next-day delivery available across all provinces!",
    });
    expect(link).toHaveAttribute("href", "/customer/book");
  });
});
