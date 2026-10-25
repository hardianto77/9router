"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  Button,
  Badge,
  Toggle,
  ModelSelectModal,
  CapacityBadges,
} from "@/shared/components";
import { useModelCaps } from "@/shared/hooks/useModelCaps";
import { useNotificationStore } from "@/store/notificationStore";
import PluginMark from "@/shared/components/PluginMark";
import { CUSTOM_PLUGIN_KEYS } from "@/shared/constants/pluginKeys";

const PLUGINS = [
  {
    key: "adaptiveThinking",
    title: "Adaptive Thinking & Cognitive Architecture",
    description:
      "A synthesized cognitive stack uniting Depth Protocol v2.0, Adversaria Dialectic Crucible, First Principles Decomposition, and Superpowers. Blocks premature closure, demands root problem reframing, explores 3 distinct hypothesis branches, mounts adversarial stress-tests, and verifies failure envelopes before answering.",
  },
];

function defaultPluginsFrom(stored) {
  const out = {};
  for (const key of CUSTOM_PLUGIN_KEYS) {
    const entry = stored?.[key];
    out[key] = {
      enabled: Boolean(entry?.enabled),
      models: Array.isArray(entry?.models) ? entry.models.filter(Boolean) : [],
    };
  }
  return out;
}

const DEFAULT_PLUGINS_STATE = defaultPluginsFrom(null);

function formatModelName(modelVal) {
  if (!modelVal) return "";
  return modelVal.includes("/")
    ? modelVal.split("/").slice(1).join("/")
    : modelVal;
}

