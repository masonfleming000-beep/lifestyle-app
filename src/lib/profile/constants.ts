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
export const PROFILE_TEXT_SIZE_OPTIONS = ["sm", "md", "lg"] as const;

export type ProfileThemeMode = (typeof PROFILE_THEME_OPTIONS)[number];
export type ProfileTextSize = (typeof PROFILE_TEXT_SIZE_OPTIONS)[number];
export type ProfileStatSection = (typeof PROFILE_STAT_SECTIONS)[number];

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

export type ProfileThemeSettings = {
  mode: ProfileThemeMode;
  accent: string;
  textSize: ProfileTextSize;
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
  notifications: {
    email: true,
    push: true,
    product: true,
    reminders: true,
    marketing: false,
  },
  theme: {
    mode: "system",
    accent: "default",
    textSize: "md",
  },
};

export function cloneDefaultProfileSettings(): ProfileSettings {
  return JSON.parse(JSON.stringify(DEFAULT_PROFILE_SETTINGS));
}