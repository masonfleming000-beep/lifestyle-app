import type { RendererPageConfig } from '../../types/ui';
import { cardioGoals, cardioRules, cooldown, defaultStravaEmbed, recentSessions, warmup } from '../../data/cardio';

export const cardioPageKey = 'cardio';
export const cardioFitnessHistoryPageKey = 'fitness-history';
export const cardioProfileStatsPageKey = 'profile-stats';

export const cardioPageConfig: RendererPageConfig = {
  hero: {
    kicker: 'Cardio',
    title: 'Build endurance with structure.',
    description: 'A cleaner cardio page with your Strava feed, goals, rules, and saved warm-up / cool-down checklists.',
  },
  sections: [
    {
      kind: 'embed',
      key: 'strava',
      title: 'Strava',
      subtitle: 'Latest activity snapshot.',
      containerId: 'cardio-strava-preview',
      containerClassName: 'running-embed-shell',
      form: {
        id: 'cardio-strava-form',
        className: 'strava-form',
        fields: [
          {
            id: 'cardio-strava-input',
            name: 'stravaEmbed',
            type: 'textarea',
            label: 'Strava iframe embed code or URL',
            placeholder: 'Paste Strava iframe embed code here',
            rows: 5,
            inputClassName: 'routine-input',
          },
        ],
        actions: [
          { id: 'cardio-strava-save-btn', label: 'Save Strava Embed', type: 'button', variant: 'primary' },
        ],
      },
      helperText: {
        id: 'cardio-strava-feedback',
        text: '',
        className: 'section-subtitle',
      },
      auxiliaryActions: {
        id: 'cardio-strava-actions',
        className: 'today-form-hidden',
        align: 'start',
        actions: [
          { id: 'cardio-strava-remove-btn', label: 'Remove Embed', type: 'button', variant: 'secondary' },
        ],
      },
    },
    {
      kind: 'quick-links',
      key: 'builder-link',
      title: 'Workout Builder',
      subtitle: 'Create a cardio session or interval plan.',
      items: [
        {
          href: '/cardio/workouts',
          title: 'Build Workout',
          text: 'Open the cardio workout builder and live tracker.',
        },
      ],
      columns: 1,
    },
    {
      kind: 'expandable-target',
      key: 'recent-sessions',
      title: 'Recent Sessions',
      subtitle: 'Saved cardio workouts from your workout builder.',
      kicker: 'Cardio',
      open: true,
      containerId: 'saved-cardio-sessions',
    },
    {
      kind: 'group',
      key: 'cardio-guidance',
      columns: 2,
      children: [
        {
          kind: 'checklist',
          key: 'rules',
          title: 'Rules',
          kicker: 'Cardio',
          listId: 'cardio-rules-list',
          mode: 'list',
          items: [...cardioRules],
          actions: [{ id: 'rules-edit-btn', label: 'Edit', variant: 'secondary' }],
          listDataKey: 'rules',
        },
        {
          kind: 'checklist',
          key: 'goals',
          title: 'Goals',
          kicker: 'Cardio',
          listId: 'cardio-goals-list',
          mode: 'list',
          items: [...cardioGoals],
          actions: [{ id: 'goals-edit-btn', label: 'Edit', variant: 'secondary' }],
          listDataKey: 'goals',
        },
      ],
    },
    {
      kind: 'group',
      key: 'cardio-routines',
      columns: 2,
      children: [
        {
          kind: 'checklist',
          key: 'warmup',
          title: 'Warm Up',
          kicker: 'Checklist',
          listId: 'cardio-warmup-list',
          mode: 'checklist',
          items: warmup.map((text) => ({ text, done: false })),
          actions: [{ id: 'warmup-edit-btn', label: 'Edit', variant: 'secondary' }],
          listDataKey: 'warmup',
        },
        {
          kind: 'checklist',
          key: 'cooldown',
          title: 'Cool Down',
          kicker: 'Checklist',
          listId: 'cardio-cooldown-list',
          mode: 'checklist',
          items: cooldown.map((text) => ({ text, done: false })),
          actions: [{ id: 'cooldown-edit-btn', label: 'Edit', variant: 'secondary' }],
          listDataKey: 'cooldown',
        },
      ],
    },
  ],
};

export const cardioClientConfig = {
  pageKey: cardioPageKey,
  fitnessHistoryPageKey: cardioFitnessHistoryPageKey,
  profileStatsPageKey: cardioProfileStatsPageKey,
  defaults: {
    stravaEmbed: defaultStravaEmbed,
    collections: {
      rules: { items: [...cardioRules], removedDefaults: [] },
      goals: { items: [...cardioGoals], removedDefaults: [] },
      warmup: { items: warmup.map((text) => ({ text, done: false })), removedDefaults: [] },
      cooldown: { items: cooldown.map((text) => ({ text, done: false })), removedDefaults: [] },
    },
  },
  sections: [
    { key: 'rules', mode: 'list', listId: 'cardio-rules-list', editButtonId: 'rules-edit-btn', defaults: [...cardioRules] },
    { key: 'goals', mode: 'list', listId: 'cardio-goals-list', editButtonId: 'goals-edit-btn', defaults: [...cardioGoals] },
    { key: 'warmup', mode: 'checklist', listId: 'cardio-warmup-list', editButtonId: 'warmup-edit-btn', defaults: [...warmup] },
    { key: 'cooldown', mode: 'checklist', listId: 'cardio-cooldown-list', editButtonId: 'cooldown-edit-btn', defaults: [...cooldown] },
  ],
  fallbackRecentSessions: [...recentSessions],
  strava: {
    previewContainerId: 'cardio-strava-preview',
    formId: 'cardio-strava-form',
    inputId: 'cardio-strava-input',
    saveButtonId: 'cardio-strava-save-btn',
    removeButtonId: 'cardio-strava-remove-btn',
    actionsId: 'cardio-strava-actions',
    feedbackId: 'cardio-strava-feedback',
  },
  savedSessionsContainerId: 'saved-cardio-sessions',
};