export default function PluginsPage() {
  const [customPlugins, setCustomPlugins] = useState(DEFAULT_PLUGINS_STATE);
  const [activeProviders, setActiveProviders] = useState([]);
  const [pickerPlugin, setPickerPlugin] = useState(null);
  const [kernelEnabled, setKernelEnabled] = useState(true);
  const [kernelPrompt, setKernelPrompt] = useState("");
  const [kernelCustomOpen, setKernelCustomOpen] = useState(false);
  const [kernelSaving, setKernelSaving] = useState(false);
  const { getCaps } = useModelCaps();
  const addNotification = useNotificationStore((state) => state.addNotification);

  useEffect(() => {
    async function loadData() {
      try {
        const [pluginsRes, providersRes, settingsRes] = await Promise.all([
          fetch("/api/plugins", { cache: "no-store" }),
          fetch("/api/providers", { cache: "no-store" }),
          fetch("/api/settings", { cache: "no-store" }),
        ]);

        if (pluginsRes.ok) {
          const data = await pluginsRes.json();
          if (data.customPlugins) {
            setCustomPlugins(defaultPluginsFrom(data.customPlugins));
          }
        }

        if (providersRes.ok) {
          const provData = await providersRes.json();
          setActiveProviders(provData.connections || []);
        }

        if (settingsRes.ok) {
          const sData = await settingsRes.json();
          setKernelEnabled(Boolean(sData.kernelEnabled));
          setKernelPrompt(sData.kernelPrompt || "");
        }
      } catch (err) {
        console.error("Failed to load plugin data:", err);
      }
    }

    loadData();
  }, []);

  const handleKernelToggle = async (val) => {
    setKernelEnabled(val);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kernelEnabled: val }),
      });
      if (res.ok) {
        addNotification({
          type: "success",
          title: val ? "Bypass Engine Diaktifkan" : "Bypass Engine Dinonaktifkan",
          message: val ? "Adaptive Model Bypass Engine aktif." : "Model Bypass Engine dinonaktifkan.",
        });
      }
    } catch (e) {
      console.error("Failed to update kernel setting:", e);
    }
  };

  const handleKernelSavePrompt = async () => {
    setKernelSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kernelPrompt }),
      });
      addNotification({
        type: "success",
        title: "Kernel Prompt Saved",
        message: "Armor-piercing uncensoring prompt successfully updated.",
      });
    } catch (e) {
      console.error("Failed to save kernel prompt:", e);
    } finally {
      setKernelSaving(false);
    }
  };

  const savePlugins = useCallback(
    async (updatedPlugins) => {
      try {
        const res = await fetch("/api/plugins", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customPlugins: updatedPlugins }),
        });
        if (res.ok) {
          window.dispatchEvent(new Event("customModelChanged"));
        }
      } catch (err) {
        console.error("Failed to save plugins:", err);
      }
    },
    []
  );

  const handleToggle = useCallback(
    (pluginKey, enabled) => {
      setCustomPlugins((prev) => {
        const entry = prev[pluginKey] || { enabled: false, models: [] };
        const updated = {
          ...prev,
          [pluginKey]: {
            ...entry,
            enabled,
          },
        };
        savePlugins(updated);
        return updated;
      });
    },
    [savePlugins]
  );

  const handleAddModel = useCallback(
    (pluginKey, model) => {
      const modelVal =
        typeof model === "string"
          ? model
          : model?.value || model?.name || model?.id || "";
      if (!modelVal || !pluginKey) return;

      setCustomPlugins((prev) => {
        const entry = prev[pluginKey] || { enabled: true, models: [] };
        const currentModels = entry.models || [];
        if (currentModels.includes(modelVal)) return prev;

        const updated = {
          ...prev,
          [pluginKey]: {
            ...entry,
            enabled: entry.enabled !== undefined ? entry.enabled : true,
            models: [...currentModels, modelVal],
          },
        };
        savePlugins(updated);
        return updated;
      });
    },
    [savePlugins]
  );

  const handleRemoveModel = useCallback(
    (pluginKey, model) => {
      const modelVal =
        typeof model === "string"
          ? model
          : model?.value || model?.name || model?.id || "";
      if (!modelVal || !pluginKey) return;

      setCustomPlugins((prev) => {
        const entry = prev[pluginKey] || { enabled: false, models: [] };
        const currentModels = entry.models || [];
        if (!currentModels.includes(modelVal)) return prev;

        const updated = {
          ...prev,
          [pluginKey]: {
            ...entry,
            models: currentModels.filter((m) => m !== modelVal),
          },
        };
        savePlugins(updated);
        return updated;
      });
    },
    [savePlugins]
  );

  const activePickerConfig = PLUGINS.find((p) => p.key === pickerPlugin);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-main">Custom Plugins</h1>
        <p className="text-sm text-text-muted mt-1">
          Extend model capabilities with plugins
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 max-w-2xl">
        {PLUGINS.map((plugin) => {
          const config = customPlugins[plugin.key] || {
            enabled: false,
            models: [],
          };
          const isEnabled = config.enabled;
          const selectedModels = config.models || [];

          return (
            <Card key={plugin.key} className="flex flex-col h-full">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-[6px] flex items-center justify-center border shrink-0 ${plugin.iconBg}`}
                  >
                    <span
                      className={`material-symbols-outlined text-[22px] leading-none ${plugin.iconColor}`}
                    >
                      {plugin.icon}
                    </span>
                  </div>
                  <h3 className="font-semibold text-base text-text-main">
                    {plugin.title}
                  </h3>
                </div>
                <Toggle
                  checked={isEnabled}
                  onChange={(val) => handleToggle(plugin.key, val)}
                />
              </div>

              <p className="text-sm text-text-muted leading-relaxed mb-5">
                {plugin.description}
              </p>

              {isEnabled && (
                <div className="mt-auto pt-4 border-t border-border-subtle">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Selected Models
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      icon="add"
                      onClick={() => setPickerPlugin(plugin.key)}
                    >
                      Add Models
                    </Button>
                  </div>

                  {selectedModels.length === 0 ? (
                    <div className="p-4 rounded-[6px] border border-dashed border-border-subtle bg-surface-2/30 text-center">
                      <p className="text-xs text-text-muted">
                        Select models to apply this plugin
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedModels.map((modelVal) => (
                        <Badge
                          key={modelVal}
                          variant="default"
                          size="md"
                          className="font-medium bg-surface-2 text-text-main border border-border-subtle"
                        >
                          <span className="truncate max-w-[180px]">
                            {formatModelName(modelVal)}
                          </span>
                          <CapacityBadges caps={getCaps(modelVal)} />
                          <button
                            type="button"
                            onClick={() => handleRemoveModel(plugin.key, modelVal)}
                            className="text-text-muted hover:text-danger transition-colors cursor-pointer leading-none ml-0.5"
                            title="Remove model"
                          >
                            <span className="material-symbols-outlined text-[14px]">
                              close
                            </span>
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {pickerPlugin && (
        <ModelSelectModal
          isOpen={Boolean(pickerPlugin)}
          onClose={() => setPickerPlugin(null)}
          onSelect={(m) => handleAddModel(pickerPlugin, m)}
          onDeselect={(m) => handleRemoveModel(pickerPlugin, m)}
          activeProviders={activeProviders}
          title={`Select Models - ${activePickerConfig?.title || "Plugin"}`}
          addedModelValues={customPlugins[pickerPlugin]?.models || []}
          closeOnSelect={false}
        />
      )}
    </div>
  );
}
