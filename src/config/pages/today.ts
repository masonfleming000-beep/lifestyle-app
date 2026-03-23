import type { ChecklistItem, RendererPageConfig } from "../../types/ui";

export const pageKey = "today";

export const defaultMorning = [
  "Brush teeth",
  "Wash face",
  "Stretch",
  "Journal / reflect",
  "Exercise",
  "Create to-do list",
  "Update calendar",
] as const;

export const defaultNight = [
  "Clean room",
  "Shower",
  "Floss",
  "Set bedtime",
  "Create calm environment",
  "Journal / reflect",
  "Stretch / yoga",
  "Turn off phone 30–60 mins before bed",
  "Prepare for tomorrow",
  "Read",
] as const;

export const starterTodos = [
  { text: "Review calendar", done: false },
  { text: "Complete highest-priority work", done: false },
  { text: "Exercise", done: false },
] as const satisfies readonly ChecklistItem[];

export const defaultCalendarEmbed = "";

export type TodayItem = { text: string; done: boolean };

export interface TodayState {
  calendarEmbed: string;
  todos: TodayItem[];
  morning: TodayItem[];
  night: TodayItem[];
  removedDefaults: {
    todos: string[];
    morning: string[];
    night: string[];
  };
}

export const todayPageConfig: RendererPageConfig = {
  hero: {
    kicker: "Today",
    title: "Run the day with clarity.",
    description: "Track your calendar, priorities, and routine checklists from one focused dashboard.",
  },
  sections: [
    {
      kind: "embed",
      key: "calendar",
      id: "today-calendar-section",
      title: "Calendar",
      subtitle: "Add a Google Calendar embed to keep the day visible at a glance.",
      sectionClassName: "today-section-shell",
      actions: [
        { label: "Edit", id: "calendar-edit-btn", variant: "secondary" },
      ],
      form: {
        id: "calendar-form",
        className: "today-form-hidden",
        fields: [
          {
            id: "calendar-input",
            name: "calendarEmbed",
            type: "url",
            label: "Calendar embed URL",
            placeholder: "Paste Google Calendar embed URL...",
            hiddenLabel: true,
            className: "today-input-wrap",
            inputClassName: "todo-input text-input today-input",
          },
        ],
        actions: [
          { label: "Save", type: "submit", variant: "primary" },
        ],
      },
      auxiliaryActions: {
        id: "calendar-delete-wrap",
        className: "today-action-row",
        hidden: true,
        actions: [
          { label: "Remove Calendar", id: "calendar-delete-btn", variant: "danger" },
        ],
      },
      helperText: {
        id: "calendar-instructions",
        className: "muted today-calendar-help",
        hidden: true,
        text: "Log into Google Calendar, go to Settings → Settings for my calendars → select your calendar, then paste the public embed URL here.",
      },
      containerId: "calendar-container",
      containerClassName: "calendar-embed",
    },
    {
      kind: "checklist",
      key: "todos",
      id: "today-task-section",
      title: "Today",
      listId: "todo-list",
      listDataKey: "todos",
      sectionClassName: "today-section-shell",
      items: [...starterTodos],
      emptyText: "No tasks yet. Add a task to get started.",
      actions: [
        { label: "Restore", id: "todo-restore-btn", variant: "secondary" },
        { label: "Edit", id: "todo-edit-btn", variant: "secondary" },
      ],
      form: {
        id: "todo-form",
        className: "today-form-hidden",
        fields: [
          {
            id: "todo-input",
            name: "todoText",
            label: "Task",
            placeholder: "Add a task...",
            hiddenLabel: true,
            className: "today-input-wrap",
            inputClassName: "todo-input text-input today-input",
          },
        ],
        actions: [
          { label: "Add", type: "submit", variant: "primary" },
        ],
      },
    },
    {
      kind: "group",
      key: "routines",
      columns: 2,
      children: [
        {
          kind: "checklist",
          key: "morning",
          id: "today-morning-section",
          title: "Morning",
          listId: "morning-list",
          listDataKey: "morning",
          sectionClassName: "today-section-shell",
          items: defaultMorning.map((text) => ({ text, done: false })),
          emptyText: "No morning items yet. Add one above.",
          actions: [
            { label: "Restore", id: "morning-restore-btn", variant: "secondary" },
            { label: "Edit", id: "morning-edit-btn", variant: "secondary" },
          ],
          form: {
            id: "morning-form",
            className: "today-form-hidden",
            fields: [
              {
                id: "morning-input",
                name: "morningText",
                label: "Morning routine item",
                placeholder: "Add morning routine item...",
                hiddenLabel: true,
                className: "today-input-wrap",
                inputClassName: "todo-input text-input today-input",
              },
            ],
            actions: [
              { label: "Add", type: "submit", variant: "primary" },
            ],
          },
        },
        {
          kind: "checklist",
          key: "night",
          id: "today-night-section",
          title: "Night",
          listId: "night-list",
          listDataKey: "night",
          sectionClassName: "today-section-shell",
          items: defaultNight.map((text) => ({ text, done: false })),
          emptyText: "No night items yet. Add one above.",
          actions: [
            { label: "Restore", id: "night-restore-btn", variant: "secondary" },
            { label: "Edit", id: "night-edit-btn", variant: "secondary" },
          ],
          form: {
            id: "night-form",
            className: "today-form-hidden",
            fields: [
              {
                id: "night-input",
                name: "nightText",
                label: "Night routine item",
                placeholder: "Add night routine item...",
                hiddenLabel: true,
                className: "today-input-wrap",
                inputClassName: "todo-input text-input today-input",
              },
            ],
            actions: [
              { label: "Add", type: "submit", variant: "primary" },
            ],
          },
        },
      ],
    },
  ],
};

export const todayClientConfig = {
  pageKey,
  defaults: {
    calendarEmbed: defaultCalendarEmbed,
    todos: starterTodos.map((item) => ({ text: item.text, done: Boolean(item.done) })),
    morning: defaultMorning.map((text) => ({ text, done: false })),
    night: defaultNight.map((text) => ({ text, done: false })),
    removedDefaults: {
      todos: [],
      morning: [],
      night: [],
    },
  },
  sections: {
    calendar: {
      editButtonId: "calendar-edit-btn",
      formId: "calendar-form",
      inputId: "calendar-input",
      containerId: "calendar-container",
      instructionsId: "calendar-instructions",
      deleteButtonId: "calendar-delete-btn",
      deleteWrapId: "calendar-delete-wrap",
      emptyText: "No calendar added yet. Paste a Google Calendar embed URL above.",
      frameClassName: "today-calendar-frame",
    },
    todos: {
      listId: "todo-list",
      formId: "todo-form",
      inputId: "todo-input",
      editButtonId: "todo-edit-btn",
      restoreButtonId: "todo-restore-btn",
      emptyText: "No tasks yet. Add a task to get started.",
      defaultTexts: starterTodos.map((item) => item.text),
    },
    morning: {
      listId: "morning-list",
      formId: "morning-form",
      inputId: "morning-input",
      editButtonId: "morning-edit-btn",
      restoreButtonId: "morning-restore-btn",
      emptyText: "No morning items yet. Add one above.",
      defaultTexts: [...defaultMorning],
    },
    night: {
      listId: "night-list",
      formId: "night-form",
      inputId: "night-input",
      editButtonId: "night-edit-btn",
      restoreButtonId: "night-restore-btn",
      emptyText: "No night items yet. Add one above.",
      defaultTexts: [...defaultNight],
    },
  },
} as const;
