"use client";

import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
import Card from "./Card";
import Select from "./Select";
import Badge from "./Badge";

const NONE_PROXY_POOL_VALUE = "__none__";
const STRATEGIES = [
  { value: "none", label: "None (single pool)" },
  { value: "round-robin", label: "Round-robin" },
  { value: "random", label: "Random" },
];

export default function NoAuthProxyCard({ providerId }) {
  const [proxyPools, setProxyPools] = useState([]);
  const [proxyPoolId, setProxyPoolId] = useState(NONE_PROXY_POOL_VALUE);
  const [rotateStrategy, setRotateStrategy] = useState("none");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [opencodeInstalled, setOpencodeInstalled] = useState(true);
  const [copiedCmd, setCopiedCmd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/proxy-pools?isActive=true", { cache: "no-store" }).then((r) => r.ok ? r.json() : { proxyPools: [] }),
      fetch("/api/settings", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}),
      fetch("/api/providers", { cache: "no-store" }).then((r) => r.ok ? r.json() : {}),
    ]).then(([poolData, settingsData, providersData]) => {
      if (cancelled) return;
      setProxyPools(poolData.proxyPools || []);
      const override = (settingsData.providerStrategies || {})[providerId] || {};
      setProxyPoolId(override.proxyPoolId || NONE_PROXY_POOL_VALUE);
      setRotateStrategy(override.rotateStrategy || "none");
      if (providersData?.opencodeInstalled !== undefined) {
        setOpencodeInstalled(Boolean(providersData.opencodeInstalled));
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [providerId]);

  const save = useCallback(async (poolId, strategy) => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      const data = res.ok ? await res.json() : {};
      const current = data.providerStrategies || {};
      const override = { ...(current[providerId] || {}) };
      if (poolId === NONE_PROXY_POOL_VALUE) delete override.proxyPoolId;
      else override.proxyPoolId = poolId;
      if (strategy === "none") delete override.rotateStrategy;
      else override.rotateStrategy = strategy;
      const updated = { ...current };
      if (Object.keys(override).length === 0) delete updated[providerId];
      else updated[providerId] = override;
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerStrategies: updated }),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } catch (e) {
      console.log("Save proxy config error:", e);
    } finally {
      setSaving(false);
    }
  }, [providerId]);

  const handlePoolChange = (newPoolId) => {
    setProxyPoolId(newPoolId);
    save(newPoolId, rotateStrategy);
  };

  const handleStrategyChange = (newStrategy) => {
    setRotateStrategy(newStrategy);
    save(proxyPoolId, newStrategy);
  };

  const canRotate = proxyPools.length >= 2;
  const isRotation = rotateStrategy !== "none";

  if (providerId === "opencode-v2") {
    if (!opencodeInstalled) {
      return (
        <div className="relative overflow-hidden rounded-[var(--r-card)] border border-amber-500/40 bg-surface shadow-[var(--elev-1)] p-5 transition-all">
          <div className="flex items-start gap-3.5 mb-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/25">
              <span className="material-symbols-outlined text-[24px]">construction</span>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                  Binary Engine Status
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-500 border border-amber-500/30">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Need Configuration
                </span>
              </div>
              <h3 className="text-base font-bold text-text-main mt-0.5">
                OpenCode CLI Binary Not Installed
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                The official OpenCode CLI binary was not found on this server. To bypass upstream 403 FreeTierError gates, you must install the OpenCode binary manually in the environment running alongside 9Router seren:
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2 p-3.5 rounded-[var(--r-control)] bg-surface-2 border border-border-subtle text-xs font-mono">
            <div className="flex items-center justify-between text-[11px] text-text-muted font-sans font-medium">
              <span>Installation Command (Host Terminal):</span>
              {copiedCmd && <span className="text-emerald-400 font-sans">Copied!</span>}
            </div>
            <div className="flex items-center justify-between gap-2 p-2 rounded bg-black/80 text-emerald-400 border border-white/10 select-all">
              <span>npm install -g opencode-ai</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText("npm install -g opencode-ai");
                  setCopiedCmd(true);
                  setTimeout(() => setCopiedCmd(false), 2000);
                }}
                className="text-text-muted hover:text-white p-1"
                title="Copy command"
              >
                <span className="material-symbols-outlined text-[15px]">content_copy</span>
              </button>
            </div>
            <div className="text-[11px] text-text-muted font-sans mt-0.5">
              Or via official script: <code className="bg-black/40 px-1 py-0.5 rounded text-zinc-300 font-mono">curl -fsSL https://opencode.ai/install.sh | bash</code>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="relative overflow-hidden rounded-[var(--r-card)] border border-primary/30 bg-surface shadow-[var(--elev-1)] transition-all">
        {/* Animated moving gradient shine beam */}
        <div
          aria-hidden="true"
          className="proxy-shimmer-beam pointer-events-none absolute -inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-primary/15 to-transparent blur-sm"
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5">
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Glowing animated proxy route icon (lan) */}
            <div className="relative flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/25 shadow-[0_0_16px_rgba(229,106,74,0.2)]">
              <span className="material-symbols-outlined text-[22px]">lan</span>
              <span className="absolute -top-1 -right-1 flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-text-muted">
                  Dedicated Routing
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  ACTIVE
                </span>
              </div>

              {/* Main title: proxy by: t.me/abcseren */}
              <a
                href="https://t.me/abcseren"
                target="_blank"
                rel="noopener noreferrer"
                className="group mt-0.5 inline-flex items-center gap-1.5 text-base sm:text-lg font-bold text-text-main transition-colors hover:text-primary"
              >
                <span>proxy by:</span>
                <span className="proxy-text-gradient bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent font-mono">
                  t.me/abcseren
                </span>
                <span className="material-symbols-outlined text-[18px] text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                  open_in_new
                </span>
              </a>

              <p className="text-xs text-text-muted mt-0.5">
                Residential broadband proxy locked automatically for OpenCode Free V2.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/10 text-green-500">
          <span className="material-symbols-outlined text-[20px]">lock_open</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">No authentication required</p>
          <p className="text-xs text-text-muted">Ready to use as-is, or route it through a proxy pool to bypass IP-based limits.</p>
        </div>
        {savedFlash && <Badge variant="success" size="sm">Saved</Badge>}
      </div>

      <Select
        label="Proxy Pool"
        value={proxyPoolId}
        onChange={(e) => handlePoolChange(e.target.value)}
        disabled={saving || isRotation}
        options={[
          { value: NONE_PROXY_POOL_VALUE, label: "None (direct)" },
          ...proxyPools.map((pool) => ({ value: pool.id, label: pool.name })),
        ]}
        hint={isRotation ? "Rotation is on, so it uses every active pool. The pool selector is ignored." : undefined}
      />

      <div className="flex flex-col gap-2 mt-4">
        <label className="text-sm font-medium text-text-main">Rotation Strategy</label>
        <select
          value={rotateStrategy}
          onChange={(e) => handleStrategyChange(e.target.value)}
          disabled={saving}
          className="py-2 px-3 text-sm text-text-main bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-md focus:ring-1 focus:ring-primary/30 focus:border-primary/50 focus:outline-none transition-all disabled:opacity-50"
        >
          {STRATEGIES.map((s) => (
            <option key={s.value} value={s.value} disabled={s.value !== "none" && !canRotate}>
              {s.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-muted">
          {!canRotate
            ? `Need at least 2 active proxy pools for rotation.`
            : isRotation
              ? rotateStrategy === "round-robin"
                ? `Rotating through all ${proxyPools.length} active pools in order. State is in-memory (resets on restart).`
                : `Picking a random pool from ${proxyPools.length} active pools each request.`
              : `Uses the selected pool above. Set to Round-robin or Random to rotate across all active pools.`}
        </p>
      </div>
    </Card>
  );
}

NoAuthProxyCard.propTypes = {
  providerId: PropTypes.string.isRequired,
};
