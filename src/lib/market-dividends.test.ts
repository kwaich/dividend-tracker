// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostAPI } from "@wealthfolio/addon-sdk";
import { fetchMarketDividends, type DividendEvent } from "./market-dividends";

describe("fetchMarketDividends", () => {
  const fetchDividendsMock =
    vi.fn<(symbol: string, options?: unknown) => Promise<DividendEvent[]>>();
  const mockMarket = {
    fetchDividends: fetchDividendsMock,
  } as unknown as HostAPI["market"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to market.fetchDividends with provider-neutral options", async () => {
    fetchDividendsMock.mockResolvedValue([]);
    await fetchMarketDividends(
      {
        symbol: "RY",
        options: {
          exchangeMic: "XTSE",
          instrumentType: "EQUITY",
          quoteCcy: "CAD",
        },
      },
      mockMarket,
    );
    expect(fetchDividendsMock).toHaveBeenCalledWith("RY", {
      exchangeMic: "XTSE",
      instrumentType: "EQUITY",
      quoteCcy: "CAD",
    });
  });

  it("returns dividend data from market.fetchDividends", async () => {
    const dividends = [
      { amount: 0.25, date: 1718841600 },
      { amount: 0.25, date: 1726704000 },
    ];
    fetchDividendsMock.mockResolvedValue(dividends);
    const result = await fetchMarketDividends({ symbol: "AAPL" }, mockMarket);
    expect(result).toEqual(dividends);
  });

  it("propagates error from market.fetchDividends", async () => {
    fetchDividendsMock.mockRejectedValue(new Error("Network error"));
    await expect(
      fetchMarketDividends({ symbol: "AAPL" }, mockMarket),
    ).rejects.toThrow("Network error");
  });
});
