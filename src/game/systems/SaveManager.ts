const STORAGE_KEY = 'hill-drive-save-v1';

export type SaveData = {
  coins: number;
  gems: number;
  bestDistanceM: number;
};

const DEFAULT_SAVE: SaveData = {
  coins: 0,
  gems: 0,
  bestDistanceM: 0,
};

function read(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SAVE };
    }
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return {
      coins: Math.max(0, Math.floor(Number(parsed.coins) || 0)),
      gems: Math.max(0, Math.floor(Number(parsed.gems) || 0)),
      bestDistanceM: Math.max(0, Math.floor(Number(parsed.bestDistanceM) || 0)),
    };
  } catch {
    return { ...DEFAULT_SAVE };
  }
}

function write(data: SaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota / private mode failures.
  }
}

export const SaveManager = {
  load(): SaveData {
    return read();
  },

  addRunRewards(earnedCoins: number, earnedGems: number, distanceM: number): SaveData {
    const current = read();
    const next: SaveData = {
      coins: current.coins + Math.max(0, Math.floor(earnedCoins)),
      gems: current.gems + Math.max(0, Math.floor(earnedGems)),
      bestDistanceM: Math.max(current.bestDistanceM, Math.floor(distanceM)),
    };
    write(next);
    return next;
  },

  peekBestDistance(): number {
    return read().bestDistanceM;
  },
};
