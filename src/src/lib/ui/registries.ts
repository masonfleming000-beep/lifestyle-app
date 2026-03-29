import type { SectionType } from './types';

export const sectionComponentRegistry: Record<SectionType, string> = {
  collection: 'CollectionSection',
  'detail-grid': 'DetailGrid',
  form: 'FormRenderer',
  stats: 'CollectionSection',
  timeline: 'TimelineCard',
  media: 'MediaCard',
  routine: 'RoutineSection',
  tasks: 'TaskSection',
  calendar: 'CalendarSection',
  'workout-history': 'WorkoutHistorySection',
  'nutrition-targets': 'NutritionTargetsSection',
  settings: 'SettingsSection',
  custom: 'SectionCard',
};
