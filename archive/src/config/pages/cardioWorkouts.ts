import type { RendererPageConfig } from '../../types/ui';

export const cardioWorkoutsPageConfig: RendererPageConfig = {
  hero: {
    kicker: 'Running',
    title: 'Workout Builder',
    description: 'Choose a workout type, set your parameters, and track each step live as you go.',
  },
  sections: [
    {
      kind: 'surface-target',
      key: 'choose-workout-type',
      title: 'Choose Workout Type',
      subtitle: 'Build HIIT, intervals, recovery runs, tempo runs, fartlek sessions, hill workouts, power workouts, or long runs.',
      containerId: 'cardio-workout-type-section',
      actions: [{ id: 'edit-workout-types-button', label: 'Edit', variant: 'secondary' }],
    },
    {
      kind: 'surface-target',
      key: 'set-workout',
      title: 'Set Workout',
      subtitle: 'Customize the workout before you start.',
      containerId: 'cardio-workout-builder-section',
    },
    {
      kind: 'surface-target',
      key: 'live-workout',
      id: 'live-workout-card',
      title: 'Live Workout',
      subtitle: 'Fill in your real results and check each step off as you go.',
      containerId: 'cardio-live-workout-section',
      hidden: true,
    },
  ],
};

export const cardioWorkoutClientConfig = {
  pageKey: 'cardio-workout-builder',
  fitnessHistoryPageKey: 'fitness-history',
  profileStatsPageKey: 'profile-stats',
  ids: {
    workoutTypeSectionId: 'cardio-workout-type-section',
    workoutBuilderSectionId: 'cardio-workout-builder-section',
    liveWorkoutSectionId: 'cardio-live-workout-section',
    liveWorkoutCardId: 'live-workout-card',
    editWorkoutTypesButtonId: 'edit-workout-types-button',
  },
};
