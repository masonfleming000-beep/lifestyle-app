import type { ConfigDrivenPage } from '../../types/ui';
import type { EditableCollectionControllerSection } from '../../lib/client/editableCollections';
import { fitnessLinks, weeklySplit } from '../../data/fitness';

export const fitnessPageConfig: ConfigDrivenPage = {
  meta: {
    title: 'Fitness | Lifestyle App',
    description: 'Fitness landing page',
  },
  hero: {
    kicker: 'Fitness',
    title: 'Train for performance, discipline, and long-term health.',
    description:
      'Use this as the hub for running, weight training, and future tracked progress.',
  },
  sections: [
    {
      kind: 'quick-links',
      key: 'fitness-links',
      columns: 2,
      items: fitnessLinks.map((item) => ({
        href: item.href,
        title: item.title,
        text: item.description,
      })),
    },
    {
      kind: 'editable-collection',
      key: 'weekly-notes',
      kicker: 'Fitness',
      title: 'Weekly Training Notes',
      subtitle: 'Edit, add, delete, or restore your default weekly notes.',
      surface: 'expandable',
      open: false,
      mode: 'list',
      listId: 'weekly-notes-list',
      editButtonId: 'weekly-notes-edit-btn',
      emptyText: 'No training notes yet.',
    },
  ],
};

export const fitnessEditableSections: EditableCollectionControllerSection[] = [
  {
    key: 'weeklyNotes',
    mode: 'list',
    listId: 'weekly-notes-list',
    editButtonId: 'weekly-notes-edit-btn',
    defaults: [...weeklySplit],
    addLabel: 'Add Note',
    restoreLabel: 'Restore Notes',
  },
];

export const fitnessPageClientConfig = {
  pageKey: 'fitness',
  defaults: {
    collections: {
      weeklyNotes: {
        items: [...weeklySplit],
        removedDefaults: [],
      },
    },
  },
  sections: fitnessEditableSections,
} as const;
