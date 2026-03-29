import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'hobbies', route: '/hobbies', title: 'Hobbies',
  hero: { kicker: 'Hobbies', title: 'Nested hobby, stage, log, and library sections.' },
  sections: [
    { id: 'controls', type: 'collection', title: 'Controls', actions: [{ id: 'add-hobby', kind: 'add', label: 'Add Hobby' }, { id: 'delete-selected', kind: 'delete', label: 'Delete Selected' }, { id: 'restore-hobbies', kind: 'restore', label: 'Restore Defaults' }] },
    { id: 'hobby-list', type: 'collection', title: 'Hobby List', actions: [{ id: 'collapse-hobby', kind: 'custom', label: 'Collapse' }, { id: 'edit-hobby', kind: 'edit', label: 'Edit' }, { id: 'save-hobby', kind: 'save', label: 'Save Hobby Changes' }] },
    { id: 'stages', type: 'collection', title: 'Stages', actions: [{ id: 'stage-collapse', kind: 'custom', label: 'Collapse' }, { id: 'stage-edit', kind: 'edit', label: 'Edit' }, { id: 'stage-add', kind: 'add', label: 'Add Stage' }], itemActions: [{ id: 'save-stage', kind: 'save', label: 'Save Stage' }, { id: 'delete-stage', kind: 'delete', label: 'Delete Stage' }] },
    { id: 'activity-log', type: 'collection', title: 'Activity Log', actions: [{ id: 'log-collapse', kind: 'custom', label: 'Collapse' }, { id: 'log-edit', kind: 'edit', label: 'Edit' }, { id: 'add-log-entry', kind: 'add', label: 'Add Log Entry' }], itemActions: [{ id: 'save-log', kind: 'save', label: 'Save' }, { id: 'delete-log', kind: 'delete', label: 'Delete' }] },
    { id: 'library', type: 'collection', title: 'Library', actions: [{ id: 'library-collapse', kind: 'custom', label: 'Collapse' }, { id: 'library-edit', kind: 'edit', label: 'Edit' }, { id: 'library-add', kind: 'add', label: 'Add Library Item' }], itemActions: [{ id: 'save-item', kind: 'save', label: 'Save Item' }, { id: 'delete-item', kind: 'delete', label: 'Delete Item' }] },
  ],
});
