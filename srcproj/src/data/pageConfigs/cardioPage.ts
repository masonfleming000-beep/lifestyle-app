import type { EditableCollectionControllerSection } from "../../lib/client/editableCollections";
import type { ConfigDrivenPage } from "../../types/ui";
import {
  cardioGoals,
  cardioRules,
  cooldown,
  defaultStravaEmbed,
  recentSessions,
  warmup,
} from "../cardio";

export const cardioPageConfig: ConfigDrivenPage = {
  meta: {
    title: "Cardio | Lifestyle App",
    description: "Cardio dashboard",
  },
  hero: {
    kicker: "Cardio",
    title: "Build endurance with structure.",
    description:
      "A cleaner cardio page with your Strava feed, goals, rules, and saved warm-up / cool-down checklists.",
  },
  sections: [
    {
      kind: "target",
      key: "cardio-strava",
      title: "Strava",
      subtitle: "Latest activity snapshot.",
      surface: "card",
      containerId: "cardio-strava-container",
      bodyClass: "declarative-target-content",
    },
    {
      kind: "actions",
      key: "cardio-actions",
      actions: [
        {
          label: "Build Workout",
          href: "/cardio/workouts",
          variant: "primary",
        },
      ],
    },
    {
      kind: "target",
      key: "cardio-recent-sessions",
      kicker: "Cardio",
      title: "Recent Sessions",
      subtitle: "Saved cardio workouts from your workout builder.",
      surface: "expandable",
      open: false,
      containerId: "cardio-saved-sessions",
      bodyClass: "declarative-target-content",
    },
    {
      kind: "group",
      key: "cardio-text-sections",
      columns: 2,
      children: [
        {
          kind: "editable-collection",
          key: "cardio-rules",
          kicker: "Cardio",
          title: "Rules",
          surface: "expandable",
          open: false,
          mode: "list",
          listId: "cardio-rules-list",
          editButtonId: "cardio-rules-edit-btn",
          emptyText: "No cardio rules yet.",
        },
        {
          kind: "editable-collection",
          key: "cardio-goals",
          kicker: "Cardio",
          title: "Goals",
          surface: "expandable",
          open: false,
          mode: "list",
          listId: "cardio-goals-list",
          editButtonId: "cardio-goals-edit-btn",
          emptyText: "No cardio goals yet.",
        },
      ],
    },
    {
      kind: "group",
      key: "cardio-checklists",
      columns: 2,
      children: [
        {
          kind: "editable-collection",
          key: "cardio-warmup",
          kicker: "Checklist",
          title: "Warm Up",
          surface: "expandable",
          open: false,
          mode: "checklist",
          listId: "cardio-warmup-list",
          editButtonId: "cardio-warmup-edit-btn",
          emptyText: "No warm-up items yet.",
        },
        {
          kind: "editable-collection",
          key: "cardio-cooldown",
          kicker: "Checklist",
          title: "Cool Down",
          surface: "expandable",
          open: false,
          mode: "checklist",
          listId: "cardio-cooldown-list",
          editButtonId: "cardio-cooldown-edit-btn",
          emptyText: "No cool-down items yet.",
        },
      ],
    },
  ],
};

export const cardioEditableSections: EditableCollectionControllerSection[] = [
  {
    key: "rules",
    mode: "list",
    listId: "cardio-rules-list",
    editButtonId: "cardio-rules-edit-btn",
    defaults: [...cardioRules],
  },
  {
    key: "goals",
    mode: "list",
    listId: "cardio-goals-list",
    editButtonId: "cardio-goals-edit-btn",
    defaults: [...cardioGoals],
  },
  {
    key: "warmup",
    mode: "checklist",
    listId: "cardio-warmup-list",
    editButtonId: "cardio-warmup-edit-btn",
    defaults: [...warmup],
  },
  {
    key: "cooldown",
    mode: "checklist",
    listId: "cardio-cooldown-list",
    editButtonId: "cardio-cooldown-edit-btn",
    defaults: [...cooldown],
  },
];

export const cardioPageClientConfig = {
  pageKey: "cardio",
  defaults: {
    stravaEmbed: defaultStravaEmbed || "",
    collections: {
      rules: {
        items: [...cardioRules],
        removedDefaults: [],
      },
      goals: {
        items: [...cardioGoals],
        removedDefaults: [],
      },
      warmup: {
        items: warmup.map((text) => ({ text, done: false })),
        removedDefaults: [],
      },
      cooldown: {
        items: cooldown.map((text) => ({ text, done: false })),
        removedDefaults: [],
      },
    },
  },
  sections: cardioEditableSections,
  stravaContainerId: "cardio-strava-container",
  savedSessionsContainerId: "cardio-saved-sessions",
  fitnessHistoryPageKey: "fitness-history",
  profileStatsPageKey: "profile-stats",
  fallbackRecentSessions: recentSessions,
} as const;
