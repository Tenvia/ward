// Storage backend selection. Default is memory (no persistence);
// WARD_STORAGE=sqlite enables the SQLite prototype.
import { config } from "../config.js";
import { createMemoryStore } from "./memoryStore.js";
import { createSqliteStore } from "./sqliteStore.js";
import type { WardStorage } from "./types.js";

function createStorage(): WardStorage {
  if (config.storage === "sqlite") {
    const store = createSqliteStore(config.sqlitePath);
    console.log(`Ward storage: sqlite (${config.sqlitePath})`);
    return store;
  }
  return createMemoryStore();
}

export const storage: WardStorage = createStorage();
export type { WardStorage } from "./types.js";
