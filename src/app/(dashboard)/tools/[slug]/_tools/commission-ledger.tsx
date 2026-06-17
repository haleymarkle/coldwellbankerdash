"use client";

// Commission Ledger — ported from the original commission tracker, preserving
// its exact split/tier math and layout. Data is loaded server-side and passed
// in as initial props; mutations go through server actions backed by Neon.

import * as React from "react";
import {
  Plus,
  Trash2,
  Users,
  Settings as SettingsIcon,
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Download,
  Pencil,
  X,
  Check,
  AlertCircle,
} from "lucide-react";

import {
  computeYear,
  currentTier,
  num,
  usd,
  type CommissionAgent,
  type CommissionEntry,
  type CommissionSettings,
  type ComputedEntry,
  type Tier,
} from "@/lib/commission/calc";
import {
  createAgentAction,
  createEntryAction,
  deleteAgentAction,
  deleteEntryAction,
  saveSettingsAction,
  updateAgentAction,
} from "./commission-actions";

const INK = "#1A2B4A";
const C = { referral: "#C8A24B", corporate: "#14213D", agent: "#213B79", company: "#5A6573" };

const inputCls =
  "mt-1 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring";

interface LedgerProps {
  initialSettings: CommissionSettings;
  initialAgents: CommissionAgent[];
  initialEntries: CommissionEntry[];
}

