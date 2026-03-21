export const FITNESS_HISTORY_PAGE_KEY = "fitness-history";

export type WeightliftingSession = {
  id: string;
  type: "weightlifting";
  dateTime: string;
  groupId: string;
  groupTitle: string;
  notes?: string;
  exercises: Array<{
    exerciseId: string;
    exerciseName: string;
    target: {
      weight?: string;
      sets?: string;
      reps?: string;
      weeksSinceIncrease?: string;
    };
    actual: {
      weight?: string;
      sets?: string;
      reps?: string;
      notes?: string;
    };
  }>;
};

export type CardioSession = {
  id: string;
  type: "cardio";
  dateTime: string;
  workoutType: string;
  title: string;
  summary: string;
  steps: Array<{
    text: string;
    target?: string;
    actual?: string;
    done?: boolean;
  }>;
};

export type FitnessHistoryState = {
  weightliftingSessions: WeightliftingSession[];
  cardioSessions: CardioSession[];
};

export function createEmptyFitnessHistoryState(): FitnessHistoryState {
  return {
    weightliftingSessions: [],
    cardioSessions: [],
  };
}

export function normalizeFitnessHistoryState(raw: any): FitnessHistoryState {
  return {
    weightliftingSessions: Array.isArray(raw?.weightliftingSessions)
      ? raw.weightliftingSessions
      : [],
    cardioSessions: Array.isArray(raw?.cardioSessions) ? raw.cardioSessions : [],
  };
}

export async function loadFitnessHistory(): Promise<FitnessHistoryState> {
  try {
    const res = await fetch(`/api/state?pageKey=${encodeURIComponent(FITNESS_HISTORY_PAGE_KEY)}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return createEmptyFitnessHistoryState();

    const data = await res.json();
    return normalizeFitnessHistoryState(data?.state);
  } catch {
    return createEmptyFitnessHistoryState();
  }
}

export async function saveFitnessHistory(state: FitnessHistoryState) {
  await fetch("/api/state", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pageKey: FITNESS_HISTORY_PAGE_KEY,
      state,
    }),
  });
}

export async function appendWeightliftingSession(session: WeightliftingSession) {
  const state = await loadFitnessHistory();
  state.weightliftingSessions = [session, ...state.weightliftingSessions];
  await saveFitnessHistory(state);
}

export async function appendCardioSession(session: CardioSession) {
  const state = await loadFitnessHistory();
  state.cardioSessions = [session, ...state.cardioSessions];
  await saveFitnessHistory(state);
}

export async function deleteWeightliftingSession(sessionId: string) {
  const state = await loadFitnessHistory();
  state.weightliftingSessions = state.weightliftingSessions.filter((x) => x.id !== sessionId);
  await saveFitnessHistory(state);
}

export async function deleteCardioSession(sessionId: string) {
  const state = await loadFitnessHistory();
  state.cardioSessions = state.cardioSessions.filter((x) => x.id !== sessionId);
  await saveFitnessHistory(state);
}