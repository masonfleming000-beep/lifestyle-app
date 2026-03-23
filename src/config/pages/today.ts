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
] as const;

export const defaultCalendarEmbed = "";

export const todayPageConfig = {
  hero: {
    kicker: "Daily dashboard",
    title: "Today",
    description: "Track your calendar, priorities, and routines in one focused view.",
  },
  sections: {
    calendar: {
      title: "Calendar",
      subtitle: "Add or remove your Google Calendar embed.",
      editActionId: "calendar-edit-btn",
      deleteActionId: "calendar-delete-btn",
      formId: "calendar-form",
      inputId: "calendar-input",
      containerId: "calendar-container",
      instructionsId: "calendar-instructions",
      deleteWrapId: "calendar-delete-wrap",
    },
    todo: {
      title: "Today",
      listId: "todo-list",
      formId: "todo-form",
      inputId: "todo-input",
      editActionId: "todo-edit-btn",
      restoreActionId: "todo-restore-btn",
    },
    morning: {
      title: "Morning",
      listId: "morning-list",
      formId: "morning-form",
      inputId: "morning-input",
      editActionId: "morning-edit-btn",
      restoreActionId: "morning-restore-btn",
    },
    night: {
      title: "Night",
      listId: "night-list",
      formId: "night-form",
      inputId: "night-input",
      editActionId: "night-edit-btn",
      restoreActionId: "night-restore-btn",
    },
  },
} as const;

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
