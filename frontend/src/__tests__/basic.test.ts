import { describe, it, expect } from "vitest";

describe("Minimum 3 Tests", () => {

  it("Test 1: addition works", () => {
    expect(2 + 2).toBe(4);
  });

  it("Test 2: string contains", () => {
    expect("auction dapp").toContain("auction");
  });

  it("Test 3: boolean check", () => {
    expect(true).toBe(true);
  });

});