"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import type { KidsChallengeAnalytics } from "@/lib/kids-challenge/admin-service";
import { ANALYTICS_RANGES } from "@/lib/kids-challenge/admin-validation";
import { formatInr, methodLabel } from "@/lib/kids-challenge/analytics";
import { BreakdownBars, DailyBarChart, type DailyDatum } from "./Charts";
import { ErrorRow, fmtDateTime, fmtDay, getAdminJson, LoadingRow, Panel, secondaryButton } from "./ui";

type Metric = "revenue" | "registrations" | "paid";
const METRICS: { value: Metric; label: string }[] = [
  { value: "revenue", label: "Revenue" },
  { value: "registrations", label: "Registrations" },
  { value: "paid", label: "Payments" },
];

const n = (v: number) => v.toLocaleString("en-IN");

function Kpi({ label, value, hint, icon }: { label: string; value: string; hint: string; icon: "wallet" | "users" | "check" | "chart" | "alert" | "calendar" }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold tracking-[1.2px] text-muted uppercase">{label}</p>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-royal/10 text-royal">
          <Icon name={icon} size={18} />
        </span>
      </div>
      <p className="mt-2 font-display text-[28px] leading-none font-bold text-navy tabular-nums">{value}</p>
      <p className="mt-2 text-[12px] text-muted">{hint}</p>
    </div>
  );
}

