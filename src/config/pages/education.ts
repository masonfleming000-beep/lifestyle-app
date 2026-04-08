import type { RendererPageConfig } from '../../types/ui';
import { sharedTagColors } from './sharedColors';

export const educationPageKey = 'education';

export const defaultEducationState = {
  classes: [
    { id: 'ece-39595', name: 'ECE 39595', color: '#2f5d62' },
    { id: 'ece-30200', name: 'ECE 30200', color: '#7a4b2a' },
    { id: 'ece-36800', name: 'ECE 36800', color: '#6a3fa0' },
  ],
  assignments: [],
  removedDefaults: {
    classes: [],
  },
} as const;

export const educationPageConfig: RendererPageConfig = {
  hero: {
    kicker: 'Education',
    title: 'Academic dashboard',
    description: 'Track classes, assignments, due dates, grade weight, and what needs attention first.',
  },
  sections: [
    {
      kind: 'surface-target',
      key: 'due-this-week',
      title: 'Due This Week',
      subtitle: 'Closest deadlines first.',
      containerId: 'due-this-week',
      containerClassName: 'education-list',
      cardClassName: 'education-panel',
      sectionClassName: 'education-shell',
    },
    {
      kind: 'surface-target',
      key: 'all-upcoming',
      title: 'All Upcoming',
      subtitle: 'Sorted by due date.',
      containerId: 'all-upcoming',
      containerClassName: 'education-list',
      cardClassName: 'education-panel',
      sectionClassName: 'education-shell',
    },
    {
      kind: 'form-card',
      key: 'assignment-form',
      title: 'Add Assignment',
      subtitle: 'Add work by class and due date.',
      sectionClassName: 'education-shell',
      fieldsWrapperClassName: 'edu-form-grid',
      form: {
        id: 'assignment-form',
        fields: [
          { id: 'assignment-name', name: 'assignmentName', label: 'Assignment name', placeholder: 'Homework 4', required: true, className: 'edu-label', inputClassName: 'text-input' },
          { id: 'assignment-due', name: 'assignmentDue', type: 'date', label: 'Due date', required: true, className: 'edu-label', inputClassName: 'text-input' },
          { id: 'assignment-start-time', name: 'assignmentStartTime', type: 'time', label: 'Start time (optional)', className: 'edu-label', inputClassName: 'text-input' },
          { id: 'assignment-due-time', name: 'assignmentDueTime', type: 'time', label: 'Due time (optional)', className: 'edu-label', inputClassName: 'text-input' },
          {
            id: 'assignment-class', name: 'assignmentClass', type: 'select', label: 'Class', required: true, className: 'edu-label', inputClassName: 'text-input',
            options: [{ value: '', label: 'Select a class' }],
          },
          { id: 'assignment-weight', name: 'assignmentWeight', type: 'number', label: 'Percent of grade (optional)', placeholder: '10', min: 0, max: 100, step: 0.1, className: 'edu-label', inputClassName: 'text-input' },
        ],
        actions: [{ label: 'Add Assignment', type: 'submit', variant: 'primary' }],
      },
    },
    {
      kind: 'color-managed-list',
      key: 'classes',
      title: 'Classes',
      subtitle: 'Create classes with color tags.',
      sectionClassName: 'education-shell',
      cardClassName: 'education-panel',
      listId: 'class-list',
      listClassName: 'class-list',
      restoreAction: { label: 'Restore Defaults', id: 'restore-classes-btn', type: 'button', variant: 'secondary' },
      form: {
        id: 'class-form',
        fields: [
          { id: 'class-name', name: 'className', label: 'Class name', placeholder: 'ECE 30200', required: true, className: 'edu-label', inputClassName: 'text-input' },
        ],
        actions: [{ label: 'Add Class', type: 'submit', variant: 'primary' }],
      },
      formFieldsWrapperClassName: 'edu-form-grid class-grid',
      colorFieldWrapperClassName: 'edu-label',
      colorFieldId: 'class-color',
      colorFieldName: 'classColor',
      colorPickerId: 'class-color-picker',
      colorLabel: 'Color',
      colorOptions: [...sharedTagColors],
      defaultColor: '#2f5d62',
    },
    {
      kind: 'expandable-target',
      key: 'completed',
      title: 'Completed',
      open: false,
      sectionClassName: 'education-shell',
      bodyClassName: 'completed-panel',
      containerId: 'completed-list',
      containerClassName: 'education-list completed-list',
      countBadgeId: 'completed-count',
      countBadgeClassName: 'completed-count',
      countBadgeText: '0',
    },
  ],
};

export const educationClientConfig = {
  pageKey: educationPageKey,
  defaultColor: '#2f5d62',
  defaults: defaultEducationState,
  sections: {
    classes: {
      selectId: 'assignment-class',
      formId: 'class-form',
      nameInputId: 'class-name',
      colorInputId: 'class-color',
      colorPickerId: 'class-color-picker',
      restoreButtonId: 'restore-classes-btn',
      listId: 'class-list',
      emptyText: 'No classes yet.',
    },
    assignments: {
      formId: 'assignment-form',
      nameInputId: 'assignment-name',
      dueInputId: 'assignment-due',
      startTimeInputId: 'assignment-start-time',
      dueTimeInputId: 'assignment-due-time',
      classSelectId: 'assignment-class',
      weightInputId: 'assignment-weight',
      dueThisWeekId: 'due-this-week',
      allUpcomingId: 'all-upcoming',
      completedListId: 'completed-list',
      completedCountId: 'completed-count',
    },
  },
};