export function CommissionLedger({
  initialSettings,
  initialAgents,
  initialEntries,
}: LedgerProps) {
  const [tab, setTab] = React.useState<"dashboard" | "new" | "agents" | "settings">(
    "dashboard"
  );
  const [settings, setSettings] = React.useState(initialSettings);
  const [agents, setAgents] = React.useState(initialAgents);
  const [commissions, setCommissions] = React.useState(initialEntries);
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [error, setError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  function run<T>(
    action: () => Promise<{ ok: boolean; error?: string; data?: T }>,
    onSuccess: (data: T) => void
  ) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      onSuccess(res.data as T);
    });
  }

  const yearComms = React.useMemo(
    () => commissions.filter((c) => (c.date || "").startsWith(String(year))),
    [commissions, year]
  );
  const { results, finalBasis } = React.useMemo(
    () => computeYear(yearComms, settings, agents),
    [yearComms, settings, agents]
  );

  const totals = React.useMemo(() => {
    const t = { gci: 0, referral: 0, corporate: 0, agent: 0, company: 0 };
    results.forEach((r) => {
      t.gci += r.gci;
      t.referral += r.referral;
      t.corporate += r.corporate;
      t.agent += r.agentAmt;
      t.company += r.companyAmt;
    });
    return t;
  }, [results]);

  const years = React.useMemo(() => {
    const set = new Set(commissions.map((c) => (c.date || "").slice(0, 4)).filter(Boolean));
    set.add(String(new Date().getFullYear()));
    return [...set].sort().reverse();
  }, [commissions]);

  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "new", label: "New Commission", icon: Plus },
    { id: "agents", label: "Agents", icon: Users },
    { id: "settings", label: "Settings", icon: SettingsIcon },
  ] as const;

  // ----- mutations ------------------------------------------------------
  const addEntry = (input: Omit<CommissionEntry, "id" | "createdAt">) =>
    run(
      () =>
        createEntryAction({
          agentId: input.agentId,
          date: input.date,
          property: input.property,
          gci: input.gci,
          referralType: input.referralType,
          referralValue: input.referralValue,
        }),
      (entry: CommissionEntry) => {
        setCommissions((cs) => [...cs, entry]);
        setTab("dashboard");
      }
    );

  const deleteEntry = (id: string) =>
    run(
      () => deleteEntryAction(id),
      () => setCommissions((cs) => cs.filter((c) => c.id !== id))
    );

  const addAgent = (name: string) =>
    run(
      () => createAgentAction({ name }),
      (agent: CommissionAgent) => setAgents((a) => [...a, agent])
    );

  const renameAgent = (id: string, name: string) =>
    run(
      () => updateAgentAction(id, { name }),
      (agent: CommissionAgent) =>
        setAgents((ag) => ag.map((x) => (x.id === id ? agent : x)))
    );

  const removeAgent = (id: string) =>
    run(
      () => deleteAgentAction(id),
      () => {
        setAgents((ag) => ag.filter((x) => x.id !== id));
        setCommissions((cs) => cs.filter((c) => c.agentId !== id));
      }
    );

  const saveSettings = (next: CommissionSettings) => {
    setSettings(next); // optimistic
    run(
      () => saveSettingsAction(next),
      (saved: CommissionSettings) => setSettings(saved)
    );
  };

  return (
    <div className="text-foreground">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* header */}
      <header className="flex flex-wrap items-end justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-6 rounded-sm" style={{ background: C.agent }} />
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: INK }}>
              Commission Ledger
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Year-to-date payouts with progressive, tiered agent splits.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-md border border-input px-3 py-2 text-sm font-mono bg-white"
            aria-label="Filter by year"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={() => exportCSV(results, settings, agents)}
            disabled={!results.length}
            className="flex items-center gap-1.5 rounded-md border border-input bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40"
          >
            <Download size={15} /> CSV
          </button>
        </div>
      </header>

      {/* stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <Stat label="Gross commission" value={usd(totals.gci)} sub={`${results.length} deal${results.length === 1 ? "" : "s"}`} />
        <Stat label="Referrals paid out" value={usd(totals.referral)} accent={C.referral} />
        <Stat label="Corporate retained" value={usd(totals.corporate)} accent={C.corporate} />
        <Stat label="Paid to agents" value={usd(totals.agent)} accent={C.agent} />
        <Stat label="Company net" value={usd(totals.company)} accent={C.company} />
      </div>

      {/* tabs */}
      <nav className="flex gap-1 border-b border-border mb-5">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </nav>

      {tab === "dashboard" && (
        <Dashboard results={results} agents={agents} onDelete={deleteEntry} />
      )}
      {tab === "new" && (
        <NewCommission
          agents={agents}
          year={year}
          pending={isPending}
          onAdd={addEntry}
          onNeedAgent={() => setTab("agents")}
        />
      )}
      {tab === "agents" && (
        <AgentsPanel
          agents={agents}
          settings={settings}
          finalBasis={finalBasis}
          results={results}
          onAdd={addAgent}
          onRename={renameAgent}
          onRemove={removeAgent}
        />
      )}
      {tab === "settings" && (
        <SettingsPanel settings={settings} onChange={saveSettings} />
      )}

      <footer className="mt-10 pt-4 border-t border-slate-200 text-[11px] text-muted-foreground/70 leading-relaxed">
        Calculation order per deal: referral off the top → {settings.corporatePct}% corporate on the
        remainder → tiered agent/company split. Figures are estimates for internal tracking; referral
        fees and split arrangements must comply with your state license law and RESPA. Data is saved to
        your brokerage database.
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  UI atoms                                                           */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-lg px-4 py-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="font-mono text-xl tabular-nums mt-1" style={{ color: accent || INK }}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-foreground/80">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground/70 mt-0.5">{hint}</span>}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Waterfall bar                                                      */
/* ------------------------------------------------------------------ */

