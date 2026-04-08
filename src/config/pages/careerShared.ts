import type { ActionItemConfig } from '../../types/ui';

export const careerInformationPageKey = 'career-information';

export const careerDefaultMenuItems = [
  {
    id: 'main',
    label: 'Home',
    slug: 'home',
  },
] as const;

export const careerDefaultPortfolioSections = [
  { key: 'profile', title: 'Profile', enabled: true },
  { key: 'resume', title: 'Resume', enabled: true },
  { key: 'experience', title: 'Work Experience', enabled: true },
  { key: 'leadership', title: 'Leadership Experience', enabled: true },
  { key: 'projects', title: 'Projects', enabled: true },
  { key: 'organizations', title: 'Organizations', enabled: true },
  { key: 'honors', title: 'Honors and Awards', enabled: true },
  { key: 'licenses', title: 'Licenses and Certificates', enabled: true },
  { key: 'contact', title: 'Get in touch', enabled: true },
  { key: 'school', title: 'School Development', enabled: false },
  { key: 'about', title: 'About / Story', enabled: false },
  { key: 'looking', title: "What I'm Looking For", enabled: false },
  { key: 'pitch', title: 'Pitch', enabled: false },
  { key: 'timelineItems', title: 'Timeline', enabled: false },
  { key: 'recommendations', title: 'Recommendations', enabled: false },
  { key: 'star', title: 'STAR Moments', enabled: false },
] as const;

export const careerInformationDefaults = {
  profile: [],
  externalLinks: [],
  projects: [],
  school: [],
  experience: [],
  leadership: [],
  about: [],
  looking: [],
  pitch: [],
  honors: [],
  organizations: [],
  licenses: [],
  contact: [],
  timelineItems: [],
  recommendations: [],
  star: [],
  resume: [],
  portfolioMenuItems: careerDefaultMenuItems.map((item) => ({ ...item })),
  portfolioSectionLayout: careerDefaultPortfolioSections.map((section, index) => ({
    id: `layout-${section.key}`,
    key: section.key,
    title: section.title,
    pageId: 'main',
    enabled: section.enabled,
    collapsed: false,
    order: index,
  })),
} as const;

export type CareerInformationSectionKey =
  | 'profile'
  | 'externalLinks'
  | 'projects'
  | 'school'
  | 'experience'
  | 'leadership'
  | 'about'
  | 'looking'
  | 'pitch'
  | 'honors'
  | 'organizations'
  | 'licenses'
  | 'contact'
  | 'resume'
  | 'timelineItems'
  | 'recommendations'
  | 'star';

export interface CareerSectionMeta {
  key: CareerInformationSectionKey;
  builderValue: string;
  title: string;
  countId: string;
  containerId: string;
  emptyTitle: string;
  emptyText: string;
  open?: boolean;
}

