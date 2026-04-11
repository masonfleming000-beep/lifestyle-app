import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'nutrition', route: '/nutrition', title: 'Nutrition',
  hero: { kicker: 'Nutrition', title: 'Track targets, food, and water.' },
  sections: [
    { id: 'targets', type: 'nutrition-targets', title: 'Target Macros + Water', actions: [{ id: 'save-targets', kind: 'save', label: 'Save Targets' }] },
    { id: 'search-food', type: 'form', title: 'Search & Add Food', actions: [{ id: 'search-food-btn', kind: 'search', label: 'Search' }, { id: 'add-food', kind: 'add', label: 'Add Food' }, { id: 'add-water', kind: 'add', label: 'Add Water' }, { id: 'clear-today', kind: 'clear', label: 'Clear Today' }] },
    { id: 'good-foods', type: 'collection', title: 'Good Foods', actions: [{ id: 'good-restore', kind: 'restore', label: 'Restore' }, { id: 'good-edit', kind: 'edit', label: 'Edit' }, { id: 'good-add', kind: 'add', label: 'Add' }] },
    { id: 'limit-foods', type: 'collection', title: 'Foods to Limit', actions: [{ id: 'bad-restore', kind: 'restore', label: 'Restore' }, { id: 'bad-edit', kind: 'edit', label: 'Edit' }, { id: 'bad-add', kind: 'add', label: 'Add' }] },
    { id: 'macro-calculator', type: 'form', title: 'Macros Calculator', actions: [{ id: 'apply-targets', kind: 'apply', label: 'Apply To Targets' }] },
  ],
});
