import type { APIRoute } from "astro";
import { getSql } from "../../../lib/db";
import { getCurrentUser } from "../../../lib/auth";
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

function buildCardioMetricsFromSession(session: any) {
  const saved = safeObject(session?.metrics);

  const metrics: Array<{ key: string; label: string; value: number }> = [];

  const addMetric = (key: string, label: string, value: unknown) => {
    const num = Number(value);
    if (Number.isFinite(num) && num > 0) {
      metrics.push({ key, label, value: num });
    }
  };

  addMetric("distance", "Distance", saved?.totalDistance);
  addMetric("duration", "Duration", saved?.totalTimeMinutes);
  addMetric("pace", "Pace", saved?.averagePaceMinutes);

  addMetric("tempoDistance", "Tempo Distance", saved?.tempoDistance);
  addMetric("tempoDuration", "Tempo Duration", saved?.tempoTimeMinutes);

  addMetric("completedSplits", "Completed Splits", saved?.completedSplits);
  addMetric("completedSprints", "Completed Sprints", saved?.completedSprints);
  addMetric("completedIntervals", "Completed Intervals", saved?.completedIntervals);
  addMetric("completedCycles", "Completed Cycles", saved?.completedCycles);
  addMetric("completedHillReps", "Completed Hill Reps", saved?.completedHillReps);
  addMetric("completedPowerIntervals", "Completed Power Intervals", saved?.completedPowerIntervals);

  addMetric("sprintDistance", "Sprint Distance", saved?.totalSprintDistance);
  addMetric("sprintDuration", "Sprint Duration", saved?.totalSprintTimeMinutes);
  addMetric("hillDistance", "Hill Distance", saved?.totalHillDistance);

  addMetric("averageWatts", "Average Watts", saved?.averageWatts);
  addMetric("maxWatts", "Max Watts", saved?.maxWatts);
  addMetric("minWatts", "Min Watts", saved?.minWatts);

  addMetric("completionPercent", "Completion %", saved?.completionPercent);
  addMetric("heartRate", "Heart Rate", saved?.heartRate);
  addMetric("calories", "Calories", saved?.calories);
  addMetric("cadence", "Cadence", saved?.cadence);
  addMetric("elevationGain", "Elevation Gain", saved?.elevationGain);

  if (metrics.length) return metrics;

  for (const step of safeArray(session?.steps)) {
    metrics.push(...parseCardioMetricsFromStep(step));
  }

  return metrics;
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

function formatWorkoutAxisLabel(index: number, dateValue: unknown) {
  const dateLabel = formatDateShort(dateValue);
  return `Workout ${index + 1}${dateLabel ? ` - ${dateLabel}` : ""}`;
}

function roundToTwo(value: unknown) {
  const num = Number(value);
  return Number.isFinite(num) ? Number(num.toFixed(2)) : 0;
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
  if (combined.includes("steady") || combined.includes("easy")) return "steady";

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

function parseCardioMetricsFromStep(step: any) {
  const text = `${stringValue(step?.text)} ${stringValue(step?.target)} ${stringValue(step?.actual)}`.toLowerCase();
  const metrics: Array<{ key: string; label: string; value: number }> = [];

  const addMetric = (key: string, label: string, value: number) => {
    if (Number.isFinite(value) && value > 0) {
      metrics.push({ key, label, value });
    }
  };

  const decimalMatch = (regex: RegExp) => {
    const match = text.match(regex);
    return match ? Number(match[1]) : 0;
  };

  const paceMinSecMatch =
    text.match(/(\d+):(\d+)\s*(?:\/\s*(?:mi|mile|km)|per\s*(?:mi|mile|km))/) ||
    text.match(/pace\s*[:\-]?\s*(\d+):(\d+)/);

  if (paceMinSecMatch) {
    const mins = Number(paceMinSecMatch[1] || 0);
    const secs = Number(paceMinSecMatch[2] || 0);
    addMetric("pace", "Pace", mins + secs / 60);
  } else {
    const numericPace = decimalMatch(/pace\s*[:\-]?\s*(\d+(?:\.\d+)?)/);
    addMetric("pace", "Pace", numericPace);
  }

  const miles = decimalMatch(/(\d+(?:\.\d+)?)\s*(?:mi|mile|miles)\b/);
  const km = decimalMatch(/(\d+(?:\.\d+)?)\s*km\b/);

  if (miles) {
    addMetric("distance", "Distance", miles);
  } else if (km) {
    addMetric("distance", "Distance", km);
  }

  const durationHMS = text.match(/(\d+):(\d{2}):(\d{2})/);
  const durationMS = text.match(/(\d+):(\d{2})/);

  if (durationHMS) {
    const hours = Number(durationHMS[1] || 0);
    const minutes = Number(durationHMS[2] || 0);
    const seconds = Number(durationHMS[3] || 0);
    addMetric("duration", "Duration", hours * 60 + minutes + seconds / 60);
  } else {
    const explicitMinutes = decimalMatch(/(\d+(?:\.\d+)?)\s*(?:min|mins|minute|minutes)\b/);
    if (explicitMinutes) {
      addMetric("duration", "Duration", explicitMinutes);
    } else if (
      durationMS &&
      !text.includes("/mi") &&
      !text.includes("/mile") &&
      !text.includes("/km") &&
      !text.includes("pace")
    ) {
      const minutes = Number(durationMS[1] || 0);
      const seconds = Number(durationMS[2] || 0);
      addMetric("duration", "Duration", minutes + seconds / 60);
    }
  }

  const heartRate = decimalMatch(/(\d+(?:\.\d+)?)\s*(?:bpm)\b/);
  addMetric("heartRate", "Heart Rate", heartRate);
 

  const calories = decimalMatch(/(\d+(?:\.\d+)?)\s*(?:cal|kcal|calories)\b/);
  addMetric("calories", "Calories", calories);

  return metrics;
}

function getRangeStart(range: string) {
  const now = new Date();
  if (range === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (range === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (range === "6m") return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
  if (range === "1y") return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  return null;
}

function filterByRange<T extends { dateTime?: string; date?: string; updatedOn?: string }>(items: T[], range: string) {
  const start = getRangeStart(range);
  if (!start) return items;

  return items.filter((item) => {
    const raw = item.dateTime || item.date || item.updatedOn || "";
    const date = new Date(raw);
    return !Number.isNaN(date.getTime()) && date >= start;
  });
}

function getThisWeekCount(items: Array<{ dateTime?: string; date?: string }>) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  return items.filter((item) => {
    const raw = item.dateTime || item.date || "";
    const date = new Date(raw);
    return !Number.isNaN(date.getTime()) && date >= weekStart;
  }).length;
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
      ...defaults.statsDisplay,
      ...safeObject(raw?.statsDisplay),
      autoFormatted: normalizeBoolean(raw?.statsDisplay?.autoFormatted, true),
      showOverview: normalizeBoolean(raw?.statsDisplay?.showOverview, true),
      showSections: normalizeBoolean(raw?.statsDisplay?.showSections, true),
      showWorkouts: normalizeBoolean(raw?.statsDisplay?.showWorkouts, true),
      showCardio: normalizeBoolean(raw?.statsDisplay?.showCardio, true),
      showRecentSessions: normalizeBoolean(raw?.statsDisplay?.showRecentSessions, true),
      defaultRange: stringValue(raw?.statsDisplay?.defaultRange) || "30d",
      defaultSection: stringValue(raw?.statsDisplay?.defaultSection) || "all",
      defaultWorkout: stringValue(raw?.statsDisplay?.defaultWorkout) || "all",
      defaultCardioType: stringValue(raw?.statsDisplay?.defaultCardioType) || "all",
      defaultHobbyId: stringValue(raw?.statsDisplay?.defaultHobbyId) || "all",
      defaultHobbyStageId: stringValue(raw?.statsDisplay?.defaultHobbyStageId) || "all",
      featuredFitnessMetrics: safeArray(raw?.statsDisplay?.featuredFitnessMetrics),
      featuredCardioMetrics: safeArray(raw?.statsDisplay?.featuredCardioMetrics),
      featuredHobbyMetrics: safeArray(raw?.statsDisplay?.featuredHobbyMetrics),
      portfolioMode: stringValue(raw?.statsDisplay?.portfolioMode) === "full" ? "full" : "link",
    },
  };
}

function buildFitnessInteractive(fitnessHistory: any, profileStats: any) {
  const weightliftingSessions = safeArray(fitnessHistory?.weightliftingSessions);
  const cardioSessions = safeArray(fitnessHistory?.cardioSessions);
  const fitnessStats = safeObject(profileStats?.fitness);

  const sectionMap = new Map<string, { id: string; label: string; workouts: Map<string, any[]>; sessions: any[] }>();

  for (const session of weightliftingSessions) {
    const sectionId = classifySection(session?.groupTitle);
    const sectionLabel = stringValue(session?.groupTitle) || sectionId || "Workout";

    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, {
        id: sectionId,
        label: sectionLabel,
        workouts: new Map(),
        sessions: [],
      });
    }

    const section = sectionMap.get(sectionId)!;
    section.sessions.push(session);

    for (const exercise of safeArray(session?.exercises)) {
      const name = stringValue(exercise?.exerciseName) || "Exercise";
      if (!section.workouts.has(name)) {
        section.workouts.set(name, []);
      }

      const weight = parseWeight(exercise?.actual?.weight || exercise?.target?.weight);
      const reps = parseReps(exercise?.actual?.reps || exercise?.target?.reps);
      const sets =
        estimateSetCount(exercise?.actual?.reps) ||
        parseWeight(exercise?.actual?.sets || exercise?.target?.sets) ||
        1;
      const volume = weight * Math.max(reps, 1);

      section.workouts.get(name)!.push({
        date: session?.dateTime || "",
        weight,
        reps,
        sets,
        volume,
      });
    }
  }

  const sections = Array.from(sectionMap.values()).map((section) => {
    const workoutOptions = Array.from(section.workouts.keys()).sort();

    const workouts = workoutOptions.map((workoutName) => {
      const points = safeArray(section.workouts.get(workoutName)).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const first = points[0];
      const last = points[points.length - 1];

      return {
        id: slugify(workoutName),
        name: workoutName,
        trendSummary:
          first && last
            ? {
                weightChange: Number((last.weight - first.weight).toFixed(2)),
                repChange: Number((last.reps - first.reps).toFixed(2)),
                volumeChange: Number((last.volume - first.volume).toFixed(2)),
                firstWeight: first.weight,
                lastWeight: last.weight,
                firstReps: first.reps,
                lastReps: last.reps,
                firstVolume: first.volume,
                lastVolume: last.volume,
              }
            : {
                weightChange: 0,
                repChange: 0,
                volumeChange: 0,
                firstWeight: 0,
                lastWeight: 0,
                firstReps: 0,
                lastReps: 0,
                firstVolume: 0,
                lastVolume: 0,
              },
        chartSeries: {
          weight: points.map((p, index) => ({ x: formatWorkoutAxisLabel(index, p.date), y: roundToTwo(p.weight) })),
          reps: points.map((p, index) => ({ x: formatWorkoutAxisLabel(index, p.date), y: roundToTwo(p.reps) })),
          volume: points.map((p, index) => ({ x: formatWorkoutAxisLabel(index, p.date), y: roundToTwo(p.volume) })),
        },
      };
    });

    const sectionSessionsSorted = safeArray(section.sessions).sort(
      (a, b) => new Date(b?.dateTime || 0).getTime() - new Date(a?.dateTime || 0).getTime()
    );

    return {
      id: section.id,
      label: section.label,
      workoutOptions,
      workouts,
      summaryByRange: {
        "7d": {
          totalSessions: filterByRange(section.sessions, "7d").length,
          workoutsThisWeek: getThisWeekCount(section.sessions),
        },
        "30d": {
          totalSessions: filterByRange(section.sessions, "30d").length,
          workoutsThisWeek: getThisWeekCount(section.sessions),
        },
        "90d": {
          totalSessions: filterByRange(section.sessions, "90d").length,
          workoutsThisWeek: getThisWeekCount(section.sessions),
        },
        "6m": {
          totalSessions: filterByRange(section.sessions, "6m").length,
          workoutsThisWeek: getThisWeekCount(section.sessions),
        },
        "1y": {
          totalSessions: filterByRange(section.sessions, "1y").length,
          workoutsThisWeek: getThisWeekCount(section.sessions),
        },
        all: {
          totalSessions: section.sessions.length,
          workoutsThisWeek: getThisWeekCount(section.sessions),
        },
      },
      recentSessions: sectionSessionsSorted.slice(0, 5).map((session) => ({
        title: stringValue(session?.groupTitle) || "Workout",
        date: formatDateTime(session?.dateTime),
        summary: `${safeArray(session?.exercises).length} exercise(s)`,
      })),
    };
  });

  const cardioTypeMap = new Map<string, { id: string; label: string; sessions: any[]; metricBuckets: Map<string, any[]> }>();

  for (const session of cardioSessions) {
    const type = classifyCardioType(session?.workoutType, session?.title);
    const label = stringValue(session?.workoutType) || stringValue(session?.title) || "Cardio";

    if (!cardioTypeMap.has(type)) {
      cardioTypeMap.set(type, {
        id: type,
        label,
        sessions: [],
        metricBuckets: new Map(),
      });
    }

    const entry = cardioTypeMap.get(type)!;
    entry.sessions.push(session);

    const metrics = buildCardioMetricsFromSession(session);

    for (const metric of metrics) {
      if (!entry.metricBuckets.has(metric.key)) {
        entry.metricBuckets.set(metric.key, []);
      }

      entry.metricBuckets.get(metric.key)!.push({
        date: session?.dateTime || "",
        value: metric.value,
        label: metric.label,
      });
    }
  }

  const cardioTypes = Array.from(cardioTypeMap.values()).map((entry) => {
    const metrics = Array.from(entry.metricBuckets.entries()).map(([key, values]) => ({
      key,
      label: values[0]?.label || key,
      chartSeries: values
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((item) => ({
          x: formatDateShort(item.date),
          y: item.value,
        })),
    }));

    return {
      id: entry.id,
      label: entry.label,
      metrics,
      summaryByRange: {
        "7d": {
          totalSessions: filterByRange(entry.sessions, "7d").length,
          workoutsThisWeek: getThisWeekCount(entry.sessions),
        },
        "30d": {
          totalSessions: filterByRange(entry.sessions, "30d").length,
          workoutsThisWeek: getThisWeekCount(entry.sessions),
        },
        "90d": {
          totalSessions: filterByRange(entry.sessions, "90d").length,
          workoutsThisWeek: getThisWeekCount(entry.sessions),
        },
        "6m": {
          totalSessions: filterByRange(entry.sessions, "6m").length,
          workoutsThisWeek: getThisWeekCount(entry.sessions),
        },
        "1y": {
          totalSessions: filterByRange(entry.sessions, "1y").length,
          workoutsThisWeek: getThisWeekCount(entry.sessions),
        },
        all: {
          totalSessions: entry.sessions.length,
          workoutsThisWeek: getThisWeekCount(entry.sessions),
        },
      },
      recentSessions: entry.sessions
        .sort((a, b) => new Date(b?.dateTime || 0).getTime() - new Date(a?.dateTime || 0).getTime())
        .slice(0, 5)
        .map((session) => ({
          title: stringValue(session?.title) || stringValue(session?.workoutType) || "Cardio",
          date: formatDateTime(session?.dateTime),
          summary: `${safeArray(session?.steps).length} step(s)`,
        })),
    };
  });

  return {
    overviewCards: [
      createMetricCard("Total Workouts", String(roundToTwo(weightliftingSessions.length)), "Saved lifting sessions"),
      createMetricCard("Total Cardio", String(roundToTwo(cardioSessions.length)), "Saved cardio sessions"),
      createMetricCard(
        "Last Workout",
        fitnessStats?.lastWorkoutAt ? formatDateShort(fitnessStats.lastWorkoutAt) : "—",
        "Most recent saved session"
      ),
    ],
    sections,
    cardioTypes,
  };
}

