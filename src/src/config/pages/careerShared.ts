import type { ActionItemConfig } from '../../types/ui';

export const careerInformationPageKey = 'career-information';

export const careerInformationDefaults = {
  projects: [],
  school: [],
  experience: [],
  about: [],
  looking: [],
  pitch: [],
  stats: [],
  contact: [],
  timelineItems: [],
  recommendations: [],
  star: [],
  resume: [],
} as const;

export type CareerInformationSectionKey =
  | 'projects'
  | 'school'
  | 'experience'
  | 'about'
  | 'looking'
  | 'pitch'
  | 'stats'
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
    key: 'school',
    builderValue: 'school',
    title: 'School Development',
    countId: 'count-school',
    containerId: 'info-school',
    emptyTitle: 'No school development yet',
    emptyText: 'Saved school items will appear here.',
  },
  {
    key: 'experience',
    builderValue: 'experience',
    title: 'Work Experience',
    countId: 'count-experience',
    containerId: 'info-experience',
    emptyTitle: 'No experience yet',
    emptyText: 'Saved experience entries will appear here.',
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
    key: 'stats',
    builderValue: 'stats',
    title: 'Stats',
    countId: 'count-stats',
    containerId: 'info-stats',
    emptyTitle: 'No stats yet',
    emptyText: 'Saved stat entries will appear here.',
  },
  {
    key: 'contact',
    builderValue: 'contact',
    title: 'Contact Info',
    countId: 'count-contact',
    containerId: 'info-contact',
    emptyTitle: 'No contact info yet',
    emptyText: 'Saved contact entries will appear here.',
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
    key: 'timelineItems',
    builderValue: 'timeline',
    title: 'Timeline',
    countId: 'count-timeline',
    containerId: 'info-timeline',
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
  { href: '/career/portfolio', label: 'Go to Portfolio', variant: 'primary' },
];

export const careerPortfolioHeroActions: ActionItemConfig[] = [
  { href: '/career', label: 'Back to Career', variant: 'secondary' },
  { href: '/career/information', label: 'Edit Information', variant: 'primary' },
];

export const careerPortfolioSectionTitles = Object.fromEntries(
  careerInformationSections.map((section) => [section.key, section.title])
) as Record<CareerInformationSectionKey, string>;

export const careerPortfolioSectionOrder: CareerInformationSectionKey[] = careerInformationSections.map(
  (section) => section.key
);
