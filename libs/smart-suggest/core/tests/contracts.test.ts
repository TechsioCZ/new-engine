import { describe, expect, it } from "vitest";
import {
  cachePolicyAllowsPersistentWrite,
  isSerializableSuggestion,
  normalizeSuggestLimit,
  parseSmartSuggestCountryCodeList,
  resolveSmartSuggestCountryScope,
  type SmartSuggestSuggestion,
} from "../src/core";

describe("Smart Suggest core contracts", () => {
  it("keeps suggestions JSON-serializable", () => {
    const suggestion: SmartSuggestSuggestion = {
      confidence: 0.92,
      displayLabel: "Vaclavske namesti 1, Praha 1, 110 00",
      id: "cz-ruian-1",
      kind: "address",
      source: {
        id: "cz-ruian-sample",
        kind: "owned-dataset",
        name: "RUIAN sample",
      },
      address: {
        city: "Praha",
        countryCode: "CZ",
        houseNumber: "1",
        postalCode: "110 00",
        street: "Vaclavske namesti",
      },
    };

    expect(isSerializableSuggestion(suggestion)).toBe(true);
    expect(JSON.parse(JSON.stringify(suggestion))).toMatchObject({
      id: "cz-ruian-1",
      kind: "address",
    });
  });

  it("normalizes suggest limits to the public API range", () => {
    expect(normalizeSuggestLimit(undefined)).toBe(10);
    expect(normalizeSuggestLimit(Number.NaN)).toBe(10);
    expect(normalizeSuggestLimit(Number.POSITIVE_INFINITY)).toBe(20);
    expect(normalizeSuggestLimit(Number.NEGATIVE_INFINITY)).toBe(1);
    expect(normalizeSuggestLimit(0)).toBe(1);
    expect(normalizeSuggestLimit(6.8)).toBe(6);
    expect(normalizeSuggestLimit(100)).toBe(20);
  });

  it("makes provider cache policy persistence explicit", () => {
    expect(cachePolicyAllowsPersistentWrite({ kind: "none" })).toBe(false);
    expect(cachePolicyAllowsPersistentWrite({ kind: "ttl", ttlSeconds: 60 })).toBe(true);
    expect(cachePolicyAllowsPersistentWrite({ kind: "permanent" })).toBe(true);
  });

  it("canonicalizes and resolves country code scopes", () => {
    expect(parseSmartSuggestCountryCodeList("SK,CZE,CZ")).toEqual({
      countryCodes: ["CZ", "SK"],
      ok: true,
    });
    expect(parseSmartSuggestCountryCodeList("CZ,not-a-code")).toMatchObject({
      invalidTokens: ["not-a-code"],
      ok: false,
      reason: "malformed-token",
    });
    expect(resolveSmartSuggestCountryScope({ countryCodes: [] })).toMatchObject({
      countryCodes: [],
      reason: "empty-allowlist",
      status: "blocked",
    });
    expect(
      resolveSmartSuggestCountryScope({ countryCode: "CZ", countryCodes: ["SK"] }),
    ).toMatchObject({
      countryCode: "CZ",
      countryCodes: ["SK"],
      reason: "selected-country-not-allowed",
      status: "blocked",
    });
  });
});
