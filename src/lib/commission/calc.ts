// Commission ledger math — ported verbatim from the original commission tracker.
// Pure functions, no DOM/React, so they can run on client or server.

export interface Tier {
  /** Company-earnings ceiling for this tier; null = "and above" (top tier). */
  threshold: number | null;
  agentPct: number;
  companyPct: number;
}

export type CrossingMethod = "transaction" | "threshold";

export interface CommissionSettings {
  corporatePct: number;
  basisIncludesCorporate: boolean;
  crossingMethod: CrossingMethod;
  tiers: Tier[];
}

export interface CommissionAgent {
  id: string;
  name: string;
  /** Optional per-agent tier override; null/empty uses settings.tiers. */
  tiers?: Tier[] | null;
}

export interface CommissionEntry {
  id: string;
  agentId: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  property: string;
  gci: number;
  referralType: "percent" | "flat";
  referralValue: number;
  /** Sort tiebreaker for entries on the same date (ms epoch). */
  createdAt: number;
}

export interface SplitSegment {
  amount: number;
  agentPct: number;
  companyPct: number;
  agentAmt: number;
  companyAmt: number;
}

export interface ComputedEntry extends CommissionEntry {
  referral: number;
  afterReferral: number;
  corporate: number;
  afterCorporate: number;
  agentAmt: number;
  companyAmt: number;
  segments: SplitSegment[];
  basisBefore: number;
  basisAfter: number;
  crossed: boolean;
}

export const DEFAULT_SETTINGS: CommissionSettings = {
  corporatePct: 6,
  basisIncludesCorporate: false,
  crossingMethod: "transaction",
  tiers: [
    { threshold: 10000, agentPct: 70, companyPct: 30 },
    { threshold: null, agentPct: 80, companyPct: 20 },
  ],
};

/** Format a number as USD currency. */
export const usd = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/** Parse loose numeric input, stripping currency/formatting characters. */
export const num = (v: unknown): number => {
  const n = Number.parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const ceil = (t: Tier): number => (t.threshold == null ? Infinity : t.threshold);

// Split a post-corporate amount N between agent and company across tiers.
// method: "transaction" (whole deal at the tier in effect at the start)
//         "threshold"   (split the crossing deal precisely at each boundary)
export function splitAmount(
  N: number,
  basisStart: number,
  tiers: Tier[],
  method: CrossingMethod
): { agent: number; company: number; segments: SplitSegment[] } {
  if (method === "transaction") {
    const tier =
      tiers.find((t) => basisStart < ceil(t)) || tiers[tiers.length - 1];
    const company = N * (tier.companyPct / 100);
    return {
      agent: N - company,
      company,
      segments: [
        {
          amount: N,
          agentPct: tier.agentPct,
          companyPct: tier.companyPct,
          agentAmt: N - company,
          companyAmt: company,
        },
      ],
    };
  }

  // threshold-split method
  let remaining = N;
  let basis = basisStart;
  let agent = 0;
  let company = 0;
  const segments: SplitSegment[] = [];

  for (let i = 0; i < tiers.length && remaining > 1e-6; i++) {
    const t = tiers[i];
    if (basis >= ceil(t)) continue; // already past this tier
    const rate = t.companyPct / 100;
    let capN: number;
    if (ceil(t) === Infinity || rate === 0) {
      capN = remaining;
    } else {
      capN = (ceil(t) - basis) / rate; // dollars of N that fill this tier
    }
    const useN = Math.min(remaining, capN);
    const segCompany = useN * rate;
    const segAgent = useN - segCompany;
    segments.push({
      amount: useN,
      agentPct: t.agentPct,
      companyPct: t.companyPct,
      agentAmt: segAgent,
      companyAmt: segCompany,
    });
    agent += segAgent;
    company += segCompany;
    basis += segCompany;
    remaining -= useN;
  }
  return { agent, company, segments };
}

// Recompute every derived figure for a set of entries, in chronological order,
// tracking each agent's running company-earnings basis.
export function computeYear(
  commissions: CommissionEntry[],
  settings: CommissionSettings,
  agents: CommissionAgent[] = []
): { results: ComputedEntry[]; finalBasis: Record<string, number> } {
  const tiersFor = (agentId: string): Tier[] => {
    const a = agents.find((x) => x.id === agentId);
    return a && a.tiers && a.tiers.length ? a.tiers : settings.tiers;
  };
  const sorted = [...commissions].sort((a, b) => {
    const d = (a.date || "").localeCompare(b.date || "");
    return d !== 0 ? d : (a.createdAt || 0) - (b.createdAt || 0);
  });
  const basis: Record<string, number> = {};
  const results = sorted.map((c) => {
    const gci = num(c.gci);
    const referral =
      c.referralType === "percent"
        ? gci * (num(c.referralValue) / 100)
        : num(c.referralValue);
    const afterReferral = Math.max(0, gci - referral);
    const corporate = afterReferral * (settings.corporatePct / 100);
    const afterCorporate = afterReferral - corporate;

    const basisBefore = basis[c.agentId] ?? 0;
    let basisForSplit = basisBefore;
    let corpToBasis = 0;
    if (settings.basisIncludesCorporate) {
      basisForSplit = basisBefore + corporate;
      corpToBasis = corporate;
    }

    const { agent, company, segments } = splitAmount(
      afterCorporate,
      basisForSplit,
      tiersFor(c.agentId),
      settings.crossingMethod
    );

    const basisAfter = basisBefore + corpToBasis + company;
    basis[c.agentId] = basisAfter;

    return {
      ...c,
      gci,
      referral,
      afterReferral,
      corporate,
      afterCorporate,
      agentAmt: agent,
      companyAmt: company,
      segments,
      basisBefore,
      basisAfter,
      crossed: segments.length > 1,
    } satisfies ComputedEntry;
  });
  return { results, finalBasis: basis };
}

/** Index of the tier currently in effect for a given company-earnings basis. */
export function currentTier(basis: number, tiers: Tier[]): number {
  const idx = tiers.findIndex((t) => basis < ceil(t));
  return idx === -1 ? tiers.length - 1 : idx;
}
