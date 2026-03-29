import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'career-information', route: '/career/information', title: 'Career Information',
  hero: { kicker: 'Career', title: 'Information Builder', actions: [{ id: 'clear-everything', kind: 'clear', label: 'Clear Everything' }] },
  sections: [
    { id: 'add-entry', type: 'form', title: 'Add New Entry' },
    { id: 'projects', type: 'collection', title: 'Projects', itemActions: [{ id: 'save-project', kind: 'save', label: 'Save Project' }, { id: 'toggle-project', kind: 'show', label: 'Show' }, { id: 'delete-project', kind: 'delete', label: 'Delete' }] },
    { id: 'school', type: 'collection', title: 'School Development', itemActions: [{ id: 'save-school', kind: 'save', label: 'Save School Item' }, { id: 'delete-school', kind: 'delete', label: 'Delete' }] },
    { id: 'experience', type: 'collection', title: 'Work Experience', itemActions: [{ id: 'save-experience', kind: 'save', label: 'Save Experience' }, { id: 'delete-experience', kind: 'delete', label: 'Delete' }] },
    { id: 'about', type: 'collection', title: 'About / Story', itemActions: [{ id: 'save-about', kind: 'save', label: 'Save About Section' }, { id: 'delete-about', kind: 'delete', label: 'Delete' }] },
    { id: 'looking', type: 'collection', title: "What I'm Looking For", itemActions: [{ id: 'save-looking', kind: 'save', label: 'Save Looking For' }, { id: 'delete-looking', kind: 'delete', label: 'Delete' }] },
    { id: 'pitch', type: 'collection', title: 'Pitch', itemActions: [{ id: 'save-pitch', kind: 'save', label: 'Save Pitch' }, { id: 'delete-pitch', kind: 'delete', label: 'Delete' }] },
    { id: 'stats', type: 'collection', title: 'Stats', itemActions: [{ id: 'save-stat', kind: 'save', label: 'Save Stat' }, { id: 'delete-stat', kind: 'delete', label: 'Delete' }] },
    { id: 'contact', type: 'collection', title: 'Contact Info', itemActions: [{ id: 'save-contact', kind: 'save', label: 'Save Contact Info' }, { id: 'delete-contact', kind: 'delete', label: 'Delete' }] },
    { id: 'resume', type: 'form', title: 'Resume Upload', actions: [{ id: 'upload-resume', kind: 'upload', label: 'Upload + Save Resume' }] },
    { id: 'timeline', type: 'collection', title: 'Timeline', itemActions: [{ id: 'save-timeline', kind: 'save', label: 'Save Timeline Item' }, { id: 'delete-timeline', kind: 'delete', label: 'Delete' }] },
    { id: 'recommendations', type: 'collection', title: 'Recommendations', itemActions: [{ id: 'save-recommendation', kind: 'save', label: 'Save Recommendation' }, { id: 'delete-recommendation', kind: 'delete', label: 'Delete' }] },
    { id: 'star', type: 'collection', title: 'STAR Moments', itemActions: [{ id: 'save-star', kind: 'save', label: 'Save STAR Example' }, { id: 'delete-star', kind: 'delete', label: 'Delete' }] },
  ],
});
