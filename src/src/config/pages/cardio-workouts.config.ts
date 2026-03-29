import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'cardio-workouts', route: '/cardio/workouts', title: 'Cardio Workouts',
  hero: { kicker: 'Running', title: 'Workout builder and live tracking.' },
  sections: [
    { id: 'choose-type', type: 'form', title: 'Choose Workout Type', actions: [{ id: 'start-workout', kind: 'start', label: 'Start Workout' }] },
    { id: 'set-workout', type: 'form', title: 'Set Workout', actions: [{ id: 'save-splits', kind: 'save', label: 'Save Splits / Times' }] },
    { id: 'live-workout', type: 'collection', title: 'Live Workout', actions: [{ id: 'manual-metrics', kind: 'custom', label: 'Fill In Metrics Manually' }, { id: 'auto-calculate', kind: 'custom', label: 'Auto Calculate Metrics' }, { id: 'save-complete', kind: 'save', label: 'Save Completed Workout' }, { id: 'reset-workout', kind: 'reset', label: 'Reset Workout' }, { id: 'save-manual', kind: 'save', label: 'Save Manual Metrics' }] },
  ],
});
