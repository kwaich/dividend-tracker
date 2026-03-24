// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, cleanup, waitFor } from "@testing-library/react";
import type { AddonContext, Asset } from "@wealthfolio/addon-sdk";
import { createElement, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAssetProfiles } from "./use-asset-profiles";

afterEach(() => cleanup());

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
  return Wrapper;
}

function makeCtx(getProfileFn: (id: string) => Promise<Asset>): AddonContext {
  return {
    api: {
      assets: { getProfile: getProfileFn },
    },
  } as unknown as AddonContext;
}

const fakeAsset: Asset = {
  id: "asset-1",
  kind: "security",
  quoteMode: "SYMBOL",
  quoteCcy: "USD",
  instrumentSymbol: "AAPL",
  instrumentExchangeMic: "XNAS",
} as unknown as Asset;

describe("useAssetProfiles", () => {
  it("returns empty profiles and allLoaded:true when instrumentIds is empty", () => {
    const ctx = makeCtx(vi.fn());
    const { result } = renderHook(() => useAssetProfiles(ctx, []), {
      wrapper: makeWrapper(),
    });

    expect(result.current.profiles).toEqual([]);
    expect(result.current.allLoaded).toBe(true);
  });

  it("returns profiles array when all queries complete", async () => {
    const getProfile = vi.fn().mockResolvedValue(fakeAsset);
    const ctx = makeCtx(getProfile);

    const { result } = renderHook(() => useAssetProfiles(ctx, ["asset-1"]), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => {
      expect(result.current.allLoaded).toBe(true);
      expect(result.current.profiles).toEqual([fakeAsset]);
    });
  });

  it("allLoaded is false while any query is still loading", async () => {
    let resolveProfile!: (v: Asset) => void;
    const getProfile = vi.fn().mockImplementation(
      () =>
        new Promise((r) => {
          resolveProfile = r;
        }),
    );
    const ctx = makeCtx(getProfile);

    const { result } = renderHook(() => useAssetProfiles(ctx, ["asset-1"]), {
      wrapper: makeWrapper(),
    });

    expect(result.current.allLoaded).toBe(false);

    resolveProfile(fakeAsset);

    await waitFor(() => {
      expect(result.current.allLoaded).toBe(true);
    });
  });
});