function buildHobbyInteractive(profileStats: any, hobbiesState: any) {
  const hobbies = safeArray(hobbiesState?.hobbies);

  return {
    overviewCards: [
      createMetricCard("Hobbies", String(numberValue(profileStats?.hobbies?.totalHobbies)), "Tracked hobbies"),
      createMetricCard("Completed Stages", String(numberValue(profileStats?.hobbies?.completedStages)), "Finished stages"),
      createMetricCard("Hours Spent", String(numberValue(profileStats?.hobbies?.totalHoursSpent)), "Logged hours"),
    ],
    weeklySummary: {
      activeHobbies: hobbies.filter((h) => h?.status === "Active").length,
      updatesThisWeek: hobbies.reduce((sum, hobby) => sum + filterByRange(safeArray(hobby?.activityLog), "7d").length, 0),
      stageProgressThisWeek: hobbies.reduce(
        (sum, hobby) => sum + safeArray(hobby?.stages).reduce((inner, stage) => inner + numberValue(stage?.progress, 0), 0),
        0
      ),
    },
    hobbies: hobbies.map((hobby) => ({
      id: hobby?.id || slugify(hobby?.name),
      name: hobby?.name || "Hobby",
      status: hobby?.status || "Active",
      overallProgress:
        safeArray(hobby?.stages).length > 0
          ? Math.round(
              safeArray(hobby?.stages).reduce((sum, stage) => sum + numberValue(stage?.progress, 0), 0) /
                safeArray(hobby?.stages).length
            )
          : 0,
      stages: safeArray(hobby?.stages).map((stage) => ({
        id: stage?.id || slugify(stage?.name),
        name: stage?.name || "Stage",
        description: stage?.description || "",
        progress: numberValue(stage?.progress),
        status: stage?.status || "Not Started",
        targetDate: stage?.targetDate || "",
        update: stage?.update || "",
      })),
      recentLogs: safeArray(hobby?.activityLog)
        .sort((a, b) => new Date(b?.date || 0).getTime() - new Date(a?.date || 0).getTime())
        .slice(0, 5),
    })),
  };
}

