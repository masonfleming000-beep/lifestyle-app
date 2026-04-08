import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'today', route: '/today', title: 'Today',
  hero: { kicker: 'Today', title: 'Plan the day with less repeated markup.' },
  sections: [
    { id: 'calendar', type: 'calendar', title: 'Calendar', actions: [{ id: 'calendar-edit', kind: 'edit', label: 'Edit' }, { id: 'calendar-save', kind: 'save', label: 'Save' }, { id: 'calendar-remove', kind: 'remove', label: 'Remove Calendar' }] },
    { id: 'today-list', type: 'tasks', title: 'Today', actions: [{ id: 'today-restore', kind: 'restore', label: 'Restore' }, { id: 'today-edit', kind: 'edit', label: 'Edit' }, { id: 'today-add', kind: 'add', label: 'Add' }] },
    { id: 'morning', type: 'routine', title: 'Morning', actions: [{ id: 'morning-restore', kind: 'restore', label: 'Restore' }, { id: 'morning-edit', kind: 'edit', label: 'Edit' }, { id: 'morning-add', kind: 'add', label: 'Add' }] },
    { id: 'night', type: 'routine', title: 'Night', actions: [{ id: 'night-restore', kind: 'restore', label: 'Restore' }, { id: 'night-edit', kind: 'edit', label: 'Edit' }, { id: 'night-add', kind: 'add', label: 'Add' }] },
  ],
});
