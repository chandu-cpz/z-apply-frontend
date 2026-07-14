import { create } from "zustand";

interface UiState {
  timelineExpanded: boolean;
  theme: "light" | "dark";
  toggleTimeline(): void;
  toggleTheme(): void;
}

/** Local presentation state only; server state remains in TanStack Query. */
export const useUiStore = create<UiState>((set) => ({
  timelineExpanded: false,
  theme: "light",
  toggleTimeline: () => set((state) => ({ timelineExpanded: !state.timelineExpanded })),
  toggleTheme: () => set((state) => ({ theme: state.theme === "light" ? "dark" : "light" })),
}));
