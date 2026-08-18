import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";
import type { ProviderCatalogItem } from "../types";

interface Props {
  selectedProvider?: string;
  selectedModel?: string;
  onSelect(provider: string, model: string): void;
  disabled?: boolean;
  variant?: "pill" | "form" | "compact";
  direction?: "up" | "down";
}

export function ModelCascadingPicker({
  selectedProvider,
  selectedModel,
  onSelect,
  disabled = false,
  variant = "pill",
  direction = "down",
}: Props) {
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: api.providers,
    staleTime: 30_000,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Active default provider fallback
  const defaultProvider = useMemo(() => {
    if (!providers?.length) return null;
    return providers.find((p) => p.is_default) || providers.find((p) => p.configured) || providers[0];
  }, [providers]);

  const activeProviderName = selectedProvider || defaultProvider?.name || "";
  const activeProvider = useMemo(() => {
    return providers?.find((p) => p.name === activeProviderName) || defaultProvider;
  }, [providers, activeProviderName, defaultProvider]);

  const activeModelName = selectedModel || activeProvider?.default_model || "";

  // Hover state tracks which provider's models are currently shown in the flyout
  const [hoveredProviderName, setHoveredProviderName] = useState<string | null>(null);

  const currentHoveredProvider = useMemo(() => {
    const targetName = hoveredProviderName || activeProviderName;
    return providers?.find((p) => p.name === targetName) || activeProvider;
  }, [providers, hoveredProviderName, activeProviderName, activeProvider]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleProviderSelect = (provider: ProviderCatalogItem) => {
    setHoveredProviderName(provider.name);
  };

  const handleModelChoose = (providerName: string, modelName: string) => {
    onSelect(providerName, modelName);
    setIsOpen(false);
    setCustomModelInput("");
  };

  const handleCustomModelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customModelInput.trim() || !currentHoveredProvider) return;
    onSelect(currentHoveredProvider.name, customModelInput.trim());
    setIsOpen(false);
    setCustomModelInput("");
  };

  // Compact display labels
  const providerLabel = activeProvider?.name || "Provider";
  const modelShortLabel = activeModelName.includes("/") ? activeModelName.split("/").pop()! : activeModelName;

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {/* Trigger Button */}
      {variant === "form" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-left text-sm font-medium text-stone-900 shadow-sm transition hover:border-stone-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-stone-500 dark:text-zinc-400">
              {providerLabel}
            </span>
            <span className="text-stone-300 dark:text-zinc-700">/</span>
            <span className="truncate font-mono text-xs text-stone-900 dark:text-zinc-200">
              {activeModelName || "Select model"}
            </span>
          </div>
          <span className="ml-2 text-xs text-stone-400 dark:text-zinc-500">{isOpen ? "▲" : "▼"}</span>
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          title={`Active model: ${activeProviderName} / ${activeModelName}`}
        >
          <span className="font-mono uppercase tracking-wider text-[10px] text-zinc-400 dark:text-zinc-500">
            {providerLabel}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span className="max-w-[130px] truncate font-mono">{modelShortLabel || "model"}</span>
          <span className="text-[9px] text-zinc-400">{isOpen ? "▴" : "▾"}</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-800"
        >
          <span className="font-mono text-[10px] uppercase tracking-wider text-violet-600 dark:text-violet-400">
            {providerLabel}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">/</span>
          <span className="max-w-[160px] truncate font-mono text-[11px] text-zinc-900 dark:text-zinc-100">
            {modelShortLabel || "Select model"}
          </span>
          <span className="text-[10px] text-zinc-400">{isOpen ? "▴" : "▾"}</span>
        </button>
      )}

      {/* Cascading Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 flex ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 rounded-2xl border border-zinc-200 bg-white p-2 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950`}
          style={{ minWidth: "520px" }}
        >
          {/* Left Column: Providers List */}
          <div className="w-56 shrink-0 border-r border-zinc-100 pr-2 dark:border-zinc-800/80">
            <div className="px-2.5 py-1.5 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
              Providers
            </div>
            <div className="mt-1 space-y-1">
              {(providers ?? []).map((provider) => {
                const isHovered = (currentHoveredProvider?.name === provider.name);
                const isSelected = (activeProviderName === provider.name);

                return (
                  <div
                    key={provider.name}
                    onMouseEnter={() => handleProviderSelect(provider)}
                    onClick={() => handleProviderSelect(provider)}
                    className={`group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 text-xs transition ${
                      isHovered
                        ? "bg-zinc-100 font-semibold text-zinc-950 dark:bg-zinc-800/80 dark:text-zinc-50"
                        : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="capitalize">{provider.name}</span>
                        {isSelected && (
                          <span className="rounded bg-violet-100 px-1 py-0.2 font-mono text-[9px] text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                            active
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-zinc-400 dark:text-zinc-500">
                        {provider.configured ? "Ready" : `Needs ${provider.env_key}`}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] ${
                        isHovered ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
                      }`}
                    >
                      ›
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Models Flyout for current hovered provider */}
          <div className="flex-1 pl-2.5">
            {currentHoveredProvider ? (
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5 dark:border-zinc-800/80">
                  <span className="text-[10px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-zinc-500">
                    {currentHoveredProvider.name} Models
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-medium ${
                      currentHoveredProvider.configured
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                    }`}
                  >
                    {currentHoveredProvider.configured ? "Key configured" : "Missing API key"}
                  </span>
                </div>

                {/* Models List */}
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto">
                  {currentHoveredProvider.suggested_models.map((model) => {
                    const isDefault = model === currentHoveredProvider.default_model;
                    const isCurrent = activeProviderName === currentHoveredProvider.name && activeModelName === model;

                    return (
                      <button
                        key={model}
                        type="button"
                        onClick={() => handleModelChoose(currentHoveredProvider.name, model)}
                        className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition ${
                          isCurrent
                            ? "bg-violet-50 font-medium text-violet-950 dark:bg-violet-950/40 dark:text-violet-200"
                            : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                        }`}
                      >
                        <span className="truncate font-mono text-[11px]">{model}</span>
                        {isDefault && (
                          <span className="ml-2 shrink-0 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                            default
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Model Input */}
                <form onSubmit={handleCustomModelSubmit} className="mt-auto border-t border-zinc-100 pt-2 dark:border-zinc-800/80">
                  <div className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                    Custom {currentHoveredProvider.name} Model
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      placeholder="e.g. meta-llama/llama-3-8b"
                      className="w-full rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 font-mono text-xs text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600"
                    />
                    <button
                      type="submit"
                      disabled={!customModelInput.trim()}
                      className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-800 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                      Set
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-xs text-zinc-400">
                Hover over a provider to view models
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
