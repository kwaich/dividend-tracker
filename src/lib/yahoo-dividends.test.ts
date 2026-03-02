// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HostAPI } from "@wealthfolio/addon-sdk";
import {
  fetchYahooDividends,
  toYahooSymbol,
  type YahooDividend,
} from "./yahoo-dividends";

describe("toYahooSymbol", () => {
  it("returns symbol unchanged when no MIC provided", () => {
    expect(toYahooSymbol("AAPL")).toBe("AAPL");
  });

  it("returns symbol unchanged when MIC is null", () => {
    expect(toYahooSymbol("AAPL", null)).toBe("AAPL");
  });

  it("returns symbol unchanged when MIC is undefined", () => {
    expect(toYahooSymbol("AAPL", undefined)).toBe("AAPL");
  });

  it("returns symbol unchanged for unknown MIC", () => {
    expect(toYahooSymbol("XYZ", "UNKNOWN_MIC")).toBe("XYZ");
  });

  it("appends .TO for XTSE (Toronto)", () => {
    expect(toYahooSymbol("RY", "XTSE")).toBe("RY.TO");
  });

  it("appends .L for XLON (London)", () => {
    expect(toYahooSymbol("SHEL", "XLON")).toBe("SHEL.L");
  });

  it("appends .DE for XETR (Frankfurt/Xetra)", () => {
    expect(toYahooSymbol("SAP", "XETR")).toBe("SAP.DE");
  });

  it("appends .HK for XHKG (Hong Kong)", () => {
    expect(toYahooSymbol("0700", "XHKG")).toBe("0700.HK");
  });

  it("appends .SA for BVMF (Brazil)", () => {
    expect(toYahooSymbol("PETR4", "BVMF")).toBe("PETR4.SA");
  });

  it("appends .T for XTKS (Tokyo)", () => {
    expect(toYahooSymbol("7203", "XTKS")).toBe("7203.T");
  });

  it("appends .AX for XASX (Australia)", () => {
    expect(toYahooSymbol("BHP", "XASX")).toBe("BHP.AX");
  });

  it("appends .PA for XPAR (Paris)", () => {
    expect(toYahooSymbol("MC", "XPAR")).toBe("MC.PA");
  });

  it("appends .SW for XSWX (Switzerland)", () => {
    expect(toYahooSymbol("NESN", "XSWX")).toBe("NESN.SW");
  });
});

describe("fetchYahooDividends", () => {
  const fetchDividendsMock =
    vi.fn<(symbol: string) => Promise<YahooDividend[]>>();
  const mockMarket = {
    fetchDividends: fetchDividendsMock,
  } as unknown as HostAPI["market"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates to market.fetchDividends with the symbol", async () => {
    fetchDividendsMock.mockResolvedValue([]);
    await fetchYahooDividends("AAPL.TO", mockMarket);
    expect(fetchDividendsMock).toHaveBeenCalledWith("AAPL.TO");
  });

  it("returns dividend data from market.fetchDividends", async () => {
    const dividends = [
      { amount: 0.25, date: 1718841600 },
      { amount: 0.25, date: 1726704000 },
    ];
    fetchDividendsMock.mockResolvedValue(dividends);
    const result = await fetchYahooDividends("AAPL", mockMarket);
    expect(result).toEqual(dividends);
  });

  it("propagates error from market.fetchDividends", async () => {
    fetchDividendsMock.mockRejectedValue(new Error("Network error"));
    await expect(fetchYahooDividends("AAPL", mockMarket)).rejects.toThrow(
      "Network error",
    );
  });
});
