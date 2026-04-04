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
] as const;

export const defaultCalendarEmbed = "";

export type TodayPlacement = "ordered" | "nonOrdered";
export type TodayTimeKind = "start" | "due" | null;

export interface TodayRoutineItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TodayLocalTask {
  id: string;
  text: string;
  done: boolean;
  placement: TodayPlacement;
  time: string | null;
  timeKind: TodayTimeKind;
  createdAt: string;
}

export interface TodayState {
  calendarEmbed: string;
  localTasks: TodayLocalTask[];
  morning: TodayRoutineItem[];
  night: TodayRoutineItem[];
  removedDefaults: {
    morning: string[];
    night: string[];
  };
}

export const todayClientConfig = {
  pageKey,
  defaults: {
    calendarEmbed: defaultCalendarEmbed,
    localTasks: starterTodos.map((item, index) => ({
      id: `starter-${index + 1}`,
      text: item.text,
      done: Boolean(item.done),
      placement: "nonOrdered" as const,
      time: null,
      timeKind: null,
      createdAt: new Date(0).toISOString(),
    })),
    morning: defaultMorning.map((text, index) => ({
      id: `morning-${index + 1}`,
      text,
      done: false,
    })),
    night: defaultNight.map((text, index) => ({
      id: `night-${index + 1}`,
      text,
      done: false,
    })),
    removedDefaults: {
      morning: [],
      night: [],
    },
  },
  defaultsMeta: {
    morningTexts: [...defaultMorning],
    nightTexts: [...defaultNight],
  },
};
