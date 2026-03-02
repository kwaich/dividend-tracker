const MIC_TO_YAHOO_SUFFIX: Record<string, string> = {
  XTSE: ".TO",
  XTSX: ".V",
  XCNQ: ".CN",
  XNEO: ".NE",
  XMEX: ".MX",
  XLON: ".L",
  XLON_IL: ".IL",
  XDUB: ".IR",
  XETR: ".DE",
  XFRA: ".F",
  XSTU: ".SG",
  XHAM: ".HM",
  XDUS: ".DU",
  XMUN: ".MU",
  XBER: ".BE",
  XHAN: ".HA",
  XPAR: ".PA",
  XAMS: ".AS",
  XBRU: ".BR",
  XLIS: ".LS",
  XMIL: ".MI",
  XMAD: ".MC",
  XATH: ".AT",
  XSTO: ".ST",
  XHEL: ".HE",
  XCSE: ".CO",
  XOSL: ".OL",
  XICE: ".IC",
  XSWX: ".SW",
  XWBO: ".VI",
  XWAR: ".WA",
  XPRA: ".PR",
  XBUD: ".BD",
  XIST: ".IS",
  XSHG: ".SS",
  XSHE: ".SZ",
  XHKG: ".HK",
  XTKS: ".T",
  XKRX: ".KS",
  XKOS: ".KQ",
  XSES: ".SI",
  XBKK: ".BK",
  XIDX: ".JK",
  XKLS: ".KL",
  XBOM: ".BO",
  XNSE: ".NS",
  XTAI: ".TW",
  XTAI_OTC: ".TWO",
  XASX: ".AX",
  XNZE: ".NZ",
  BVMF: ".SA",
  XBUE: ".BA",
  XSGO: ".SN",
};

export function toYahooSymbol(symbol: string, mic?: string | null): string {
  const suffix = mic ? (MIC_TO_YAHOO_SUFFIX[mic] ?? "") : "";
  return symbol + suffix;
}

import type { HostAPI, YahooDividend } from "@wealthfolio/addon-sdk";

export type { YahooDividend };

export async function fetchYahooDividends(
  symbol: string,
  market: HostAPI["market"],
): Promise<YahooDividend[]> {
  return market.fetchDividends(symbol);
}