async function findPublicProfileUserId(sql: ReturnType<typeof getSql>, username: string) {
  const rows = await sql<{ user_id: string; state: unknown; updated_at: string }[]>`
    select distinct on (user_id) user_id, state, updated_at
    from page_state
    where page_key = ${PROFILE_SETTINGS_PAGE_KEY}
    order by user_id, updated_at desc
  `;

  const wanted = username.trim().toLowerCase();

  for (const row of rows) {
    const rawState = normalizeStoredState(row.state);
    const state = normalizeProfileSettings(rawState);
    const savedUsername = stringValue(state?.username).trim().toLowerCase();
    const savedHandle = stringValue(state?.handle).replace(/^@/, "").trim().toLowerCase();

    if (savedUsername === wanted || savedHandle === wanted) {
      return {
        userId: row.user_id,
        profileSettings: state,
      };
    }
  }

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

export const GET: APIRoute = async ({ url, cookies }) => {
  const username = url.searchParams.get("username")?.trim() || "";
  const preview = url.searchParams.get("preview") === "1";

  const sql = getSql();

  try {
    let userId = "";
    let profileSettings: any = null;

    if (preview) {
      const user = await getCurrentUser(cookies);
      if (!user) return json({ ok: false, error: "Unauthorized" }, 401);

      userId = user.id;
      const rawSettings = await readUserPageState(sql, userId, PROFILE_SETTINGS_PAGE_KEY);
      profileSettings = normalizeProfileSettings(rawSettings || {});
    } else {
      if (!username) {
        return json({ ok: false, error: "Username is required." }, 400);
      }

      const found = await findPublicProfileUserId(sql, username);
      if (!found) {
        return json({ ok: false, error: "Profile not found." }, 404);
      }

      userId = found.userId;
      profileSettings = found.profileSettings;
    }

    const career =
      (await readUserPageState(sql, userId, PROFILE_PORTFOLIO_SOURCE_PAGE_KEY)) || {};
    const fitnessHistory =
      (await readUserPageState(sql, userId, "fitness-history")) || {};
    const profileStats =
      (await readUserPageState(sql, userId, "profile-stats")) || {};
    const hobbiesState =
      (await readUserPageState(sql, userId, "hobbies")) || {};

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

    const fitnessInteractive = buildFitnessInteractive(fitnessHistory, profileStats);
    const hobbyInteractive = buildHobbyInteractive(profileStats, hobbiesState);

    return json({
      ok: true,
      profile: {
        displayName: stringValue(profileSettings?.displayName) || normalizedUsername || username,
        username: normalizedUsername,
        handle: stringValue(profileSettings?.handle) || `@${normalizedUsername}`,
        bio: stringValue(profileSettings?.bio),
        bannerUrl: stringValue(profileSettings?.bannerUrl),
        avatarUrl: stringValue(profileSettings?.avatarUrl),
        headline: stringValue(profileSettings?.headline),
        location: stringValue(profileSettings?.location),
        badges: buildBadges(profileSettings, portfolio),
        stats: buildLegacyStats(career),
        pinned: buildPinned(portfolio),
        activity: buildActivity(portfolio),
        visibility: {
          stats: normalizeBoolean(profileSettings?.visibility?.stats, true),
          portfolio: normalizeBoolean(profileSettings?.visibility?.portfolio, true),
          activity: normalizeBoolean(profileSettings?.visibility?.activity, true),
          achievements: normalizeBoolean(profileSettings?.visibility?.achievements, true),
          contact: normalizeBoolean(profileSettings?.visibility?.contact, false),
          bio: normalizeBoolean(profileSettings?.visibility?.bio, true),
        },
        displayConfig: profileSettings?.statsDisplay || DEFAULT_PROFILE_SETTINGS.statsDisplay,
        interactiveData: {
          fitness: fitnessInteractive,
          hobbies: hobbyInteractive,
        },
        portfolioLink: `/career/portfolio`,
        portfolioMode: profileSettings?.statsDisplay?.portfolioMode || "link",
        portfolio,
      },
    });
  } catch (error) {
    console.error("GET /api/profile/public failed:", error);
    return json({ ok: false, error: "Failed to load public profile." }, 500);
  } finally {
    await sql.end();
  }
};

