import { create } from 'zustand';

interface UserState {
  watchlistIds: string[];
  followedTraderIds: string[];
  toggleWatchlist: (predictionId: string) => void;
  toggleFollowTrader: (traderId: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  watchlistIds: ['pred_101', 'pred_103'],
  followedTraderIds: ['trader_1', 'trader_2'],

  toggleWatchlist: (predictionId) =>
    set((state) => ({
      watchlistIds: state.watchlistIds.includes(predictionId)
        ? state.watchlistIds.filter((id) => id !== predictionId)
        : [...state.watchlistIds, predictionId],
    })),

  toggleFollowTrader: (traderId) =>
    set((state) => ({
      followedTraderIds: state.followedTraderIds.includes(traderId)
        ? state.followedTraderIds.filter((id) => id !== traderId)
        : [...state.followedTraderIds, traderId],
    })),
}));
