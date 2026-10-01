import { openDB } from "idb";
import type { Phase2State, Thread } from "../../shared/domain";
const db = openDB(
  import.meta.env.VITE_API_MODE === "live" ? "agroman-live" : "agroman-demo",
  2,
  {
    upgrade(db) {
      if (!db.objectStoreNames.contains("local")) db.createObjectStore("local");
      if (!db.objectStoreNames.contains("phase2")) db.createObjectStore("phase2");
    },
  },
);
export async function readThreads(): Promise<Thread[]> {
  return (await (await db).get("local", "threads")) ?? [];
}
export async function saveThreads(threads: Thread[]) {
  await (await db).put("local", threads, "threads");
}

const emptyPhase2State: Phase2State = {
  plots: [],
  cycles: [],
  events: [],
  ledger: [],
  cases: [],
  outcomes: [],
};

export async function readPhase2State(): Promise<Phase2State> {
  return (await (await db).get("phase2", "state")) ?? emptyPhase2State;
}

export async function savePhase2State(state: Phase2State) {
  await (await db).put("phase2", state, "state");
}
