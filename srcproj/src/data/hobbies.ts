export type StageStatus = "Not Started" | "In Progress" | "Done" | "Completed";
export type HobbyStatus = "Active" | "Paused" | "Completed" | "Dropped";
export type HobbyCategory =
  | "Creative"
  | "Fitness"
  | "Learning"
  | "Collecting"
  | "Other";

export type HobbyEvidenceType = "Text" | "File" | "Link";

export interface HobbyStage {
  id: string;
  name: string;
  description: string;
  status: StageStatus;
  progress: number;
  targetDate: string;
  update: string;
  evidenceType?: HobbyEvidenceType;
  evidenceValue?: string;
  updatedOn: string;
}

export interface HobbyMilestone {
  id: string;
  title: string;
  date: string;
}

export interface HobbyLog {
  id: string;
  date: string;
  text: string;
  stageId: string;
}

export interface HobbyLibraryItem {
  id: string;
  title: string;
  type: "book" | "song" | "course" | "project" | "custom";
  stageId: string;
  status: "Active" | "Paused" | "Completed";
  notes: string;
  updatedOn: string;
  progress: {
    current: number;
    target: number;
    unit: string;
  };
}

export interface HobbyItem {
  id: string;
  name: string;
  category: HobbyCategory;
  status: HobbyStatus;
  hoursSpent: number;
  startedOn: string;
  updatedOn: string;
  motivation: string;
  notes: string;
  favorite?: boolean;
  stages: HobbyStage[];
  library: HobbyLibraryItem[];
  milestones: HobbyMilestone[];
  activityLog: HobbyLog[];
}

