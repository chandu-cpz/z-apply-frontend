import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
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
          className="flex w-full items-center justify-between rounded-lg border border-input bg-card px-3.5 py-2.5 text-left text-sm font-medium text-foreground shadow-sm transition hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground">
              {providerLabel}
            </span>
            <span className="text-muted-foreground/50">/</span>
            <span className="truncate font-mono text-[12.5px] leading-5 tabular-nums text-foreground">
              {activeModelName || "Select model"}
            </span>
          </div>
          <span className="ml-2 text-xs text-muted-foreground">{isOpen ? "▲" : "▼"}</span>
        </button>
      ) : variant === "compact" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex h-7 max-w-[190px] shrink-0 items-center gap-1 rounded-full px-2 text-[11.5px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          title={`Active model: ${activeProviderName} / ${activeModelName}`}
        >
          <span className="max-w-[130px] truncate font-mono text-[11.5px] leading-5 tabular-nums text-foreground">{modelShortLabel || "model"}</span>
          <ChevronDown size={12} className={`shrink-0 text-muted-foreground/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus:outline-none"
        >
          <span className="text-[10px] uppercase tracking-wider text-primary">
            {providerLabel}
          </span>
          <span className="text-muted-foreground/50">/</span>
          <span className="max-w-[160px] truncate font-mono text-[12.5px] leading-5 tabular-nums text-foreground">
            {modelShortLabel || "Select model"}
          </span>
          <span className="text-[10px] text-muted-foreground">{isOpen ? "▴" : "▾"}</span>
        </button>
      )}

      {/* Cascading Popover */}
      {isOpen && (
        <div
          className={`absolute z-50 flex ${
            direction === "up" ? "bottom-full mb-2" : "top-full mt-2"
          } left-0 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl backdrop-blur-md`}
          style={{ minWidth: "520px" }}
        >
          {/* Left Column: Providers List */}
          <div className="w-56 shrink-0 border-r border-border pr-2">
            <div className="px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
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
                        ? "bg-accent font-semibold text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="capitalize">{provider.name}</span>
                        {isSelected && (
                          <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
                            active
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {provider.configured ? "Ready" : `Needs ${provider.env_key}`}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] ${
                        isHovered ? "text-foreground" : "text-muted-foreground"
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
                <div className="flex items-center justify-between border-b border-border pb-1.5">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/80">
                    {currentHoveredProvider.name} Models
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${
                      currentHoveredProvider.configured
                        ? "bg-success/10 text-success"
                        : "bg-warning/15 text-warning"
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
                            ? "bg-accent font-medium text-accent-foreground"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="truncate font-mono text-[12.5px] leading-5 tabular-nums">{model}</span>
                        {isDefault && (
                          <span className="ml-2 shrink-0 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            default
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Model Input */}
                <form onSubmit={handleCustomModelSubmit} className="mt-auto border-t border-border pt-2">
                  <div className="text-[10px] font-medium text-muted-foreground">
                    Custom {currentHoveredProvider.name} Model
                  </div>
                  <div className="mt-1 flex gap-1.5">
                    <input
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      placeholder="e.g. meta-llama/llama-3-8b"
                      className="w-full rounded-lg border border-input bg-card px-2.5 py-1.5 font-mono text-[12.5px] leading-5 tabular-nums text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
                    />
                    <button
                      type="submit"
                      disabled={!customModelInput.trim()}
                      className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-40"
                    >
                      Set
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                Hover over a provider to view models
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
