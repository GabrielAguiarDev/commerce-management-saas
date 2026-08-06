import { create } from 'zustand';

/**
 * Connectivity and syncing.
 *
 * Ephemeral on purpose: the real network state is read from NetInfo at startup
 * (see `hooks/useConnectionMonitor`). Persisting "offline" would make the app
 * open showing the amber banner even with Wi-Fi on.
 */

/** How long the "syncing…" banner stays on screen. Comes from the prototype. */
export const SYNC_DURATION_MS = 2400;

interface ConnectionState {
  online: boolean;
  syncing: boolean;

  setOnline: (online: boolean) => void;
  finishSync: () => void;
}

export const useConnectionStore = create<ConnectionState>()((set, get) => ({
  online: true,
  syncing: false,

  /**
   * Only the offline → online TRANSITION triggers a sync. Calling with the same
   * value is a no-op: NetInfo emits repeated events when switching networks,
   * and without this guard the banner would restart itself on every emission.
   */
  setOnline: (online) => {
    const previous = get().online;
    if (previous === online) return;
    set({ online, syncing: online && !previous });
  },

  finishSync: () => set({ syncing: false }),
}));