export const hobbies: HobbyItem[] = [
  {
    id: "drumming",
    name: "Drumming",
    category: "Creative",
    status: "Active",
    hoursSpent: 72,
    startedOn: "2025-08-10",
    updatedOn: "2026-03-10",
    motivation:
      "Build rhythm, coordination, and creative consistency while having a strong outlet.",
    notes:
      "Best progress happens when practice is short, focused, and consistent.",
    favorite: true,
    stages: [
      {
        id: "drumming-stick-control-basics",
        name: "Stick Control Basics",
        description: "Build hand control, timing, and consistency.",
        status: "Done",
        progress: 100,
        targetDate: "2025-10-01",
        update: "Basic rudiments feel much smoother and more natural now.",
        evidenceType: "Text",
        evidenceValue: "Can stay relaxed and keep cleaner tempo during drills.",
        updatedOn: "2025-10-02",
      },
      {
        id: "drumming-groove-practice",
        name: "Groove Practice",
        description: "Lock in steady grooves without tensing up.",
        status: "In Progress",
        progress: 65,
        targetDate: "2026-04-01",
        update: "4/4 grooves feel better; transitions still need work.",
        evidenceType: "Link",
        evidenceValue: "https://example.com/drumming-practice",
        updatedOn: "2026-03-10",
      },
      {
        id: "drumming-play-full-song-cleanly",
        name: "Play Full Song Cleanly",
        description: "Play through an entire song with timing and confidence.",
        status: "Not Started",
        progress: 20,
        targetDate: "2026-05-15",
        update: "Need more endurance and cleaner fills.",
        evidenceType: "Text",
        evidenceValue: "Song choice still being finalized.",
        updatedOn: "2026-03-08",
      },
    ],
    library: [
      {
        id: "drumming-library-groove-guide",
        title: "Groove Practice Guide",
        type: "course",
        stageId: "drumming-groove-practice",
        status: "Active",
        notes: "Use for timing drills and groove transitions.",
        updatedOn: "2026-03-10",
        progress: {
          current: 6,
          target: 12,
          unit: "lessons",
        },
      },
    ],
    milestones: [
      {
        id: "drumming-milestone-first-month",
        title: "Completed first month of consistent practice",
        date: "2025-09-15",
      },
      {
        id: "drumming-milestone-groove-session",
        title: "Held tempo through full groove session",
        date: "2026-02-28",
      },
    ],
    activityLog: [
      {
        id: "drumming-log-2026-03-10",
        date: "2026-03-10",
        text: "Practiced groove timing and transitions.",
        stageId: "drumming-groove-practice",
      },
      {
        id: "drumming-log-2026-03-06",
        date: "2026-03-06",
        text: "Focused on rudiments for 25 minutes.",
        stageId: "drumming-stick-control-basics",
      },
      {
        id: "drumming-log-2026-03-01",
        date: "2026-03-01",
        text: "Reviewed sticking control and posture.",
        stageId: "drumming-stick-control-basics",
      },
    ],
  },

  {
    id: "juggling",
    name: "Juggling",
    category: "Fitness",
    status: "Active",
    hoursSpent: 31,
    startedOn: "2025-11-01",
    updatedOn: "2026-03-12",
    motivation:
      "Improve coordination, patience, and focus through repetition.",
    notes:
      "This is a good hobby for quick practice blocks and keeping the mind sharp.",
    favorite: false,
    stages: [
      {
        id: "juggling-two-ball-control",
        name: "Two Ball Control",
        description: "Make motion smooth and repeatable.",
        status: "Done",
        progress: 100,
        targetDate: "2025-11-20",
        update: "Comfortable and easy now.",
        evidenceType: "Text",
        evidenceValue: "No issue with rhythm at this level.",
        updatedOn: "2025-11-18",
      },
      {
        id: "juggling-three-ball-cascade",
        name: "Three Ball Cascade",
        description: "Build a consistent cascade pattern.",
        status: "In Progress",
        progress: 58,
        targetDate: "2026-04-10",
        update: "Getting longer streaks before losing control.",
        evidenceType: "Text",
        evidenceValue: "Best streak so far feels much cleaner.",
        updatedOn: "2026-03-12",
      },
      {
        id: "juggling-one-minute-continuous",
        name: "One Minute Continuous",
        description: "Sustain control without panic or rushing.",
        status: "Not Started",
        progress: 15,
        targetDate: "2026-05-20",
        update: "Need more relaxed catches and better rhythm.",
        evidenceType: "Text",
        evidenceValue: "Still inconsistent under pressure.",
        updatedOn: "2026-03-11",
      },
    ],
    library: [
      {
        id: "juggling-library-cascade-drills",
        title: "Cascade Drill Notes",
        type: "custom",
        stageId: "juggling-three-ball-cascade",
        status: "Active",
        notes: "Quick reminders for rhythm and release height.",
        updatedOn: "2026-03-12",
        progress: {
          current: 4,
          target: 10,
          unit: "drills",
        },
      },
    ],
    milestones: [
      {
        id: "juggling-milestone-20-second-cascade",
        title: "First clean 20-second cascade",
        date: "2026-02-14",
      },
    ],
    activityLog: [
      {
        id: "juggling-log-2026-03-12",
        date: "2026-03-12",
        text: "Worked on smoother three-ball rhythm.",
        stageId: "juggling-three-ball-cascade",
      },
      {
        id: "juggling-log-2026-03-09",
        date: "2026-03-09",
        text: "Practiced catches and reset timing.",
        stageId: "juggling-three-ball-cascade",
      },
    ],
  },

  {
    id: "reading",
    name: "Reading",
    category: "Learning",
    status: "Active",
    hoursSpent: 54,
    startedOn: "2025-09-01",
    updatedOn: "2026-03-14",
    motivation:
      "Read more consistently to improve reflection, focus, and thinking.",
    notes:
      "Reading works best at night or after workouts when the phone is away.",
    favorite: true,
    stages: [
      {
        id: "reading-daily-reading-habit",
        name: "Daily Reading Habit",
        description: "Build consistency first, even with short sessions.",
        status: "Done",
        progress: 100,
        targetDate: "2025-10-15",
        update: "Night reading habit is much better now.",
        evidenceType: "Text",
        evidenceValue: "15–20 minutes feels sustainable.",
        updatedOn: "2025-10-15",
      },
      {
        id: "reading-finish-current-book",
        name: "Finish Current Book",
        description: "Read through current book with notes and retention.",
        status: "In Progress",
        progress: 72,
        targetDate: "2026-03-30",
        update: "Good momentum and stronger retention when I annotate.",
        evidenceType: "Text",
        evidenceValue: "Chapters are getting more reflective.",
        updatedOn: "2026-03-14",
      },
      {
        id: "reading-notes-archive",
        name: "Reading Notes Archive",
        description: "Track takeaways and favorite quotes.",
        status: "In Progress",
        progress: 40,
        targetDate: "2026-04-20",
        update: "Started capturing better notes after each session.",
        evidenceType: "Link",
        evidenceValue: "https://example.com/reading-notes",
        updatedOn: "2026-03-13",
      },
    ],
    library: [
      {
        id: "reading-library-current-book",
        title: "Current Book",
        type: "book",
        stageId: "reading-finish-current-book",
        status: "Active",
        notes: "Annotate key sections and summarize after each session.",
        updatedOn: "2026-03-14",
        progress: {
          current: 216,
          target: 300,
          unit: "pages",
        },
      },
      {
        id: "reading-library-notes-system",
        title: "Reading Notes System",
        type: "project",
        stageId: "reading-notes-archive",
        status: "Active",
        notes: "Capture quotes, takeaways, and short reflections.",
        updatedOn: "2026-03-13",
        progress: {
          current: 4,
          target: 10,
          unit: "entries",
        },
      },
    ],
    milestones: [
      {
        id: "reading-milestone-first-book",
        title: "Finished first full book of the cycle",
        date: "2025-12-21",
      },
      {
        id: "reading-milestone-nightly-streak",
        title: "Built nightly reading streak",
        date: "2026-01-15",
      },
    ],
    activityLog: [
      {
        id: "reading-log-2026-03-14",
        date: "2026-03-14",
        text: "Read 22 pages and noted two strong takeaways.",
        stageId: "reading-finish-current-book",
      },
      {
        id: "reading-log-2026-03-11",
        date: "2026-03-11",
        text: "Night reading session felt focused and calm.",
        stageId: "reading-daily-reading-habit",
      },
    ],
  },

  {
    id: "writing",
    name: "Writing / Communication",
    category: "Learning",
    status: "Paused",
    hoursSpent: 18,
    startedOn: "2025-10-05",
    updatedOn: "2026-03-05",
    motivation:
      "Become clearer, more persuasive, and more intentional in expression.",
    notes:
      "This should connect to technical writing, journaling, and clearer communication.",
    favorite: false,
    stages: [
      {
        id: "writing-daily-short-writing",
        name: "Daily Short Writing",
        description: "Write short reflections or summaries consistently.",
        status: "In Progress",
        progress: 45,
        targetDate: "2026-04-01",
        update: "Journaling is more consistent than formal writing.",
        evidenceType: "Text",
        evidenceValue: "Need a better prompt system.",
        updatedOn: "2026-03-05",
      },
      {
        id: "writing-technical-writing-samples",
        name: "Technical Writing Samples",
        description: "Create stronger structured writing examples.",
        status: "Not Started",
        progress: 10,
        targetDate: "2026-05-10",
        update: "Need to choose 2–3 project topics first.",
        evidenceType: "Text",
        evidenceValue: "Will tie into career portfolio later.",
        updatedOn: "2026-03-03",
      },
    ],
    library: [
      {
        id: "writing-library-journal-prompts",
        title: "Journal Prompt List",
        type: "custom",
        stageId: "writing-daily-short-writing",
        status: "Paused",
        notes: "Use when restarting regular writing blocks.",
        updatedOn: "2026-03-05",
        progress: {
          current: 8,
          target: 20,
          unit: "prompts",
        },
      },
    ],
    milestones: [
      {
        id: "writing-milestone-started-habit",
        title: "Started structured writing habit",
        date: "2025-11-02",
      },
    ],
    activityLog: [
      {
        id: "writing-log-2026-03-05",
        date: "2026-03-05",
        text: "Paused formal writing focus to prioritize schoolwork.",
        stageId: "writing-daily-short-writing",
      },
    ],
  },
];

export const hobbyFilters = [
  "All",
  "Active",
  "Paused",
  "Completed",
  "Dropped",
  "Favorites",
] as const;

export type HobbyFilter = (typeof hobbyFilters)[number];

export function getOverallProgress(stages: HobbyStage[]) {
  if (!stages.length) return 0;
  const total = stages.reduce((sum, stage) => sum + Number(stage.progress || 0), 0);
  return Math.round(total / stages.length);
}

export function getCurrentStage(stages: HobbyStage[]) {
  const inProgress = stages.find((stage) => stage.status === "In Progress");
  if (inProgress) return inProgress.name;

  const nextUp = stages.find((stage) => stage.status === "Not Started");
  if (nextUp) return nextUp.name;

  return stages[stages.length - 1]?.name ?? "No stages yet";
}