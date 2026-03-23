import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'work', route: '/work', title: 'Work',
  hero: { kicker: 'Work', title: 'Tasks, meetings, and custom sections.' },
  sections: [
    { id: 'due-week', type: 'tasks', title: 'Due This Week', actions: [{ id: 'add-task', kind: 'add', label: 'Add Task' }] },
    { id: 'meetings', type: 'collection', title: 'Upcoming Meetings', actions: [{ id: 'add-meeting', kind: 'add', label: 'Add Meeting' }] },
    { id: 'all-tasks', type: 'tasks', title: 'All Upcoming Tasks', actions: [{ id: 'restore-work', kind: 'restore', label: 'Restore Defaults' }] },
    { id: 'sections', type: 'collection', title: 'Sections', actions: [{ id: 'add-section', kind: 'add', label: 'Add Section' }], itemActions: [{ id: 'remove-item', kind: 'remove', label: 'Remove' }, { id: 'delete-item', kind: 'delete', label: 'Delete' }] },
  ],
});
