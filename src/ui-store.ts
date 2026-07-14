import { create } from "zustand";

interface UiState {
  timelineExpanded: boolean;
  toggleTimeline(): void;
}

/** Local presentation state only; server state remains in TanStack Query. */
export const useUiStore = create<UiState>((set) => ({
  timelineExpanded: false,
  toggleTimeline: () => set((state) => ({ timelineExpanded: !state.timelineExpanded })),
}));