/** One email type's delivery numbers. Alert values carry the word, never colour alone. */
function EmailStatsCard({
  title,
  note,
  stats,
  rate,
  hasAttempts,
  link,
}: {
  title: string;
  note: string;
  stats: { label: string; value: string; alert?: boolean }[];
  rate: number;
  hasAttempts: boolean;
  link: { href: string; label: string } | null;
}) {
  return (
    <div className="bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold text-navy">{title}</p>
          <p className="mt-0.5 text-[12px] text-muted">{note}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-[22px] leading-none font-bold text-navy tabular-nums">{hasAttempts ? `${rate}%` : "—"}</p>
          <p className="mt-1 text-[11px] font-bold tracking-[1px] text-muted uppercase">Delivery rate</p>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-lg px-3 py-2 ${s.alert ? "bg-[#fdece4]" : "bg-[#f7f9fd]"}`}>
            <dt className={`text-[11px] font-bold tracking-[0.8px] uppercase ${s.alert ? "text-[#a33d0c]" : "text-muted"}`}>{s.label}</dt>
            <dd className="mt-0.5 font-display text-[18px] font-bold text-navy tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {link && (
        <a href={link.href} className="mt-3 inline-block text-[13px] font-semibold text-royal hover:underline">
          {link.label}
        </a>
      )}
    </div>
  );
}

/** Totals, trend and breakdowns for the Kids Creative Challenge. */
export function KidsChallengeOverview() {
  const [days, setDays] = useState<number>(30);
  const [metric, setMetric] = useState<Metric>("revenue");
  const [data, setData] = useState<KidsChallengeAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestKey = `${days}:${reloadToken}`;
  /** The request the screen currently shows; differs from requestKey while a reload is in flight. */
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = loadedKey !== requestKey;
  const reload = () => setReloadToken((t) => t + 1);

  useEffect(() => {
    // Only the latest request may update the screen: a slower, older response is dropped.
    let cancelled = false;
    getAdminJson<{ analytics: KidsChallengeAnalytics }>(`/api/admin/kids-challenge/analytics?days=${days}`, "Could not load analytics.").then(
      (json) => {
        if (cancelled) return;
        setData(json.analytics);
        setError(null);
        setLoadedKey(requestKey);
      },
      (err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not load analytics.");
        setLoadedKey(requestKey);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [days, requestKey]);

  if (!data) return error ? <ErrorRow message={error} onRetry={reload} /> : <LoadingRow label="Loading analytics…" />;

  const t = data.totals;
  const p = data.payments;
  const chart: DailyDatum[] = data.daily.map((d) => ({
    key: d.date,
    label: fmtDay(d.date),
    value: metric === "revenue" ? d.revenuePaise : metric === "registrations" ? d.registrations : d.paid,
    display: metric === "revenue" ? formatInr(d.revenuePaise) : metric === "registrations" ? `${n(d.registrations)} registered` : `${n(d.paid)} paid`,
    detail: metric === "revenue" ? `${n(d.paid)} payment${d.paid === 1 ? "" : "s"}` : undefined,
  }));
  const metricLabel = METRICS.find((m) => m.value === metric)?.label ?? "";

  return (
    <div className={`grid gap-5 transition-opacity ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
      {/* Controls: one row above the charts. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Date range" className="inline-flex overflow-hidden rounded-lg border border-[#8d9bc4] bg-white">
          {ANALYTICS_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={days === r}
              onClick={() => setDays(r)}
              className={`h-9 cursor-pointer px-3.5 text-[13px] font-semibold transition-colors ${days === r ? "bg-royal text-white" : "text-[#2b3a63] hover:bg-[#f5f8ff]"}`}
            >
              Last {r} days
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[12px] text-muted">Updated {fmtDateTime(data.generatedAt)}</p>
          <button type="button" onClick={reload} disabled={loading} className={`${secondaryButton} h-9`}>
            <Icon name="refresh" size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-[13px] font-medium text-[#a33d0c]">
          {error}
        </p>
      )}

      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total revenue" value={formatInr(t.grossRevenuePaise)} hint={`${formatInr(t.rangeRevenuePaise)} in the last ${data.rangeDays} days`} icon="wallet" />
        <Kpi
          label="Net after Razorpay fees"
          value={formatInr(t.netRevenuePaise)}
          hint={
            t.feesUnavailableCount > 0
              ? `${formatInr(t.feesPaise)} known fees · fee not yet reported for ${n(t.feesUnavailableCount)} payment${t.feesUnavailableCount === 1 ? "" : "s"}`
              : `${formatInr(t.feesPaise)} in fees incl. GST`
          }
          icon="chart"
        />
        <Kpi label="Registrations" value={n(t.registrations)} hint={`${n(t.rangeRegistrations)} in the last ${data.rangeDays} days · ${n(t.todayRegistrations)} today`} icon="users" />
        <Kpi label="Paid" value={n(t.paid)} hint={`${t.conversionRate}% of registrations · ${n(t.pending)} pending`} icon="check" />
        <Kpi label="Today" value={formatInr(t.todayRevenuePaise)} hint={`${n(t.todayPaid)} payment${t.todayPaid === 1 ? "" : "s"} today (India time)`} icon="calendar" />
        <Kpi label="Payment success rate" value={`${p.successRate}%`} hint={`${n(p.paidOrders)} paid of ${n(p.paidOrders + p.failedOrders)} attempted checkouts`} icon="chart" />
        <Kpi label="Failed attempts" value={n(p.failedAttempts)} hint={`${n(p.failedOrders)} checkout${p.failedOrders === 1 ? "" : "s"} ended failed`} icon="alert" />
        <Kpi label="No payment recorded" value={n(p.abandonedOrders)} hint="Orders created where no payment attempt has reached us" icon="alert" />
      </div>

      {/* Email delivery */}
      <Panel title="Email delivery" subtitle="Sent = accepted by the mail server. Bounces aren't tracked with the current SMTP setup.">
        <div className="grid gap-px bg-line md:grid-cols-2">
          <EmailStatsCard
            title="Payment confirmation emails"
            note={`Sent automatically after payment · ${n(data.emails.confirmation.paid)} paid registration${data.emails.confirmation.paid === 1 ? "" : "s"}`}
            stats={[
              { label: "Sent", value: n(data.emails.confirmation.sent) },
              { label: "Failed", value: n(data.emails.confirmation.failed), alert: data.emails.confirmation.failed > 0 },
              { label: "Not sent", value: n(data.emails.confirmation.notSent), alert: data.emails.confirmation.notSent > 0 },
              { label: "Sending", value: n(data.emails.confirmation.sending) },
            ]}
            rate={data.emails.confirmation.deliveryRate}
            hasAttempts={data.emails.confirmation.sent + data.emails.confirmation.failed + data.emails.confirmation.notSent > 0}
            link={
              data.emails.confirmation.failed + data.emails.confirmation.notSent > 0
                ? { href: "#kids-challenge/registrations", label: "Review and resend on Registrations →" }
                : null
            }
          />
          <EmailStatsCard
            title="Custom emails to parents"
            note={
              data.emails.custom.messages === 0
                ? "No messages sent yet"
                : `${n(data.emails.custom.messages)} message${data.emails.custom.messages === 1 ? "" : "s"} · ${n(data.emails.custom.messagesInRange)} in the last ${data.rangeDays} days · last ${fmtDateTime(data.emails.custom.lastSentAt)}`
            }
            stats={[
              { label: "Delivered", value: n(data.emails.custom.sent) },
              { label: "Not delivered", value: n(data.emails.custom.failed), alert: data.emails.custom.failed > 0 },
              { label: "Sending", value: n(data.emails.custom.sending) },
              { label: "Recipients", value: n(data.emails.custom.recipients) },
            ]}
            rate={data.emails.custom.deliveryRate}
            hasAttempts={data.emails.custom.sent + data.emails.custom.failed > 0}
            link={{ href: "#kids-challenge/emails", label: data.emails.custom.failed > 0 ? "Retry failed on the Emails tab →" : "Open the Emails tab →" }}
          />
        </div>
      </Panel>

      {/* Trend */}
      <Panel
        title={`${metricLabel} per day`}
        subtitle={`Last ${data.rangeDays} days, India time${metric === "revenue" ? ", by payment date" : metric === "paid" ? ", by payment date" : ", by registration date"}`}
        action={
          <div role="group" aria-label="Chart metric" className="inline-flex overflow-hidden rounded-lg border border-[#8d9bc4] bg-white">
            {METRICS.map((m) => (
              <button
                key={m.value}
                type="button"
                aria-pressed={metric === m.value}
                onClick={() => setMetric(m.value)}
                className={`h-8 cursor-pointer px-3 text-[13px] font-semibold transition-colors ${metric === m.value ? "bg-royal text-white" : "text-[#2b3a63] hover:bg-[#f5f8ff]"}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        }
      >
        <div className="px-6 pt-10 pb-5">
          <DailyBarChart
            data={chart}
            label={`${metricLabel} per day, last ${data.rangeDays} days`}
            formatAxis={(v) => (metric === "revenue" ? formatInr(Math.round(v)) : n(Math.round(v)))}
          />
        </div>
      </Panel>

      {/* Breakdowns */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Registrations by class" subtitle="All time · paid count alongside">
          <BreakdownBars
            label="Registrations by class"
            empty="No registrations yet."
            data={data.byClass.map((c) => ({ key: String(c.studentClass), label: `Class ${c.studentClass}`, value: c.total, display: n(c.total), note: `${n(c.paid)} paid` }))}
          />
        </Panel>
        <Panel title="Top states" subtitle="All time · top 10 by registrations">
          <BreakdownBars
            label="Registrations by state"
            empty="No registrations yet."
            data={data.byState.map((s) => ({ key: s.state, label: s.state, value: s.total, display: n(s.total), note: `${n(s.paid)} paid` }))}
          />
        </Panel>
        <Panel title="Payment methods" subtitle="All time · successful payments">
          <BreakdownBars
            label="Successful payments by method"
            empty="No successful payments yet."
            data={data.byMethod.map((m) => ({ key: m.method ?? "unknown", label: methodLabel(m.method), value: m.count, display: n(m.count), note: formatInr(m.amountPaise) }))}
          />
        </Panel>
      </div>
    </div>
  );
}
