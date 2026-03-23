import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'cardio', route: '/cardio', title: 'Cardio',
  hero: { kicker: 'Cardio', title: 'Build endurance with structure.' },
  sections: [
    { id: 'strava', type: 'collection', title: 'Strava', actions: [{ id: 'strava-edit', kind: 'edit', label: 'Edit' }] },
    { id: 'recent-sessions', type: 'workout-history', title: 'Recent Sessions', kicker: 'Cardio', actions: [{ id: 'sessions-edit', kind: 'edit', label: 'Edit' }, { id: 'sessions-remove', kind: 'remove', label: 'Remove Past Workout' }] },
    { id: 'rules', type: 'collection', title: 'Rules', kicker: 'Cardio', actions: [{ id: 'rules-edit', kind: 'edit', label: 'Edit' }] },
    { id: 'goals', type: 'collection', title: 'Goals', kicker: 'Cardio', actions: [{ id: 'goals-edit', kind: 'edit', label: 'Edit' }] },
    { id: 'warm-up', type: 'routine', title: 'Warm Up', kicker: 'Checklist' },
    { id: 'cool-down', type: 'routine', title: 'Cool Down', kicker: 'Checklist' },
  ],
});
