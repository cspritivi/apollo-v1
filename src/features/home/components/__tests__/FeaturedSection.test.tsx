/**
 * Unit tests for FeaturedSection — generic horizontal scroll container
 * with a title and optional "See All" link. Used on the Home storefront
 * for featured fabrics, new arrivals, etc.
 */

import React from "react";
import { Text } from "react-native";
import { render, fireEvent } from "@testing-library/react-native";
import FeaturedSection from "../FeaturedSection";

describe("FeaturedSection", () => {
  it("renders the section title", () => {
    const { getByText } = render(
      <FeaturedSection title="New Arrivals">
        <Text>Child content</Text>
      </FeaturedSection>,
    );
    expect(getByText("New Arrivals")).toBeTruthy();
  });

  it("renders children", () => {
    const { getByText } = render(
      <FeaturedSection title="Featured">
        <Text>Fabric Card</Text>
      </FeaturedSection>,
    );
    expect(getByText("Fabric Card")).toBeTruthy();
  });

  it('renders "See All" link when onSeeAll is provided', () => {
    const onSeeAll = jest.fn();
    const { getByText } = render(
      <FeaturedSection title="Featured" onSeeAll={onSeeAll}>
        <Text>Content</Text>
      </FeaturedSection>,
    );
    expect(getByText("See All")).toBeTruthy();
  });

  it("calls onSeeAll when See All is pressed", () => {
    const onSeeAll = jest.fn();
    const { getByText } = render(
      <FeaturedSection title="Featured" onSeeAll={onSeeAll}>
        <Text>Content</Text>
      </FeaturedSection>,
    );
    fireEvent.press(getByText("See All"));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('does not render "See All" when onSeeAll is not provided', () => {
    const { queryByText } = render(
      <FeaturedSection title="Featured">
        <Text>Content</Text>
      </FeaturedSection>,
    );
    expect(queryByText("See All")).toBeNull();
  });
});
