"use client";

import PropTypes from "prop-types";
import Card from "@/shared/components/Card";
import Badge from "@/shared/components/Badge";
import { Sparkline } from "./UsageChartsBits";

const fmt = (n) => new Intl.NumberFormat().format(n || 0);
const fmtCost = (n) => `$${(n || 0).toFixed(2)}`;

/**
 * Summary cards.
 *
 * Every card reserves the same vertical space for its label and its footnote
 * slot. Without that, a label that wraps to two lines ("Total Input Tokens" on
 * a narrow screen) pushes its number below the other four, and the cache-hit
 * badge appearing or disappearing changes card height mid-render - the row
 * visibly jumps. Fixed slots keep all five numbers on one baseline whatever
 * the label length or period.
 */
function TrendCard({ label, value, title, tone = "", footnote, trend }) {
  return (
    <Card className="flex min-w-0 flex-col items-center gap-1 px-3 py-3 text-center sm:px-4">
      {/* Two lines' worth of room, so a wrapping label never lowers the number. */}
      <span className="flex min-h-[2lh] items-start justify-center text-text-muted text-xs leading-tight font-semibold uppercase sm:text-sm">
        {label}
      </span>
      <span className={`w-full truncate text-lg font-bold xl:text-xl ${tone}`} title={title}>{value}</span>
      {trend && Array.isArray(trend) && trend.length >= 2 && (
        <div className="w-full h-7 my-0.5">
          <Sparkline values={trend} height={28} stroke={tone ? undefined : "var(--primary)"} />
        </div>
      )}
      {/* Reserved slot: a badge or the cost disclaimer, whichever applies. */}
      <span className="flex min-h-[1.25rem] items-center justify-center">
        {footnote}
      </span>
    </Card>
  );
}

TrendCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  title: PropTypes.string,
  tone: PropTypes.string,
  footnote: PropTypes.node,
  trend: PropTypes.arrayOf(PropTypes.number),
};

TrendCard.defaultProps = { title: "", tone: "", footnote: null, trend: null };

export default function OverviewCards({ stats, trends }) {
  const cacheHitRate = stats.totalPromptTokens > 0
    ? ((stats.totalCachedTokens || 0) / stats.totalPromptTokens) * 100
    : 0;

  const t = trends?.totals || {};

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 sm:gap-4">
      <TrendCard
        label="Total Requests"
        value={fmt(stats.totalRequests)}
        title={fmt(stats.totalRequests)}
        trend={t.requests}
      />
      <TrendCard
        label="Total Input Tokens"
        value={fmt(stats.totalPromptTokens)}
        title={fmt(stats.totalPromptTokens)}
        tone="text-primary"
        trend={t.input}
      />
      <TrendCard
        label="Cached Tokens"
        value={fmt(stats.totalCachedTokens)}
        title={fmt(stats.totalCachedTokens)}
        tone="text-info"
        trend={t.cached}
        footnote={cacheHitRate > 0 ? (
          <Badge variant="info" size="sm" className="mt-0.5">{cacheHitRate.toFixed(1)}% cache hit</Badge>
        ) : null}
      />
      <TrendCard
        label="Output Tokens"
        value={fmt(stats.totalCompletionTokens)}
        title={fmt(stats.totalCompletionTokens)}
        tone="text-success"
        trend={t.output}
      />
      <TrendCard
        label="Est. Cost"
        value={`~${fmtCost(stats.totalCost)}`}
        title={`~${fmtCost(stats.totalCost)}`}
        tone="text-warning"
        trend={t.cost}
        footnote={<span className="text-[10px] text-text-muted">Estimated, not actual billing</span>}
      />
    </div>
  );
}

OverviewCards.propTypes = {
  stats: PropTypes.object.isRequired,
  trends: PropTypes.object,
};