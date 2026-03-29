export const PROFILE_STATS_PAGE_KEY = "profile-stats";

export type ProfileStatsState = {
  fitness: {
    totalWeightliftingSessions: number;
    totalCardioSessions: number;
    totalFitnessSessions: number;
    lastWorkoutAt: string;
    updatedAt: string;
  };
  hobbies: {
    totalHobbies: number;
    totalStages: number;
    completedStages: number;
    totalLogEntries: number;
    totalLibraryItems: number;
    totalHoursSpent: number;
    updatedAt: string;
  };
};

export function createEmptyProfileStatsState(): ProfileStatsState {
  return {
    fitness: {
      totalWeightliftingSessions: 0,
      totalCardioSessions: 0,
      totalFitnessSessions: 0,
      lastWorkoutAt: "",
      updatedAt: "",
    },
    hobbies: {
      totalHobbies: 0,
      totalStages: 0,
      completedStages: 0,
      totalLogEntries: 0,
      totalLibraryItems: 0,
      totalHoursSpent: 0,
      updatedAt: "",
    },
  };
}

export async function loadProfileStats(): Promise<ProfileStatsState> {
  try {
    const res = await fetch(`/api/state?pageKey=${encodeURIComponent(PROFILE_STATS_PAGE_KEY)}`, {
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) return createEmptyProfileStatsState();

    const data = await res.json();
    return {
      ...createEmptyProfileStatsState(),
      ...(data?.state || {}),
    };
  } catch {
    return createEmptyProfileStatsState();
  }
}

export async function saveProfileStats(state: ProfileStatsState) {
  await fetch("/api/state", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pageKey: PROFILE_STATS_PAGE_KEY,
      state,
    }),
  });
}

export function buildFitnessStats(fitnessHistoryState: any) {
  const weightliftingSessions = Array.isArray(fitnessHistoryState?.weightliftingSessions)
    ? fitnessHistoryState.weightliftingSessions
    : [];
  const cardioSessions = Array.isArray(fitnessHistoryState?.cardioSessions)
    ? fitnessHistoryState.cardioSessions
    : [];

  const allDates = [...weightliftingSessions, ...cardioSessions]
    .map((x) => x?.dateTime || "")
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return {
    totalWeightliftingSessions: weightliftingSessions.length,
    totalCardioSessions: cardioSessions.length,
    totalFitnessSessions: weightliftingSessions.length + cardioSessions.length,
    lastWorkoutAt: allDates[0] || "",
    updatedAt: new Date().toISOString(),
  };
}

export function buildHobbyStats(hobbiesState: any) {
  const hobbies = Array.isArray(hobbiesState?.hobbies) ? hobbiesState.hobbies : [];

  const totalStages = hobbies.reduce((sum: number, hobby: any) => sum + (hobby?.stages?.length || 0), 0);
  const completedStages = hobbies.reduce(
    (sum: number, hobby: any) =>
      sum +
      (Array.isArray(hobby?.stages)
        ? hobby.stages.filter((s: any) => s?.status === "Completed" || s?.status === "Done").length
        : 0),
    0
  );
  const totalLogEntries = hobbies.reduce((sum: number, hobby: any) => sum + (hobby?.activityLog?.length || 0), 0);
  const totalLibraryItems = hobbies.reduce((sum: number, hobby: any) => sum + (hobby?.library?.length || 0), 0);
  const totalHoursSpent = hobbies.reduce((sum: number, hobby: any) => sum + Number(hobby?.hoursSpent || 0), 0);

  return {
    totalHobbies: hobbies.length,
    totalStages,
    completedStages,
    totalLogEntries,
    totalLibraryItems,
    totalHoursSpent,
    updatedAt: new Date().toISOString(),
  };
}