function Waterfall({ r }: { r: ComputedEntry }) {
  const gci = r.gci || 1;
  const seg = (amt: number, color: string, label: string) =>
    amt > 0 ? (
      <div
        className="h-full flex items-center justify-center overflow-hidden"
        style={{ width: `${(amt / gci) * 100}%`, background: color }}
        title={`${label}: ${usd(amt)}`}
      >
        <span className="text-[10px] font-semibold text-white px-1 truncate">{label}</span>
      </div>
    ) : null;
  return (
    <div className="space-y-3">
      <div className="flex h-7 w-full rounded overflow-hidden border border-border">
        {seg(r.referral, C.referral, "Referral")}
        {seg(r.corporate, C.corporate, "Corporate")}
        {seg(r.agentAmt, C.agent, "Agent")}
        {seg(r.companyAmt, C.company, "Company")}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <Bd c={C.referral} k="Referral paid" v={r.referral} />
        <Bd c={C.corporate} k="Corporate (off top)" v={r.corporate} />
        <Bd c={C.agent} k="Agent" v={r.agentAmt} />
        <Bd c={C.company} k="Company" v={r.companyAmt} />
      </div>
      {r.crossed && (
        <div className="text-xs bg-amber-50 border border-amber-200 rounded-md p-2 text-amber-800">
          This deal crossed a split threshold. Split applied in segments:{" "}
          {r.segments.map((s, i) => (
            <span key={i} className="font-mono">
              {i > 0 ? " · " : ""}
              {usd(s.amount)} @ {s.agentPct}/{s.companyPct}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function Bd({ c, k, v }: { c: string; k: string; v: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
      <span className="text-muted-foreground">{k}</span>
      <span className="font-mono tabular-nums ml-auto" style={{ color: INK }}>
        {usd(v)}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

function Dashboard({
  results,
  agents,
  onDelete,
}: {
  results: ComputedEntry[];
  agents: CommissionAgent[];
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name || "—";
  const rows = [...results].reverse();

  if (!results.length)
    return (
      <Empty
        title="No commissions logged for this year yet"
        body="Head to New Commission to record your first deal. Each one flows through referral, corporate, then the tiered split automatically."
      />
    );

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-slate-50 border-b border-border text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
        <div className="col-span-3">Date / Agent</div>
        <div className="col-span-3">Property</div>
        <div className="col-span-2 text-right">GCI</div>
        <div className="col-span-2 text-right">Agent</div>
        <div className="col-span-2 text-right">Company</div>
      </div>
      {rows.map((r) => {
        const isOpen = open === r.id;
        return (
          <div key={r.id} className="border-b border-border/60 last:border-0">
            <button
              onClick={() => setOpen(isOpen ? null : r.id)}
              className="w-full grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-slate-50 text-left items-center"
            >
              <div className="col-span-3 min-w-0">
                <div className="flex items-center gap-1 font-medium" style={{ color: INK }}>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="font-mono text-xs text-muted-foreground">{r.date}</span>
                </div>
                <div className="text-xs text-foreground/80 truncate pl-5">{nameOf(r.agentId)}</div>
              </div>
              <div className="col-span-3 text-foreground/80 truncate">{r.property || "—"}</div>
              <div className="col-span-2 text-right font-mono tabular-nums">{usd(r.gci)}</div>
              <div className="col-span-2 text-right font-mono tabular-nums" style={{ color: C.agent }}>
                {usd(r.agentAmt)}
              </div>
              <div className="col-span-2 text-right font-mono tabular-nums" style={{ color: C.company }}>
                {usd(r.companyAmt)}
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 bg-slate-50/60">
                <Waterfall r={r} />
                <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                  <span>
                    Company YTD before this deal:{" "}
                    <span className="font-mono">{usd(r.basisBefore)}</span> → after:{" "}
                    <span className="font-mono">{usd(r.basisAfter)}</span>
                  </span>
                  <button
                    onClick={() => onDelete(r.id)}
                    className="flex items-center gap-1 text-rose-600 hover:text-rose-700 font-medium"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  New commission                                                     */
/* ------------------------------------------------------------------ */

function NewCommission({
  agents,
  year,
  pending,
  onAdd,
  onNeedAgent,
}: {
  agents: CommissionAgent[];
  year: number;
  pending: boolean;
  onAdd: (input: Omit<CommissionEntry, "id" | "createdAt">) => void;
  onNeedAgent: () => void;
}) {
  const [form, setForm] = React.useState({
    date: new Date().toISOString().slice(0, 10),
    agentId: agents[0]?.id || "",
    property: "",
    gci: "",
    referralType: "percent" as "percent" | "flat",
    referralValue: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  if (!agents.length)
    return (
      <Empty
        title="Add an agent first"
        body="You need at least one agent before logging commissions."
        action={
          <button
            onClick={onNeedAgent}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            Go to Agents
          </button>
        }
      />
    );

  const valid = num(form.gci) > 0 && form.agentId && form.date;

  return (
    <div className="bg-card border border-border rounded-lg p-5 max-w-2xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Date">
          <input
            type="date"
            className={inputCls}
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label="Agent">
          <select
            className={inputCls}
            value={form.agentId}
            onChange={(e) => set("agentId", e.target.value)}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Property / reference" hint="Optional">
          <input
            className={inputCls}
            placeholder="123 Main St"
            value={form.property}
            onChange={(e) => set("property", e.target.value)}
          />
        </Field>
        <Field label="Gross commission income (GCI)">
          <input
            inputMode="decimal"
            className={inputCls}
            placeholder="0.00"
            value={form.gci}
            onChange={(e) => set("gci", e.target.value)}
          />
        </Field>
        <Field label="Referral type">
          <select
            className={inputCls}
            value={form.referralType}
            onChange={(e) => set("referralType", e.target.value)}
          >
            <option value="percent">Percent of GCI</option>
            <option value="flat">Flat dollar amount</option>
          </select>
        </Field>
        <Field
          label={form.referralType === "percent" ? "Referral %" : "Referral $"}
          hint="Leave blank if none"
        >
          <input
            inputMode="decimal"
            className={inputCls}
            placeholder="0"
            value={form.referralValue}
            onChange={(e) => set("referralValue", e.target.value)}
          />
        </Field>
      </div>

      {!String(form.date).startsWith(String(year)) && form.date && (
        <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
          <AlertCircle size={13} /> This date is outside {year}; it will appear when you select its
          year.
        </p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          disabled={!valid || pending}
          onClick={() =>
            onAdd({
              date: form.date,
              agentId: form.agentId,
              property: form.property,
              gci: num(form.gci),
              referralType: form.referralType,
              referralValue: num(form.referralValue),
            })
          }
          className="rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:bg-primary/90 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Record commission"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agents panel                                                       */
/* ------------------------------------------------------------------ */

function AgentsPanel({
  agents,
  settings,
  finalBasis,
  results,
  onAdd,
  onRename,
  onRemove,
}: {
  agents: CommissionAgent[];
  settings: CommissionSettings;
  finalBasis: Record<string, number>;
  results: ComputedEntry[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [editing, setEditing] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState("");

  const perAgent = (id: string) => {
    const rs = results.filter((r) => r.agentId === id);
    return {
      basis: finalBasis[id] ?? 0,
      paid: rs.reduce((s, r) => s + r.agentAmt, 0),
      gci: rs.reduce((s, r) => s + r.gci, 0),
      count: rs.length,
    };
  };

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-lg p-4 flex gap-2">
        <input
          className={inputCls + " mt-0"}
          placeholder="New agent name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          disabled={!name.trim()}
          onClick={() => {
            onAdd(name.trim());
            setName("");
          }}
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-40 whitespace-nowrap"
        >
          Add agent
        </button>
      </div>

      {agents.map((a) => {
        const m = perAgent(a.id);
        const tiers = a.tiers && a.tiers.length ? a.tiers : settings.tiers;
        const tierIdx = currentTier(m.basis, tiers);
        const tier = tiers[tierIdx];
        const nextThresh = tier.threshold;
        const prevThresh = tierIdx > 0 ? tiers[tierIdx - 1].threshold ?? 0 : 0;
        const span = nextThresh != null ? nextThresh - prevThresh : 1;
        const pct =
          nextThresh != null ? Math.min(100, ((m.basis - prevThresh) / span) * 100) : 100;
        return (
          <div key={a.id} className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              {editing === a.id ? (
                <div className="flex items-center gap-2">
                  <input
                    className={inputCls + " mt-0 w-44"}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <button
                    onClick={() => {
                      if (editName.trim()) onRename(a.id, editName.trim());
                      setEditing(null);
                    }}
                    className="text-primary"
                    aria-label="Save name"
                  >
                    <Check size={16} />
                  </button>
                  <button onClick={() => setEditing(null)} className="text-muted-foreground/70" aria-label="Cancel">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="font-semibold" style={{ color: INK }}>
                    {a.name}
                  </span>
                  <button
                    onClick={() => {
                      setEditing(a.id);
                      setEditName(a.name);
                    }}
                    className="text-muted-foreground/70 hover:text-foreground/80"
                    aria-label="Edit agent"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-3">
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: "#ecfeff", color: C.agent }}
                >
                  Tier {tierIdx + 1}: {tier.agentPct}/{tier.companyPct}
                </span>
                <button
                  onClick={() => onRemove(a.id)}
                  className="text-slate-300 hover:text-rose-600"
                  aria-label="Remove agent"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3 text-sm">
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">GCI</div>
                <div className="font-mono tabular-nums">{usd(m.gci)}</div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Paid to agent</div>
                <div className="font-mono tabular-nums" style={{ color: C.agent }}>
                  {usd(m.paid)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide">Deals</div>
                <div className="font-mono tabular-nums">{m.count}</div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>
                  Company earnings toward{" "}
                  {nextThresh != null ? "next tier" : "top tier reached"}
                </span>
                <span className="font-mono">
                  {usd(m.basis)}
                  {nextThresh != null ? ` / ${usd(nextThresh)}` : ""}
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.company }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Settings                                                           */
/* ------------------------------------------------------------------ */

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: CommissionSettings;
  onChange: (next: CommissionSettings) => void;
}) {
  const upd = (patch: Partial<CommissionSettings>) => onChange({ ...settings, ...patch });
  const setTier = (i: number, patch: Partial<Tier>) => {
    const tiers = settings.tiers.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
    onChange({ ...settings, tiers });
  };
  const addTier = () => {
    const tiers = settings.tiers.map((t) => ({ ...t }));
    const last = tiers[tiers.length - 1];
    last.threshold = last.threshold ?? 20000;
    tiers.push({
      threshold: null,
      agentPct: Math.min(95, last.agentPct + 5),
      companyPct: Math.max(5, last.companyPct - 5),
    });
    onChange({ ...settings, tiers });
  };
  const removeTier = (i: number) => {
    if (settings.tiers.length <= 1) return;
    const tiers = settings.tiers.filter((_, idx) => idx !== i);
    tiers[tiers.length - 1].threshold = null;
    onChange({ ...settings, tiers });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="bg-card border border-border rounded-lg p-5">
        <h3 className="font-semibold mb-3" style={{ color: INK }}>
          Deductions
        </h3>
        <Field label="Corporate fee (% of post-referral amount)">
          <input
            inputMode="decimal"
            className={inputCls + " w-32"}
            value={settings.corporatePct}
            onChange={(e) => upd({ corporatePct: num(e.target.value) })}
          />
        </Field>
      </div>

      <div className="bg-card border border-border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold" style={{ color: INK }}>
            Progressive split tiers
          </h3>
          <button
            onClick={addTier}
            className="flex items-center gap-1 text-sm text-teal-600 font-medium hover:text-teal-700"
          >
            <Plus size={14} /> Add tier
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Each tier sets the agent split until company earnings reach the ceiling, then the next tier
          applies.
        </p>
        <div className="space-y-2">
          {settings.tiers.map((t, i) => {
            const prev = i > 0 ? settings.tiers[i - 1].threshold : 0;
            return (
              <div
                key={i}
                className="flex flex-wrap items-end gap-3 p-3 bg-slate-50 rounded-md border border-slate-100"
              >
                <div className="text-xs text-muted-foreground font-mono pt-2">{usd(prev || 0)} –</div>
                <Field label="Up to (company $)">
                  {t.threshold == null ? (
                    <div className={inputCls + " w-32 bg-slate-100 text-muted-foreground/70 italic"}>
                      and above
                    </div>
                  ) : (
                    <input
                      inputMode="decimal"
                      className={inputCls + " w-32"}
                      value={t.threshold}
                      onChange={(e) => setTier(i, { threshold: num(e.target.value) })}
                    />
                  )}
                </Field>
                <Field label="Agent %">
                  <input
                    inputMode="decimal"
                    className={inputCls + " w-20"}
                    value={t.agentPct}
                    onChange={(e) => {
                      const a = num(e.target.value);
                      setTier(i, { agentPct: a, companyPct: 100 - a });
                    }}
                  />
                </Field>
                <div className="text-sm text-muted-foreground pb-2">/ {t.companyPct}% co.</div>
                {settings.tiers.length > 1 && (
                  <button
                    onClick={() => removeTier(i)}
                    className="text-slate-300 hover:text-rose-600 pb-2 ml-auto"
                    aria-label="Remove tier"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-5 space-y-4">
        <h3 className="font-semibold" style={{ color: INK }}>
          Tier accrual rules
        </h3>

        <Toggle
          label="Count corporate fee toward the tier threshold"
          desc="On: the corporate fee plus the company's split count toward reaching the next tier. Off: only the company's split portion counts."
          on={settings.basisIncludesCorporate}
          onChange={(v) => upd({ basisIncludesCorporate: v })}
        />

        <div>
          <div className="text-sm font-medium mb-1" style={{ color: INK }}>
            When a single deal crosses a threshold
          </div>
          <div className="flex flex-col gap-2">
            <Radio
              name="cross"
              checked={settings.crossingMethod === "transaction"}
              onChange={() => upd({ crossingMethod: "transaction" })}
              label="Whole deal at the tier in effect when it's recorded"
              desc="Simpler. The split rate is locked by the agent's standing before the deal."
            />
            <Radio
              name="cross"
              checked={settings.crossingMethod === "threshold"}
              onChange={() => upd({ crossingMethod: "threshold" })}
              label="Split the deal precisely at the threshold"
              desc="The dollars that take the company past the ceiling pay the old rate; the rest pay the new rate."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium" style={{ color: INK }}>
          {label}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!on)}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
          on ? "bg-teal-600" : "bg-slate-300"
        }`}
        aria-pressed={on}
        aria-label={label}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
            on ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

function Radio({
  name,
  checked,
  onChange,
  label,
  desc,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  desc: string;
}) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 accent-teal-600" />
      <span>
        <span className="text-sm font-medium" style={{ color: INK }}>
          {label}
        </span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared bits                                                        */
/* ------------------------------------------------------------------ */

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-lg p-10 text-center">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function exportCSV(
  results: ComputedEntry[],
  settings: CommissionSettings,
  agents: CommissionAgent[] = []
) {
  const nameOf = (id: string) => agents.find((a) => a.id === id)?.name || id;
  const head = [
    "Date",
    "Agent",
    "Property",
    "GCI",
    "Referral",
    "After referral",
    `Corporate (${settings.corporatePct}%)`,
    "After corporate",
    "Agent split",
    "Company split",
    "Company YTD after",
  ];
  const rows = results.map((r) => [
    r.date,
    `"${nameOf(r.agentId)}"`,
    `"${(r.property || "").replace(/"/g, '""')}"`,
    r.gci.toFixed(2),
    r.referral.toFixed(2),
    r.afterReferral.toFixed(2),
    r.corporate.toFixed(2),
    r.afterCorporate.toFixed(2),
    r.agentAmt.toFixed(2),
    r.companyAmt.toFixed(2),
    r.basisAfter.toFixed(2),
  ]);
  const csv = [head, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "commission-ledger.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}
