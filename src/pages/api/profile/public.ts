import type { APIRoute } from "astro";
import { getSql } from "../../../lib/db";
import {
  PROFILE_SETTINGS_PAGE_KEY,
  PROFILE_PORTFOLIO_SOURCE_PAGE_KEY,
  PROFILE_PUBLIC_ACTIVITY_LIMIT,
  DEFAULT_PROFILE_SETTINGS,
} from "../../../lib/profile/constants";

export const prerender = false;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeStoredState(value: unknown) {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function safeArray<T = any>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function safeObject<T = Record<string, any>>(value: unknown): T {
  return value && typeof value === "object" ? (value as T) : ({} as T);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function sortByOrder(items: any[]) {
  return [...items].sort((a, b) => Number(a?.sortOrder || 0) - Number(b?.sortOrder || 0));
}

function visibleItems(items: any[]) {
  return safeArray(items).filter((item) => normalizeBoolean(item?.visible, true));
}

function publicItems(items: any[]) {
  return sortByOrder(
    visibleItems(items).map((item) => ({
      ...item,
      featuredOnProfile: normalizeBoolean(item?.featuredOnProfile, false),
      pinnedOnProfile: normalizeBoolean(item?.pinnedOnProfile, false),
      profileCategory: stringValue(item?.profileCategory),
      badgeLabel: stringValue(item?.badgeLabel),
      activityLabel: stringValue(item?.activityLabel),
      sortOrder: Number(item?.sortOrder || 0),
    }))
  );
}

function buildPinned(portfolio: Record<string, any[]>) {
  return Object.entries(portfolio)
    .flatMap(([category, items]) =>
      safeArray(items)
        .filter((item) => item?.pinnedOnProfile)
        .map((item) => ({
          id: item?.id || `${category}-${item?.title || "item"}`,
          category,
          title: item?.title || "Pinned item",
          description: item?.description || item?.body || item?.impact || "",
          href: item?.link || "",
        }))
    )
    .slice(0, 8);
}

function buildBadges(profileSettings: any, portfolio: Record<string, any[]>) {
  const explicitBadges = safeArray(profileSettings?.badges);

  const generated = Object.values(portfolio)
    .flatMap((items) => safeArray(items))
    .filter((item) => item?.badgeLabel)
    .map((item) => ({
      id: item?.id || item?.badgeLabel,
      label: item?.badgeLabel,
    }));

  const merged = [...explicitBadges, ...generated];
  const seen = new Set<string>();

  return merged.filter((badge) => {
    const key = `${badge?.id || ""}::${badge?.label || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildActivity(portfolio: Record<string, any[]>) {
  return Object.entries(portfolio)
    .flatMap(([category, items]) =>
      safeArray(items)
        .filter((item) => item?.activityLabel)
        .map((item) => ({
          id: item?.id || `${category}-${item?.title || "activity"}`,
          label: item?.activityLabel || item?.title || "Updated item",
          date: item?.date || item?.completed || item?.timeline || "",
          href: item?.link || "",
        }))
    )
    .slice(0, PROFILE_PUBLIC_ACTIVITY_LIMIT);
}

function buildLegacyStats(career: any) {
  return safeArray(career?.stats)
    .filter((item) => normalizeBoolean(item?.visible, true) && normalizeBoolean(item?.showInProfileStats, true))
    .map((item) => ({
      id: item?.id || item?.title || "stat",
      label: item?.title || "Stat",
      value: item?.shortValue || item?.impact || "",
      section: item?.statSection || "career",
      description: item?.description || "",
    }));
}

function formatDateTime(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleString();
}

function formatDateShort(value: unknown) {
  const raw = stringValue(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString();
}

function createMetricCard(label: string, value: string, description = "") {
  return { label, value, description };
}

function slugify(value: unknown) {
  return stringValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function classifySection(groupTitle: unknown) {
  const value = stringValue(groupTitle).toLowerCase();

  if (value.includes("shoulder") || value.includes("delt")) return "shoulders";
  if (value.includes("chest") || value.includes("bench") || value.includes("pec")) return "chest";
  if (value.includes("back") || value.includes("row") || value.includes("lat") || value.includes("deadlift")) return "back";
  if (value.includes("leg") || value.includes("quad") || value.includes("hamstring") || value.includes("glute") || value.includes("squat") || value.includes("calf")) return "legs";
  if (value.includes("arm") || value.includes("bicep") || value.includes("tricep") || value.includes("curl")) return "arms";
  if (value.includes("core") || value.includes("ab") || value.includes("plank")) return "core";

  return "other";
}

function classifyCardioType(workoutType: unknown, title: unknown) {
  const combined = `${stringValue(workoutType)} ${stringValue(title)}`.toLowerCase();

  if (combined.includes("tempo")) return "tempo";
  if (combined.includes("interval")) return "intervals";
  if (combined.includes("hiit")) return "hiit";
  if (combined.includes("fartlek")) return "fartlek";
  if (combined.includes("hill")) return "hills";
  if (combined.includes("power") || combined.includes("watts")) return "power";
  if (combined.includes("recovery")) return "recovery";
  if (combined.includes("long")) return "long-run";
  if (combined.includes("steady")) return "steady";

  return slugify(workoutType || title) || "cardio";
}

function parseWeight(value: unknown) {
  const text = stringValue(value);
  const match = text.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseReps(value: unknown) {
  const text = stringValue(value);
  if (!text) return 0;

  const matches = text.match(/\d+/g);
  if (!matches?.length) return 0;

  const nums = matches.map(Number).filter((num) => Number.isFinite(num));
  if (!nums.length) return 0;

  return nums.reduce((sum, current) => sum + current, 0);
}

function estimateSetCount(value: unknown) {
  const text = stringValue(value);
  if (!text) return 0;

  const matches = text.match(/\d+/g);
  if (!matches?.length) return 0;

  return matches.length;
}

function normalizeProfileSettings(raw: any) {
  const defaults = DEFAULT_PROFILE_SETTINGS;

  return {
    ...defaults,
    ...safeObject(raw),
    visibility: {
      ...defaults.visibility,
      ...safeObject(raw?.visibility),
    },
    portfolioFilters: {
      ...defaults.portfolioFilters,
      ...safeObject(raw?.portfolioFilters),
    },
    statsSources: {
      ...defaults.statsSources,
      ...safeObject(raw?.statsSources),
    },
    statsDisplay: {
      autoFormatted: normalizeBoolean(raw?.statsDisplay?.autoFormatted, true),
      showOverview: normalizeBoolean(raw?.statsDisplay?.showOverview, true),
      showSections: normalizeBoolean(raw?.statsDisplay?.showSections, true),
      showWorkouts: normalizeBoolean(raw?.statsDisplay?.showWorkouts, true),
      showCardio: normalizeBoolean(raw?.statsDisplay?.showCardio, true),
      showRecentSessions: normalizeBoolean(raw?.statsDisplay?.showRecentSessions, true),
      defaultRange: stringValue(raw?.statsDisplay?.defaultRange) || "30d",
      defaultSection: stringValue(raw?.statsDisplay?.defaultSection) || "all",
      defaultCardioType: stringValue(raw?.statsDisplay?.defaultCardioType) || "all",
      featuredFitnessMetrics: safeArray(raw?.statsDisplay?.featuredFitnessMetrics),
      featuredCardioMetrics: safeArray(raw?.statsDisplay?.featuredCardioMetrics),
    },
  };
}

function buildFitnessFormattedStats(fitnessHistory: any, profileStats: any) {
  const weightliftingSessions = safeArray(fitnessHistory?.weightliftingSessions);
  const cardioSessions = safeArray(fitnessHistory?.cardioSessions);
  const fitnessStats = safeObject(profileStats?.fitness);

  const totalWorkouts = weightliftingSessions.length;

  let totalVolume = 0;
  let totalSets = 0;
  let totalExercisesLogged = 0;

  const sectionMap = new Map<
    string,
    {
      label: string;
      totalWorkouts: number;
      totalVolume: number;
      totalWeight: number;
      totalReps: number;
      entryCount: number;
      lastTrainedDate: string;
    }
  >();

  const workoutMap = new Map<
    string,
    {
      section: string;
      label: string;
      weights: number[];
      reps: number[];
      bestVolume: number;
      totalSessions: number;
      lastDate: string;
    }
  >();

  for (const session of weightliftingSessions) {
    const section = classifySection(session?.groupTitle);
    const sectionLabel = stringValue(session?.groupTitle) || section || "Workout";

    if (!sectionMap.has(section)) {
      sectionMap.set(section, {
        label: sectionLabel,
        totalWorkouts: 0,
        totalVolume: 0,
        totalWeight: 0,
        totalReps: 0,
        entryCount: 0,
        lastTrainedDate: "",
      });
    }

    const sectionEntry = sectionMap.get(section)!;
    sectionEntry.totalWorkouts += 1;

    const exercises = safeArray(session?.exercises);
    for (const exercise of exercises) {
      const actualWeight = parseWeight(exercise?.actual?.weight || exercise?.target?.weight);
      const actualReps = parseReps(exercise?.actual?.reps || exercise?.target?.reps);
      const actualSets =
        estimateSetCount(exercise?.actual?.reps) ||
        parseWeight(exercise?.actual?.sets || exercise?.target?.sets) ||
        1;
      const exerciseVolume = actualWeight * Math.max(actualReps, 1);

      totalVolume += exerciseVolume;
      totalSets += Math.max(actualSets, 1);
      totalExercisesLogged += 1;

      sectionEntry.totalVolume += exerciseVolume;
      sectionEntry.totalWeight += actualWeight;
      sectionEntry.totalReps += actualReps;
      sectionEntry.entryCount += 1;
      sectionEntry.lastTrainedDate = session?.dateTime || sectionEntry.lastTrainedDate;

      const workoutKey = `${section}::${stringValue(exercise?.exerciseName) || "exercise"}`;
      if (!workoutMap.has(workoutKey)) {
        workoutMap.set(workoutKey, {
          section,
          label: stringValue(exercise?.exerciseName) || "Exercise",
          weights: [],
          reps: [],
          bestVolume: 0,
          totalSessions: 0,
          lastDate: "",
        });
      }

      const workoutEntry = workoutMap.get(workoutKey)!;
      workoutEntry.weights.push(actualWeight);
      workoutEntry.reps.push(actualReps);
      workoutEntry.bestVolume = Math.max(workoutEntry.bestVolume, exerciseVolume);
      workoutEntry.totalSessions += 1;
      workoutEntry.lastDate = session?.dateTime || workoutEntry.lastDate;
    }
  }

  const avgWeight = totalExercisesLogged ? totalVolume / Math.max(totalExercisesLogged, 1) : 0;
  const avgReps = totalExercisesLogged
    ? Array.from(workoutMap.values()).reduce((sum, item) => sum + item.reps.reduce((a, b) => a + b, 0), 0) /
      Math.max(totalExercisesLogged, 1)
    : 0;

  const sectionCards = Array.from(sectionMap.entries()).map(([sectionKey, item]) => {
    const avgSectionWeight = item.entryCount ? item.totalWeight / item.entryCount : 0;
    const avgSectionReps = item.entryCount ? item.totalReps / item.entryCount : 0;

    return {
      section: sectionKey,
      label: item.label,
      highlight: `${item.totalWorkouts} workouts`,
      totalWorkouts: String(item.totalWorkouts),
      totalVolume: String(Math.round(item.totalVolume)),
      avgWeight: avgSectionWeight ? `${avgSectionWeight.toFixed(1)} avg` : "—",
      avgReps: avgSectionReps ? `${avgSectionReps.toFixed(1)} avg` : "—",
      percentIncrease: "Track over time",
      lastTrainedDate: formatDateShort(item.lastTrainedDate) || "—",
    };
  });

  const sectionWorkoutGroups = Array.from(sectionMap.keys()).map((sectionKey) => {
    const workouts = Array.from(workoutMap.values())
      .filter((item) => item.section === sectionKey)
      .map((item) => {
        const startingWeight = item.weights[0] || 0;
        const currentWeight = item.weights[item.weights.length - 1] || 0;
        const startingReps = item.reps[0] || 0;
        const currentReps = item.reps[item.reps.length - 1] || 0;
        const maxWeight = item.weights.length ? Math.max(...item.weights) : 0;
        const maxReps = item.reps.length ? Math.max(...item.reps) : 0;
        const estimatedOneRepMax = maxWeight && maxReps ? Math.round(maxWeight * (1 + maxReps / 30)) : 0;

        return {
          section: sectionKey,
          label: item.label,
          startingWeight: startingWeight ? `${startingWeight}` : "—",
          currentWeight: currentWeight ? `${currentWeight}` : "—",
          startingReps: startingReps ? `${startingReps}` : "—",
          currentReps: currentReps ? `${currentReps}` : "—",
          bestSet: item.bestVolume ? `${Math.round(item.bestVolume)} volume` : "—",
          estimatedOneRepMax: estimatedOneRepMax ? `${estimatedOneRepMax}` : "—",
          frequency: `${item.totalSessions} sessions`,
          weightTrend: startingWeight && currentWeight ? `${currentWeight - startingWeight >= 0 ? "+" : ""}${(currentWeight - startingWeight).toFixed(1)}` : "—",
          repTrend: startingReps && currentReps ? `${currentReps - startingReps >= 0 ? "+" : ""}${currentReps - startingReps}` : "—",
          volumeTrend: item.bestVolume ? `Best ${Math.round(item.bestVolume)}` : "—",
        };
      });

    const sectionInfo = sectionCards.find((item) => item.section === sectionKey);

    return {
      section: sectionKey,
      label: sectionInfo?.label || sectionKey,
      summary: "Starting vs current, PRs, frequency, and workout trends",
      workouts,
    };
  });

  const overviewCards = [
    createMetricCard("Total Workouts", String(totalWorkouts), "Saved weightlifting sessions"),
    createMetricCard("Total Sets", String(totalSets), "Estimated from logged workouts"),
    createMetricCard("Avg Workout Duration", "Track next", "Add duration later for more accuracy"),
    createMetricCard("Strongest Body Section", sectionCards[0]?.label || "—", "Based on saved volume so far"),
    createMetricCard("Biggest Improvement", "Track next", "First vs latest progression by workout"),
    createMetricCard("Consistency Streak", fitnessStats?.lastWorkoutAt ? "Active" : "—", "Derived from recent saved workouts"),
  ];

  const fitnessOverviewCards = [
    createMetricCard("Workouts Completed", String(totalWorkouts), "Saved lifting sessions"),
    createMetricCard("Total Volume Lifted", String(Math.round(totalVolume)), "Weight x reps across logged lifts"),
    createMetricCard("Avg Reps per Exercise", avgReps ? avgReps.toFixed(1) : "0", "Across saved lifting entries"),
    createMetricCard("Avg Weight per Exercise", avgWeight ? avgWeight.toFixed(1) : "0", "Across saved lifting entries"),
    createMetricCard("Strength Increase", "Track over time", "Compare first and latest per workout"),
    createMetricCard("Rep Endurance", "Track over time", "Compare rep growth over time"),
  ];

  return {
    overviewCards,
    fitnessOverviewCards,
    fitnessSectionComparison: sectionCards,
    fitnessWorkoutDetail: {
      sections: sectionWorkoutGroups,
    },
    recentWeightliftingSessions: weightliftingSessions.slice(0, 6).map((session: any) => ({
      title: stringValue(session?.groupTitle) || "Weightlifting Workout",
      date: formatDateTime(session?.dateTime),
      summary: `${safeArray(session?.exercises).length} exercise(s) saved`,
    })),
  };
}

function buildCardioFormattedStats(fitnessHistory: any) {
  const cardioSessions = safeArray(fitnessHistory?.cardioSessions);

  const typeMap = new Map<
    string,
    {
      label: string;
      totalSessions: number;
      totalSteps: number;
      completedSteps: number;
      lastWorkout: string;
    }
  >();

  const favoriteCounts = new Map<string, number>();

  for (const session of cardioSessions) {
    const type = classifyCardioType(session?.workoutType, session?.title);
    const label = stringValue(session?.workoutType) || stringValue(session?.title) || "Cardio";

    if (!typeMap.has(type)) {
      typeMap.set(type, {
        label,
        totalSessions: 0,
        totalSteps: 0,
        completedSteps: 0,
        lastWorkout: "",
      });
    }

    favoriteCounts.set(type, (favoriteCounts.get(type) || 0) + 1);

    const entry = typeMap.get(type)!;
    entry.totalSessions += 1;
    entry.lastWorkout = session?.dateTime || entry.lastWorkout;

    const steps = safeArray(session?.steps);
    entry.totalSteps += steps.length;
    entry.completedSteps += steps.filter((step) => !!step?.done).length;
  }

  const favoriteWorkoutType =
    Array.from(favoriteCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const cardioOverviewCards = [
    createMetricCard("Total Cardio Sessions", String(cardioSessions.length), "Saved cardio workouts"),
    createMetricCard("Total Distance", "Track next", "Add parsed distance later"),
    createMetricCard("Total Time", "Track next", "Add parsed duration later"),
    createMetricCard("Avg Weekly Sessions", "Track next", "Best with date-range grouping"),
    createMetricCard("Completion Rate", "From saved steps", "How often planned steps were completed"),
    createMetricCard("Favorite Workout Type", favoriteWorkoutType, "Most frequently saved cardio type"),
  ];

  const cardioTypeBreakdown = {
    types: Array.from(typeMap.entries()).map(([typeKey, item]) => {
      const completionRate = item.totalSteps
        ? `${Math.round((item.completedSteps / item.totalSteps) * 100)}%`
        : "—";

      return {
        type: typeKey,
        label: item.label,
        headlineValue: `${item.totalSessions} sessions`,
        totalSessions: String(item.totalSessions),
        consistency: "Track by range",
        completionRate,
        lastWorkout: formatDateShort(item.lastWorkout) || "—",
        coreMetric: "Type-specific metric",
        bestEffort: "Track next",
        improvement: "Track over time",
        totalVolume: `${item.totalSteps} planned steps`,
      };
    }),
  };

  return {
    cardioOverviewCards,
    cardioTypeBreakdown,
    recentCardioSessions: cardioSessions.slice(0, 6).map((session: any) => ({
      title: stringValue(session?.title) || stringValue(session?.workoutType) || "Cardio Workout",
      date: formatDateTime(session?.dateTime),
      summary: `${safeArray(session?.steps).length} step(s) saved`,
    })),
  };
}

function buildHobbyFormattedStats(profileStats: any) {
  const hobbies = safeObject(profileStats?.hobbies);

  return [
    createMetricCard("Hobbies", String(numberValue(hobbies?.totalHobbies)), "Total active hobbies"),
    createMetricCard("Stages", String(numberValue(hobbies?.totalStages)), "All tracked hobby stages"),
    createMetricCard("Completed Stages", String(numberValue(hobbies?.completedStages)), "Finished hobby milestones"),
    createMetricCard("Log Entries", String(numberValue(hobbies?.totalLogEntries)), "Activity logs saved"),
    createMetricCard("Library Items", String(numberValue(hobbies?.totalLibraryItems)), "Saved hobby resources"),
    createMetricCard("Hours Spent", String(numberValue(hobbies?.totalHoursSpent)), "Total logged hobby hours"),
  ];
}

function buildFormattedStats(profileSettings: any, fitnessHistory: any, profileStats: any) {
  const fitness = buildFitnessFormattedStats(fitnessHistory, profileStats);
  const cardio = buildCardioFormattedStats(fitnessHistory);
  const hobbies = buildHobbyFormattedStats(profileStats);

  return {
    overviewCards: [
      ...(profileSettings?.statsSources?.fitness ? fitness.overviewCards : []),
      ...(profileSettings?.statsSources?.hobbies ? hobbies.slice(0, 2) : []),
    ].slice(0, 8),
    fitnessOverviewCards: profileSettings?.statsSources?.fitness ? fitness.fitnessOverviewCards : [],
    cardioOverviewCards: profileSettings?.statsSources?.fitness ? cardio.cardioOverviewCards : [],
    fitnessSectionComparison: profileSettings?.statsSources?.fitness ? fitness.fitnessSectionComparison : [],
    fitnessWorkoutDetail: profileSettings?.statsSources?.fitness ? fitness.fitnessWorkoutDetail : { sections: [] },
    cardioTypeBreakdown: profileSettings?.statsSources?.fitness ? cardio.cardioTypeBreakdown : { types: [] },
    recentWeightliftingSessions: profileSettings?.statsSources?.fitness ? fitness.recentWeightliftingSessions : [],
    recentCardioSessions: profileSettings?.statsSources?.fitness ? cardio.recentCardioSessions : [],
    hobbyOverviewCards: profileSettings?.statsSources?.hobbies ? hobbies : [],
  };
}

async function findPublicProfileUserId(sql: ReturnType<typeof getSql>, username: string) {
  const rows = await sql<{ user_id: string; page_key: string; state: unknown; updated_at: string }[]>`
    select distinct on (user_id) user_id, page_key, state, updated_at
    from page_state
    where page_key = ${PROFILE_SETTINGS_PAGE_KEY}
    order by user_id, updated_at desc
  `;

  const wanted = username.trim().toLowerCase();

  console.log("[public profile] lookup start", {
    wanted,
    profileSettingsPageKey: PROFILE_SETTINGS_PAGE_KEY,
    rowCount: rows.length,
  });

  for (const row of rows) {
    const rawState = normalizeStoredState(row.state);
    const state = normalizeProfileSettings(rawState);
    const savedUsername = stringValue(state?.username).trim().toLowerCase();
    const savedHandle = stringValue(state?.handle).replace(/^@/, "").trim().toLowerCase();

    console.log("[public profile] candidate", {
      userId: row.user_id,
      pageKey: row.page_key,
      updatedAt: row.updated_at,
      savedUsername,
      savedHandle,
      displayName: stringValue(state?.displayName),
    });

    if (savedUsername === wanted || savedHandle === wanted) {
      console.log("[public profile] matched", {
        userId: row.user_id,
        savedUsername,
        savedHandle,
      });

      return {
        userId: row.user_id,
        profileSettings: state,
      };
    }
  }

  console.log("[public profile] no match found", { wanted });
  return null;
}

async function readUserPageState(
  sql: ReturnType<typeof getSql>,
  userId: string,
  pageKey: string
) {
  const rows = await sql<{ state: unknown }[]>`
    select state
    from page_state
    where user_id = ${userId}
      and page_key = ${pageKey}
    order by updated_at desc
    limit 1
  `;

  return rows[0] ? normalizeStoredState(rows[0].state) : null;
}

export const GET: APIRoute = async ({ url }) => {
  const username = url.searchParams.get("username")?.trim() || "";

  if (!username) {
    return json({ ok: false, error: "Username is required." }, 400);
  }

  const sql = getSql();

  try {
    const found = await findPublicProfileUserId(sql, username);

    if (!found) {
      return json({ ok: false, error: "Profile not found." }, 404);
    }

    const { userId, profileSettings } = found;

    const career =
      (await readUserPageState(sql, userId, PROFILE_PORTFOLIO_SOURCE_PAGE_KEY)) || {};
    const fitnessHistory =
      (await readUserPageState(sql, userId, "fitness-history")) || {};
    const profileStats =
      (await readUserPageState(sql, userId, "profile-stats")) || {};

    const normalizedUsername =
      stringValue(profileSettings?.username) ||
      stringValue(profileSettings?.handle).replace(/^@/, "");

    const portfolio = {
      about: publicItems(career?.about),
      projects: publicItems(career?.projects),
      school: publicItems(career?.school),
      experience: publicItems(career?.experience),
      stats: publicItems(career?.stats),
      timelineItems: publicItems(career?.timelineItems || career?.timeline),
      recommendations: publicItems(career?.recommendations),
      star: publicItems(career?.star),
      contact: publicItems(career?.contact),
      resume: publicItems(career?.resume),
    };

    const formattedStats = buildFormattedStats(profileSettings, fitnessHistory, profileStats);

    return json({
      ok: true,
      profile: {
        displayName: stringValue(profileSettings?.displayName) || username,
        username: normalizedUsername,
        handle: stringValue(profileSettings?.handle) || `@${normalizedUsername}`,
        bio: stringValue(profileSettings?.bio),
        bannerUrl: stringValue(profileSettings?.bannerUrl),
        avatarUrl: stringValue(profileSettings?.avatarUrl),
        headline: stringValue(profileSettings?.headline),
        location: stringValue(profileSettings?.location),
        badges: buildBadges(profileSettings, portfolio),
        stats: buildLegacyStats(career),
        formattedStats,
        statsDisplay: profileSettings?.statsDisplay,
        pinned: buildPinned(portfolio),
        portfolio,
        activity: buildActivity(portfolio),
        visibility: {
          stats: normalizeBoolean(profileSettings?.visibility?.stats, true),
          portfolio: normalizeBoolean(profileSettings?.visibility?.portfolio, true),
          activity: normalizeBoolean(profileSettings?.visibility?.activity, true),
          achievements: normalizeBoolean(profileSettings?.visibility?.achievements, true),
          contact: normalizeBoolean(profileSettings?.visibility?.contact, false),
          bio: normalizeBoolean(profileSettings?.visibility?.bio, true),
        },
        portfolioFilters:
          profileSettings?.portfolioFilters || DEFAULT_PROFILE_SETTINGS.portfolioFilters,
      },
    });
  } catch (error) {
    console.error("GET /api/profile/public failed:", error);
    return json({ ok: false, error: "Failed to load public profile." }, 500);
  } finally {
    await sql.end();
  }
};