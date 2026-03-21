export const PROFILE_SETTINGS_PAGE_KEY = "profile-settings";
export const PROFILE_PORTFOLIO_SOURCE_PAGE_KEY = "career-information";
export const PROFILE_PUBLIC_ACTIVITY_LIMIT = 6;

export const PROFILE_STAT_SECTIONS = [
  "fitness",
  "career",
  "mind",
  "education",
  "work",
  "nutrition",
  "hobbies",
] as const;

export const PROFILE_PORTFOLIO_CATEGORIES = [
  "all",
  "projects",
  "experience",
  "school",
  "stats",
  "timeline",
  "recommendations",
  "star",
] as const;

export const PROFILE_THEME_OPTIONS = ["system", "light", "dark"] as const;
export const PROFILE_TEXT_SIZE_OPTIONS = ["sm", "md", "lg", "xl"] as const;
export const PROFILE_TIME_RANGE_OPTIONS = ["7d", "30d", "90d", "6m", "1y", "all"] as const;

export const PROFILE_UI_SCOPE_OPTIONS = ["global", "page"] as const;
export const PROFILE_SURFACE_TEXTURE_OPTIONS = [
  "solid",
  "gradient",
  "checkered",
  "smoothed",
  "matte",
] as const;

export type ProfileThemeMode = (typeof PROFILE_THEME_OPTIONS)[number];
export type ProfileTextSize = (typeof PROFILE_TEXT_SIZE_OPTIONS)[number];
export type ProfileStatSection = (typeof PROFILE_STAT_SECTIONS)[number];
export type ProfileTimeRange = (typeof PROFILE_TIME_RANGE_OPTIONS)[number];
export type ProfileUiScope = (typeof PROFILE_UI_SCOPE_OPTIONS)[number];
export type ProfileSurfaceTexture = (typeof PROFILE_SURFACE_TEXTURE_OPTIONS)[number];

export type ProfileBadge = {
  id: string;
  label: string;
  icon?: string;
};

export type ProfileVisibilitySettings = {
  profile: boolean;
  bio: boolean;
  stats: boolean;
  portfolio: boolean;
  activity: boolean;
  achievements: boolean;
  contact: boolean;
};

export type ProfilePortfolioFilters = {
  showProjects: boolean;
  showExperience: boolean;
  showSchool: boolean;
  showStats: boolean;
  showTimeline: boolean;
  showRecommendations: boolean;
  showStar: boolean;
};

export type ProfileStatsSources = Record<ProfileStatSection, boolean>;

export type ProfileNotifications = {
  email: boolean;
  push: boolean;
  product: boolean;
  reminders: boolean;
  marketing: boolean;
};

export type ProfileSurfaceSettings = {
  color: string;
  texture: ProfileSurfaceTexture;
};

export type ProfileThemeSettings = {
  scope: ProfileUiScope;
  mode: ProfileThemeMode;
  textSize: ProfileTextSize;
  surfaces: {
    header: ProfileSurfaceSettings;
    section: ProfileSurfaceSettings;
    background: ProfileSurfaceSettings;
    dropdown: ProfileSurfaceSettings;
  };
};

export type ProfileStatsDisplaySettings = {
  autoFormatted: boolean;
  showOverview: boolean;
  showSections: boolean;
  showWorkouts: boolean;
  showCardio: boolean;
  showRecentSessions: boolean;
  defaultRange: ProfileTimeRange;
  defaultSection: string;
  defaultWorkout: string;
  defaultCardioType: string;
  defaultHobbyId: string;
  defaultHobbyStageId: string;
  featuredFitnessMetrics: string[];
  featuredCardioMetrics: string[];
  featuredHobbyMetrics: string[];
  portfolioMode: "link" | "full";
};

export type ProfileSettings = {
  displayName: string;
  username: string;
  handle: string;
  bio: string;
  bannerUrl: string;
  avatarUrl: string;
  location: string;
  headline: string;
  pinnedItemIds: string[];
  badges: ProfileBadge[];
  featuredStatIds: string[];
  visibility: ProfileVisibilitySettings;
  portfolioFilters: ProfilePortfolioFilters;
  statsSources: ProfileStatsSources;
  statsDisplay: ProfileStatsDisplaySettings;
  notifications: ProfileNotifications;
  theme: ProfileThemeSettings;
};

export const DEFAULT_PROFILE_SETTINGS: ProfileSettings = {
  displayName: "",
  username: "",
  handle: "",
  bio: "",
  bannerUrl: "",
  avatarUrl: "",
  location: "",
  headline: "",
  pinnedItemIds: [],
  badges: [],
  featuredStatIds: [],
  visibility: {
    profile: true,
    bio: true,
    stats: true,
    portfolio: true,
    activity: true,
    achievements: true,
    contact: false,
  },
  portfolioFilters: {
    showProjects: true,
    showExperience: true,
    showSchool: true,
    showStats: true,
    showTimeline: true,
    showRecommendations: true,
    showStar: true,
  },
  statsSources: {
    fitness: true,
    career: true,
    mind: true,
    education: false,
    work: false,
    nutrition: false,
    hobbies: false,
  },
  statsDisplay: {
    autoFormatted: true,
    showOverview: true,
    showSections: true,
    showWorkouts: true,
    showCardio: true,
    showRecentSessions: true,
    defaultRange: "30d",
    defaultSection: "all",
    defaultWorkout: "all",
    defaultCardioType: "all",
    defaultHobbyId: "all",
    defaultHobbyStageId: "all",
    featuredFitnessMetrics: ["totalWorkouts", "totalVolume", "avgWeight", "avgReps"],
    featuredCardioMetrics: ["totalSessions", "completionRate", "favoriteWorkoutType", "plannedSteps"],
    featuredHobbyMetrics: ["totalHobbies", "completedStages", "totalHoursSpent"],
    portfolioMode: "link",
  },
  notifications: {
    email: true,
    push: true,
    product: true,
    reminders: true,
    marketing: false,
  },
  theme: {
    scope: "global",
    mode: "system",
    textSize: "md",
    surfaces: {
      header: {
        color: "#ffffff",
        texture: "solid",
      },
      section: {
        color: "#ffffff",
        texture: "solid",
      },
      background: {
        color: "#ffffff",
        texture: "solid",
      },
      dropdown: {
        color: "#ffffff",
        texture: "solid",
      },
    },
  },
};

export function cloneDefaultProfileSettings(): ProfileSettings {
  return JSON.parse(JSON.stringify(DEFAULT_PROFILE_SETTINGS));
}