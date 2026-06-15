"use client";

import * as React from "react";
import { Calculator, Percent, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const DEFAULTS = {
  salePrice: "350000",
  commissionRate: "3",
  agentSplit: "70",
  transactionFee: "0",
};

/** Parse a numeric field, treating blanks/invalid input as 0. */
function num(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

export function CommissionCalculator() {
  const [salePrice, setSalePrice] = React.useState(DEFAULTS.salePrice);
  const [commissionRate, setCommissionRate] = React.useState(
    DEFAULTS.commissionRate,
  );
  const [agentSplit, setAgentSplit] = React.useState(DEFAULTS.agentSplit);
  const [transactionFee, setTransactionFee] = React.useState(
    DEFAULTS.transactionFee,
  );

  const price = Math.max(0, num(salePrice));
  const rate = Math.max(0, num(commissionRate));
  // Clamp split to a sensible 0–100 range for the share math.
  const split = Math.min(100, Math.max(0, num(agentSplit)));
  const fee = Math.max(0, num(transactionFee));

  const grossCommission = price * (rate / 100);
  const agentBeforeFee = grossCommission * (split / 100);
  const agentShare = Math.max(0, agentBeforeFee - fee);
  const brokerageShare = grossCommission - agentShare;

  function reset() {
    setSalePrice(DEFAULTS.salePrice);
    setCommissionRate(DEFAULTS.commissionRate);
    setAgentSplit(DEFAULTS.agentSplit);
    setTransactionFee(DEFAULTS.transactionFee);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Inputs */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary"
            >
              <Calculator className="size-5" />
            </span>
            <div className="space-y-0.5">
              <CardTitle className="font-heading text-base">
                Deal inputs
              </CardTitle>
              <CardDescription>
                Estimate a commission for a single transaction.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(e) => e.preventDefault()}
            noValidate
          >
            <Field
              id="sale-price"
              label="Sale Price"
              prefix="$"
              value={salePrice}
              onChange={setSalePrice}
              min={0}
              step={1000}
              placeholder="350000"
            />
            <Field
              id="commission-rate"
              label="Commission Rate"
              suffix="%"
              value={commissionRate}
              onChange={setCommissionRate}
              min={0}
              max={100}
              step={0.1}
              placeholder="3"
            />
            <Field
              id="agent-split"
              label="Brokerage Split (to agent)"
              suffix="%"
              value={agentSplit}
              onChange={setAgentSplit}
              min={0}
              max={100}
              step={1}
              placeholder="70"
              hint="Share of gross commission paid to the agent."
            />
            <Field
              id="transaction-fee"
              label="Transaction Fee"
              prefix="$"
              value={transactionFee}
              onChange={setTransactionFee}
              min={0}
              step={50}
              placeholder="0"
              hint="Optional flat fee deducted from the agent's share."
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className="text-muted-foreground"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset to defaults
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4 lg:col-span-3">
        <ResultCard
          label="Gross commission"
          value={USD.format(grossCommission)}
          hint={`${rate || 0}% of ${USD.format(price)}`}
          emphasis
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <ResultCard
            label="Agent net"
            value={USD.format(agentShare)}
            hint={
              fee > 0
                ? `${split || 0}% split less ${USD.format(fee)} fee`
                : `${split || 0}% of gross`
            }
          />
          <ResultCard
            label="Brokerage share"
            value={USD.format(brokerageShare)}
            hint="Gross commission less agent net"
          />
        </div>

        <p className="px-1 text-xs text-muted-foreground">
          Estimates only. Actual commission, splits, and fees are governed by
          your brokerage agreement and the executed purchase contract.
        </p>
      </div>
    </div>
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  hint?: string;
}

function Field({
  id,
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
  placeholder,
  hint,
}: FieldProps) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
          >
            {prefix}
          </span>
        ) : null}
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={value}
          placeholder={placeholder}
          aria-describedby={hintId}
          onChange={(e) => onChange(e.target.value)}
          className={`${prefix ? "pl-7" : ""} ${suffix ? "pr-9" : ""}`.trim()}
        />
        {suffix ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
          >
            {suffix === "%" ? <Percent className="size-3.5" /> : suffix}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function ResultCard({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <Card
      className={
        emphasis
          ? "bg-primary text-primary-foreground ring-primary/20"
          : "transition-shadow hover:shadow-md"
      }
    >
      <CardContent className="space-y-1.5">
        <p
          className={
            emphasis
              ? "eyebrow text-primary-foreground/70"
              : "eyebrow"
          }
        >
          {label}
        </p>
        <p
          className={`font-heading font-semibold leading-none tracking-tight ${
            emphasis ? "text-4xl" : "text-3xl text-foreground"
          }`}
        >
          {value}
        </p>
        {hint ? (
          <p
            className={`text-xs ${
              emphasis ? "text-primary-foreground/70" : "text-muted-foreground"
            }`}
          >
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
