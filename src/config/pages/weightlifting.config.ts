import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'weightlifting', route: '/weightlifting', title: 'Weightlifting',
  hero: { kicker: 'Weight Training', title: 'Train by muscle group.' },
  sections: [
    { id: 'custom-sections', type: 'collection', title: 'Custom Sections', actions: [{ id: 'add-section', kind: 'add', label: 'Add section' }, { id: 'restore-sections', kind: 'restore', label: 'Restore' }] },
    { id: 'muscle-groups', type: 'collection', title: 'Muscle Groups', itemActions: [{ id: 'delete-exercise', kind: 'delete', label: 'Delete Exercise' }, { id: 'add-exercise', kind: 'add', label: 'Add Exercise' }, { id: 'restore-exercises', kind: 'restore', label: 'Restore Default Exercises' }, { id: 'delete-section', kind: 'delete', label: 'Delete Section' }] },
    { id: 'saved-workouts', type: 'workout-history', title: 'Saved Weightlifting Workouts', actions: [{ id: 'save-workout', kind: 'save', label: 'Save Workout' }, { id: 'remove-workout', kind: 'remove', label: 'Remove Past Workout' }] },
  ],
});
