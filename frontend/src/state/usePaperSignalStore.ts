/**
 * usePaperSignalStore
 *
 * Thin Zustand store that carries a trader prediction from the AI analysis
 * panel to the paper trading page. The prediction is cleared after it has
 * been read by MyTradesPage so the pre-fill only happens once per navigation.
 */
import { create } from 'zustand';
import type { Prediction } from '../types';

interface PaperSignalState {
  signal: Prediction | null;
  setSignal: (p: Prediction) => void;
  clearSignal: () => void;
}

export const usePaperSignalStore = create<PaperSignalState>((set) => ({
  signal: null,
  setSignal: (p) => set({ signal: p }),
  clearSignal: () => set({ signal: null }),
}));
