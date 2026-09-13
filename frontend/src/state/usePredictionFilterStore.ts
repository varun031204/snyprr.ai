import { create } from 'zustand';
import { Prediction } from '../types';

interface PredictionFilterState {
  search: string;
  instrumentFilter: string;
  directionFilter: string;
  statusFilter: string;
  timeframeFilter: string;
  draftPrediction: Partial<Prediction> | null;
  setSearch: (search: string) => void;
  setInstrumentFilter: (instrument: string) => void;
  setDirectionFilter: (direction: string) => void;
  setStatusFilter: (status: string) => void;
  setTimeframeFilter: (timeframe: string) => void;
  resetFilters: () => void;
  setDraftPrediction: (draft: Partial<Prediction> | null) => void;
  updateDraftPrediction: (updates: Partial<Prediction>) => void;
}

export const usePredictionFilterStore = create<PredictionFilterState>((set) => ({
  search: '',
  instrumentFilter: '',
  directionFilter: '',
  statusFilter: '',
  timeframeFilter: '',
  draftPrediction: null,

  setSearch: (search) => set({ search }),
  setInstrumentFilter: (instrumentFilter) => set({ instrumentFilter }),
  setDirectionFilter: (directionFilter) => set({ directionFilter }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setTimeframeFilter: (timeframeFilter) => set({ timeframeFilter }),

  resetFilters: () =>
    set({
      search: '',
      instrumentFilter: '',
      directionFilter: '',
      statusFilter: '',
      timeframeFilter: '',
    }),

  setDraftPrediction: (draftPrediction) => set({ draftPrediction }),

  updateDraftPrediction: (updates) =>
    set((state) => ({
      draftPrediction: state.draftPrediction ? { ...state.draftPrediction, ...updates } : updates,
    })),
}));
