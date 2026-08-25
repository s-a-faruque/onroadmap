import type { RoadmapState } from './types';

const STORAGE_KEY = 'onroadmap.payload.v1';

export interface RoadmapStore {
  load(): RoadmapState | null;
  save(state: RoadmapState): void;
}

export const localRoadmapStore: RoadmapStore = {
  load() {
    const rawPayload = window.localStorage.getItem(STORAGE_KEY);

    if (!rawPayload) {
      return null;
    }

    try {
      return JSON.parse(rawPayload) as RoadmapState;
    } catch {
      return null;
    }
  },
  save(state) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};