export const careerInformationSections: CareerSectionMeta[] = [
  {
    key: 'profile',
    builderValue: 'profile',
    title: 'Profile Basics',
    countId: 'count-profile',
    containerId: 'info-profile',
    emptyTitle: 'No profile basics yet',
    emptyText: 'Add your public name, headline, bio, and optional photo override.',
    open: true,
  },
  {
    key: 'externalLinks',
    builderValue: 'externalLinks',
    title: 'External Links',
    countId: 'count-externalLinks',
    containerId: 'info-externalLinks',
    emptyTitle: 'No links yet',
    emptyText: 'GitHub, LinkedIn, email, and other public links appear here.',
    open: true,
  },
  {
    key: 'experience',
    builderValue: 'experience',
    title: 'Work Experience',
    countId: 'count-experience',
    containerId: 'info-experience',
    emptyTitle: 'No work experience yet',
    emptyText: 'Saved work experience will appear here.',
    open: true,
  },
  {
    key: 'leadership',
    builderValue: 'leadership',
    title: 'Leadership Experience',
    countId: 'count-leadership',
    containerId: 'info-leadership',
    emptyTitle: 'No leadership experience yet',
    emptyText: 'Saved leadership roles will appear here.',
  },
  {
    key: 'projects',
    builderValue: 'projects',
    title: 'Projects',
    countId: 'count-projects',
    containerId: 'info-projects',
    emptyTitle: 'No projects yet',
    emptyText: 'Saved project entries will appear here.',
    open: true,
  },
  {
    key: 'organizations',
    builderValue: 'organizations',
    title: 'Organizations',
    countId: 'count-organizations',
    containerId: 'info-organizations',
    emptyTitle: 'No organizations yet',
    emptyText: 'Saved organizations will appear here.',
  },
  {
    key: 'honors',
    builderValue: 'honors',
    title: 'Honors and Awards',
    countId: 'count-honors',
    containerId: 'info-honors',
    emptyTitle: 'No honors or awards yet',
    emptyText: 'Saved honors, awards, and stat-style highlights will appear here.',
  },
  {
    key: 'licenses',
    builderValue: 'licenses',
    title: 'Licenses and Certificates',
    countId: 'count-licenses',
    containerId: 'info-licenses',
    emptyTitle: 'No licenses yet',
    emptyText: 'Saved licenses and certificates will appear here.',
  },
  {
    key: 'contact',
    builderValue: 'contact',
    title: 'Preferred Contact',
    countId: 'count-contact',
    containerId: 'info-contact',
    emptyTitle: 'No preferred contact yet',
    emptyText: 'Choose the best way for people to reach out.',
  },
  {
    key: 'resume',
    builderValue: 'resume',
    title: 'Resume Upload',
    countId: 'count-resume',
    containerId: 'info-resume',
    emptyTitle: 'No resume uploaded yet',
    emptyText: 'Saved resume entries will appear here.',
  },
  {
    key: 'school',
    builderValue: 'school',
    title: 'School Development',
    countId: 'count-school',
    containerId: 'info-school',
    emptyTitle: 'No school development yet',
    emptyText: 'Saved school items will appear here.',
  },
  {
    key: 'about',
    builderValue: 'about',
    title: 'About / Story',
    countId: 'count-about',
    containerId: 'info-about',
    emptyTitle: 'No about entries yet',
    emptyText: 'Saved about sections will appear here.',
  },
  {
    key: 'looking',
    builderValue: 'looking',
    title: "What I'm Looking For",
    countId: 'count-looking',
    containerId: 'info-looking',
    emptyTitle: 'Nothing added yet',
    emptyText: 'Saved looking-for entries will appear here.',
  },
  {
    key: 'pitch',
    builderValue: 'pitch',
    title: 'Pitch',
    countId: 'count-pitch',
    containerId: 'info-pitch',
    emptyTitle: 'No pitch entries yet',
    emptyText: 'Saved pitch entries will appear here.',
  },
  {
    key: 'timelineItems',
    builderValue: 'timelineItems',
    title: 'Timeline',
    countId: 'count-timelineItems',
    containerId: 'info-timelineItems',
    emptyTitle: 'No timeline items yet',
    emptyText: 'Saved timeline entries will appear here.',
  },
  {
    key: 'recommendations',
    builderValue: 'recommendations',
    title: 'Recommendations',
    countId: 'count-recommendations',
    containerId: 'info-recommendations',
    emptyTitle: 'No recommendations yet',
    emptyText: 'Saved recommendations will appear here.',
  },
  {
    key: 'star',
    builderValue: 'star',
    title: 'STAR Moments',
    countId: 'count-star',
    containerId: 'info-star',
    emptyTitle: 'No STAR entries yet',
    emptyText: 'Saved STAR moments will appear here.',
  },
];

export const careerBuilderOptions = careerInformationSections.map((section) => ({
  value: section.builderValue,
  label: section.title,
}));

export const careerInformationHeroActions: ActionItemConfig[] = [
  { href: '/career', label: '← Back to Career', variant: 'secondary' },
  { href: '/career/portfolio', label: 'Portfolio Layout', variant: 'primary' },
];

export const careerPortfolioHeroActions: ActionItemConfig[] = [
  { href: '/career', label: 'Back to Career', variant: 'secondary' },
  { href: '/career/portfolio-preview', label: 'Open Preview', variant: 'primary' },
];

export const careerPortfolioSectionTitles = Object.fromEntries(
  careerDefaultPortfolioSections.map((section) => [section.key, section.title])
) as Record<string, string>;

export const careerPortfolioSectionOrder = careerDefaultPortfolioSections.map((section) => section.key);
