import { createApiPageStore, fetchPageState, postPageState } from "./pageState";
import { renderChecklistCard } from "./checklistCardTemplate";
import type { TodayLocalTask, TodayPlacement, TodayRoutineItem, TodayState, TodayTimeKind } from "../../config/pages/today";

type RoutineKey = "morning" | "night";

type EducationClass = { id: string; name: string; color?: string };
type EducationAssignment = {
  id: string;
  name: string;
  dueDate: string;
  startTime?: string | null;
  dueTime?: string | null;
  classId?: string;
  completed?: boolean;
  createdAt?: string;
};

type WorkProject = { id: string; name: string; color?: string };
type WorkTask = {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string | null;
  projectId?: string;
  priority?: string;
  status?: string;
  notes?: string;
  estimatedHours?: number | null;
  completed?: boolean;
  createdAt?: string;
};

type WorkMeeting = {
  id: string;
  title: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  projectId?: string;
  location?: string;
  notes?: string;
  completed?: boolean;
  createdAt?: string;
};

type EducationState = {
  classes: EducationClass[];
  assignments: EducationAssignment[];
  removedDefaults?: { classes?: string[] };
};

type WorkState = {
  projects: WorkProject[];
  tasks: WorkTask[];
  meetings: WorkMeeting[];
  removedDefaults?: { projects?: string[] };
};

interface TodayClientConfig {
  pageKey: string;
  defaults: TodayState;
  defaultsMeta: {
    morningTexts: string[];
    nightTexts: string[];
  };
}

type ItemOrigin =
  | { kind: "today"; id: string }
  | { kind: "work-task"; id: string }
  | { kind: "work-meeting"; id: string }
  | { kind: "education-assignment"; id: string };

interface DerivedChecklistItem {
  itemKey: string;
  title: string;
  done: boolean;
  section: TodayPlacement;
  defaultSection: TodayPlacement;
  defaultSortValue: number;
  timeLabel: string;
  meta: string[];
  sourceLabel: string;
  sourceTone: "today" | "work" | "education";
  sourceTypeLabel: string;
  deletable: boolean;
  origin: ItemOrigin;
}

function makeId(prefix = "today") {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return `${prefix}-${window.crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTimeValue(value?: string | null) {
  if (!value) return null;
  const [hours, minutes] = value.split(":");
  const hour = Number(hours);
  const minute = Number(minutes);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function uniqueStrings(items: unknown) {
  if (!Array.isArray(items)) return [] as string[];
  return [...new Set(items.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))];
}

function getEducationAssignmentSortTime(assignment: EducationAssignment) {
  return parseTimeValue(assignment.startTime) ?? parseTimeValue(assignment.dueTime) ?? Number.MAX_SAFE_INTEGER;
}

function getEducationAssignmentTimeLabel(assignment: EducationAssignment) {
  const parts = [
    assignment.startTime ? `Start ${formatTime(assignment.startTime)}` : "",
    assignment.dueTime ? `Due ${formatTime(assignment.dueTime)}` : "",
  ].filter(Boolean);

  return parts.join(" • " );
}

function normalizePlacementOverrides(value: unknown) {
  if (!value || typeof value !== "object") return {} as Record<string, TodayPlacement>;

  const entries = Object.entries(value).filter((entry): entry is [string, TodayPlacement] => {
    const [key, placement] = entry;
    return Boolean(key) && (placement === "ordered" || placement === "nonOrdered");
  });

  return Object.fromEntries(entries);
}

function normalizeRoutineItems(items: unknown, prefix: string) {
  if (!Array.isArray(items)) return [] as TodayRoutineItem[];

  const seen = new Set<string>();
  return items
    .map((item, index) => {
      const text = typeof item === "string"
        ? item.trim()
        : item && typeof item === "object" && typeof (item as TodayRoutineItem).text === "string"
          ? (item as TodayRoutineItem).text.trim()
          : "";

      if (!text || seen.has(text)) return null;
      seen.add(text);

      return {
        id: item && typeof item === "object" && typeof (item as TodayRoutineItem).id === "string"
          ? (item as TodayRoutineItem).id
          : `${prefix}-${index + 1}-${text.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        text,
        done: Boolean(item && typeof item === "object" && (item as TodayRoutineItem).done),
      } satisfies TodayRoutineItem;
    })
    .filter(Boolean) as TodayRoutineItem[];
}

function normalizeLocalTasks(items: unknown, defaults: TodayState["localTasks"]) {
  const normalized: TodayLocalTask[] = [];
  const seen = new Set<string>();
  const source = Array.isArray(items) ? items : [];

  source.forEach((item, index) => {
    const text = typeof item === "string"
      ? item.trim()
      : item && typeof item === "object" && typeof (item as TodayLocalTask).text === "string"
        ? (item as TodayLocalTask).text.trim()
        : "";

    if (!text) return;

    const rawId = item && typeof item === "object" && typeof (item as TodayLocalTask).id === "string"
      ? (item as TodayLocalTask).id
      : `${text}-${index}`;

    if (seen.has(rawId)) return;
    seen.add(rawId);

    const placement = item && typeof item === "object" && (item as TodayLocalTask).placement === "ordered"
      ? "ordered"
      : "nonOrdered";

    const time = item && typeof item === "object" && typeof (item as TodayLocalTask).time === "string" && (item as TodayLocalTask).time
      ? (item as TodayLocalTask).time
      : null;

    const timeKindValue = item && typeof item === "object" ? (item as TodayLocalTask).timeKind : null;
    const timeKind: TodayTimeKind = timeKindValue === "start" || timeKindValue === "due" ? timeKindValue : null;

    normalized.push({
      id: rawId || makeId("today"),
      text,
      done: Boolean(item && typeof item === "object" && (item as TodayLocalTask).done),
      placement,
      time,
      timeKind,
      createdAt: item && typeof item === "object" && typeof (item as TodayLocalTask).createdAt === "string"
        ? (item as TodayLocalTask).createdAt
        : defaults[index]?.createdAt || new Date().toISOString(),
    });
  });

  return normalized;
}

function mergeRoutineDefaults(items: TodayRoutineItem[], defaultTexts: string[], removedDefaults: string[], prefix: string) {
  const merged = [...items];
  const removedSet = new Set(removedDefaults);

  defaultTexts.forEach((text, index) => {
    if (removedSet.has(text) || merged.some((item) => item.text === text)) return;
    merged.push({ id: `${prefix}-default-${index + 1}`, text, done: false });
  });

  return merged;
}

function normalizeTodayState(value: unknown, config: TodayClientConfig): TodayState {
  const saved = value && typeof value === "object" ? (value as Partial<TodayState> & { todos?: unknown }) : null;
  const legacyTodos = Array.isArray(saved?.todos) ? saved?.todos : [];
  const localTaskSource = Array.isArray(saved?.localTasks) && saved?.localTasks.length ? saved.localTasks : legacyTodos;
  const normalizedLocalTasks = normalizeLocalTasks(localTaskSource, config.defaults.localTasks);

  const removedDefaults = {
    morning: uniqueStrings(saved?.removedDefaults?.morning),
    night: uniqueStrings(saved?.removedDefaults?.night),
  };

  const validOrderedKeys = new Set(normalizedLocalTasks.map((task) => `today:${task.id}`));

  return {
    calendarEmbed: typeof saved?.calendarEmbed === "string" ? saved.calendarEmbed : config.defaults.calendarEmbed,
    localTasks: normalizedLocalTasks.length ? normalizedLocalTasks : structuredClone(config.defaults.localTasks),
    manualOrderedIds: uniqueStrings(saved?.manualOrderedIds).filter((itemKey) => validOrderedKeys.has(itemKey) || itemKey.includes(":")),
    placementOverrides: normalizePlacementOverrides(saved?.placementOverrides),
    morning: mergeRoutineDefaults(
      normalizeRoutineItems(saved?.morning, "morning"),
      config.defaultsMeta.morningTexts,
      removedDefaults.morning,
      "morning"
    ),
    night: mergeRoutineDefaults(
      normalizeRoutineItems(saved?.night, "night"),
      config.defaultsMeta.nightTexts,
      removedDefaults.night,
      "night"
    ),
    removedDefaults,
  };
}

function emptyState(text: string) {
  return `<div class="today-empty-state">${escapeHtml(text)}</div>`;
}

function renderTaskList(items: DerivedChecklistItem[], section: TodayPlacement, emptyText: string) {
  if (!items.length) return emptyState(emptyText);

  return `
    <ul class="today-list">
      ${items.map((item, index) => {
        const actionsHtml = section === "ordered"
          ? `
            <div class="today-task-actions">
              <button type="button" class="button-secondary today-mini-btn" data-role="move-up" data-key="${escapeHtml(item.itemKey)}" ${index === 0 ? "disabled" : ""}>Move up</button>
              <button type="button" class="button-secondary today-mini-btn" data-role="move-down" data-key="${escapeHtml(item.itemKey)}" ${index === items.length - 1 ? "disabled" : ""}>Move down</button>
              <button type="button" class="button-secondary today-mini-btn" data-role="move-section" data-key="${escapeHtml(item.itemKey)}" data-target-section="nonOrdered">Move to flexible</button>
              ${item.deletable ? `
                <button
                  type="button"
                  class="delete-mini-button today-delete-btn"
                  data-role="delete-local-task"
                  data-id="${escapeHtml(item.origin.id)}"
                >
                  Delete
                </button>
              ` : ""}
            </div>
          `
          : `
            <div class="today-task-actions">
              <button type="button" class="button-secondary today-mini-btn" data-role="move-section" data-key="${escapeHtml(item.itemKey)}" data-target-section="ordered">Move to ordered</button>
              ${item.deletable ? `
                <button
                  type="button"
                  class="delete-mini-button today-delete-btn"
                  data-role="delete-local-task"
                  data-id="${escapeHtml(item.origin.id)}"
                >
                  Delete
                </button>
              ` : ""}
            </div>
          `;

        return `
          <li>
            ${renderChecklistCard({
              title: item.title,
              done: item.done,
              cardClassName: "today-task-card",
              titleClassName: "today-task-title",
              contentClassName: "today-task-content",
              toplineClassName: "today-task-topline",
              metaClassName: "today-task-meta",
              checkboxWrapClassName: "today-check-wrap",
              checkboxClassName: "today-check",
              checkboxAttrs: {
                "data-role": "toggle",
                "data-kind": item.origin.kind,
                "data-id": item.origin.id,
              },
              badges: [
                { label: item.sourceLabel, className: `assignment-class-tag today-pill today-pill-source-${item.sourceTone}` },
                { label: item.sourceTypeLabel, className: "today-pill" },
                ...(item.timeLabel ? [{ label: item.timeLabel, className: "today-pill today-pill-emphasis" }] : []),
              ],
              meta: item.meta,
              emptyMetaLabel: "Today item",
              actionsHtml,
            }, escapeHtml)}
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

function renderRoutineList(items: TodayRoutineItem[], routineKey: RoutineKey, emptyText: string) {
  if (!items.length) return emptyState(emptyText);

  return `
    <ul class="today-list">
      ${items.map((item) => `
        <li>
          ${renderChecklistCard({
            title: item.text,
            done: item.done,
            cardClassName: "today-task-card",
            titleClassName: "today-routine-text",
            contentClassName: "today-task-content",
            toplineClassName: "today-task-topline",
            metaClassName: "today-task-meta",
            checkboxWrapClassName: "today-check-wrap",
            checkboxClassName: "today-check",
            checkboxAttrs: {
              "data-role": "toggle-routine",
              "data-routine": routineKey,
              "data-id": item.id,
            },
            badges: [{ label: routineKey === "morning" ? "Morning" : "Night", className: "today-pill" }],
            hideMeta: true,
            actionsHtml: `
              <button
                type="button"
                class="delete-mini-button today-delete-btn"
                data-role="delete-routine"
                data-routine="${routineKey}"
                data-id="${escapeHtml(item.id)}"
              >
                Delete
              </button>
            `,
          }, escapeHtml)}
        </li>
      `).join("")}
    </ul>
  `;
}

export function initTodayPage(config: TodayClientConfig) {
  const store = createApiPageStore<TodayState>({
    pageKey: config.pageKey,
    defaults: config.defaults,
    normalize: (value) => normalizeTodayState(value, config),
  });

  const orderedList = document.getElementById("today-ordered-list") as HTMLElement | null;
  const nonOrderedList = document.getElementById("today-nonordered-list") as HTMLElement | null;
  const orderedResetButton = document.getElementById("today-reset-order") as HTMLButtonElement | null;
  const addTaskForm = document.getElementById("today-add-task-form") as HTMLFormElement | null;
  const taskTextInput = document.getElementById("today-task-text") as HTMLInputElement | null;
  const taskTimeKindInput = document.getElementById("today-task-time-kind") as HTMLSelectElement | null;
  const taskTimeInput = document.getElementById("today-task-time") as HTMLInputElement | null;
  const taskPlacementInput = document.getElementById("today-task-placement") as HTMLSelectElement | null;

  const calendarForm = document.getElementById("today-calendar-form") as HTMLFormElement | null;
  const calendarInput = document.getElementById("today-calendar-input") as HTMLInputElement | null;
  const calendarContainer = document.getElementById("today-calendar-container") as HTMLElement | null;
  const calendarClearButton = document.getElementById("today-calendar-clear") as HTMLButtonElement | null;

  const morningForm = document.getElementById("today-morning-form") as HTMLFormElement | null;
  const morningInput = document.getElementById("today-morning-input") as HTMLInputElement | null;
  const morningList = document.getElementById("today-morning-list") as HTMLElement | null;
  const morningRestoreButton = document.getElementById("today-morning-restore") as HTMLButtonElement | null;

  const nightForm = document.getElementById("today-night-form") as HTMLFormElement | null;
  const nightInput = document.getElementById("today-night-input") as HTMLInputElement | null;
  const nightList = document.getElementById("today-night-list") as HTMLElement | null;
  const nightRestoreButton = document.getElementById("today-night-restore") as HTMLButtonElement | null;

  let educationState: EducationState = { classes: [], assignments: [] };
  let workState: WorkState = { projects: [], tasks: [], meetings: [] };

  function getState() {
    return store.getState();
  }

  function setState(next: TodayState | ((current: TodayState) => TodayState)) {
    store.setState(next);
    void store.save();
    renderAll();
  }

  function getEducationClass(classId?: string) {
    return educationState.classes.find((item) => item.id === classId);
  }

  function getWorkProject(projectId?: string) {
    return workState.projects.find((item) => item.id === projectId);
  }

  function getItemKey(origin: ItemOrigin) {
    return `${origin.kind}:${origin.id}`;
  }

  function getPlacementForExternal(itemKey: string, hasTime: boolean) {
    const override = getState().placementOverrides[itemKey];
    if (override) return override;
    return hasTime ? "ordered" : "nonOrdered";
  }

  function getDefaultOrderedItems() {
    const todayKey = toDateKey();
    const state = getState();
    const ordered: DerivedChecklistItem[] = [];

    state.localTasks.forEach((task) => {
      if (task.placement !== "ordered") return;
      ordered.push(makeLocalTaskItem(task, "ordered", "ordered"));
    });

    educationState.assignments
      .filter((assignment) => assignment.dueDate === todayKey && !assignment.completed)
      .forEach((assignment) => {
        const hasTime = Boolean(assignment.startTime || assignment.dueTime);
        const section = getPlacementForExternal(getItemKey({ kind: "education-assignment", id: assignment.id }), hasTime);
        if (section !== "ordered") return;
        ordered.push(makeEducationAssignmentItem(assignment, section, hasTime ? "ordered" : "nonOrdered"));
      });

    workState.tasks
      .filter((task) => task.dueDate === todayKey && !task.completed)
      .forEach((task) => {
        const hasTime = Boolean(task.dueTime);
        const section = getPlacementForExternal(getItemKey({ kind: "work-task", id: task.id }), hasTime);
        if (section !== "ordered") return;
        ordered.push(makeWorkTaskItem(task, section, hasTime ? "ordered" : "nonOrdered"));
      });

    workState.meetings
      .filter((meeting) => meeting.date === todayKey && !meeting.completed)
      .forEach((meeting) => {
        const hasTime = Boolean(meeting.startTime);
        const section = getPlacementForExternal(getItemKey({ kind: "work-meeting", id: meeting.id }), hasTime);
        if (section !== "ordered") return;
        ordered.push(makeWorkMeetingItem(meeting, section, hasTime ? "ordered" : "nonOrdered"));
      });

    ordered.sort((a, b) => a.defaultSortValue - b.defaultSortValue || a.title.localeCompare(b.title));
    return ordered;
  }

  function makeLocalTaskItem(task: TodayLocalTask, section: TodayPlacement, defaultSection: TodayPlacement): DerivedChecklistItem {
    const hasTime = Boolean(task.time);
    const timeLabel = hasTime
      ? `${task.timeKind === "start" ? "Start" : "Due"} ${formatTime(task.time)}`
      : "";

    const meta: string[] = [];
    if (section === "nonOrdered" && hasTime) meta.push("Kept in flexible");
    if (section === "ordered" && !hasTime) meta.push("No time set");

    return {
      itemKey: getItemKey({ kind: "today", id: task.id }),
      title: task.text,
      done: task.done,
      section,
      defaultSection,
      defaultSortValue: parseTimeValue(task.time) ?? Number.MAX_SAFE_INTEGER,
      timeLabel,
      meta,
      sourceLabel: "Today",
      sourceTone: "today",
      sourceTypeLabel: "task",
      deletable: true,
      origin: { kind: "today", id: task.id },
    };
  }

  function makeEducationAssignmentItem(
    assignment: EducationAssignment,
    section: TodayPlacement,
    defaultSection: TodayPlacement
  ): DerivedChecklistItem {
    const course = getEducationClass(assignment.classId);
    const hasTime = Boolean(assignment.startTime || assignment.dueTime);
    const timeLabel = getEducationAssignmentTimeLabel(assignment);
    const meta = [
      course?.name || "Education",
      assignment.startTime ? "Starts today" : "Due today",
      section === "nonOrdered" && hasTime ? "Kept in flexible" : "",
      section === "ordered" && !hasTime ? "No time set" : "",
    ].filter(Boolean);

    return {
      itemKey: getItemKey({ kind: "education-assignment", id: assignment.id }),
      title: assignment.name,
      done: Boolean(assignment.completed),
      section,
      defaultSection,
      defaultSortValue: getEducationAssignmentSortTime(assignment),
      timeLabel,
      meta,
      sourceLabel: "Education",
      sourceTone: "education",
      sourceTypeLabel: "assignment",
      deletable: false,
      origin: { kind: "education-assignment", id: assignment.id },
    };
  }

  function makeWorkTaskItem(task: WorkTask, section: TodayPlacement, defaultSection: TodayPlacement): DerivedChecklistItem {
    const project = getWorkProject(task.projectId);
    const hasTime = Boolean(task.dueTime);
    const timeLabel = task.dueTime ? `Due ${formatTime(task.dueTime)}` : "";
    const meta = [
      project?.name || "Work",
      task.priority ? `${task.priority} priority` : "Due today",
      section === "nonOrdered" && hasTime ? "Kept in flexible" : "",
      section === "ordered" && !hasTime ? "No time set" : "",
    ].filter(Boolean);

    return {
      itemKey: getItemKey({ kind: "work-task", id: task.id }),
      title: task.title,
      done: Boolean(task.completed),
      section,
      defaultSection,
      defaultSortValue: parseTimeValue(task.dueTime) ?? Number.MAX_SAFE_INTEGER,
      timeLabel,
      meta,
      sourceLabel: "Work",
      sourceTone: "work",
      sourceTypeLabel: "task",
      deletable: false,
      origin: { kind: "work-task", id: task.id },
    };
  }

  function makeWorkMeetingItem(meeting: WorkMeeting, section: TodayPlacement, defaultSection: TodayPlacement): DerivedChecklistItem {
    const project = getWorkProject(meeting.projectId);
    const hasTime = Boolean(meeting.startTime);
    const timeLabel = meeting.startTime
      ? `${formatTime(meeting.startTime)}${meeting.endTime ? ` - ${formatTime(meeting.endTime)}` : ""}`
      : "";
    const meta = [
      project?.name || "Work",
      meeting.location || "Meeting",
      section === "nonOrdered" && hasTime ? "Kept in flexible" : "",
      section === "ordered" && !hasTime ? "No time set" : "",
    ].filter(Boolean);

    return {
      itemKey: getItemKey({ kind: "work-meeting", id: meeting.id }),
      title: meeting.title,
      done: Boolean(meeting.completed),
      section,
      defaultSection,
      defaultSortValue: parseTimeValue(meeting.startTime) ?? Number.MAX_SAFE_INTEGER,
      timeLabel,
      meta,
      sourceLabel: "Work",
      sourceTone: "work",
      sourceTypeLabel: "meeting",
      deletable: false,
      origin: { kind: "work-meeting", id: meeting.id },
    };
  }

  function buildDerivedItems() {
    const todayKey = toDateKey();
    const state = getState();
    const orderedByDefault = getDefaultOrderedItems();
    const nonOrdered: DerivedChecklistItem[] = [];

    state.localTasks.forEach((task) => {
      if (task.placement !== "nonOrdered") return;
      nonOrdered.push(makeLocalTaskItem(task, "nonOrdered", "nonOrdered"));
    });

    educationState.assignments
      .filter((assignment) => assignment.dueDate === todayKey && !assignment.completed)
      .forEach((assignment) => {
        const hasTime = Boolean(assignment.startTime || assignment.dueTime);
        const section = getPlacementForExternal(getItemKey({ kind: "education-assignment", id: assignment.id }), hasTime);
        if (section !== "nonOrdered") return;
        nonOrdered.push(makeEducationAssignmentItem(assignment, section, hasTime ? "ordered" : "nonOrdered"));
      });

    workState.tasks
      .filter((task) => task.dueDate === todayKey && !task.completed)
      .forEach((task) => {
        const hasTime = Boolean(task.dueTime);
        const section = getPlacementForExternal(getItemKey({ kind: "work-task", id: task.id }), hasTime);
        if (section !== "nonOrdered") return;
        nonOrdered.push(makeWorkTaskItem(task, section, hasTime ? "ordered" : "nonOrdered"));
      });

    workState.meetings
      .filter((meeting) => meeting.date === todayKey && !meeting.completed)
      .forEach((meeting) => {
        const hasTime = Boolean(meeting.startTime);
        const section = getPlacementForExternal(getItemKey({ kind: "work-meeting", id: meeting.id }), hasTime);
        if (section !== "nonOrdered") return;
        nonOrdered.push(makeWorkMeetingItem(meeting, section, hasTime ? "ordered" : "nonOrdered"));
      });

    const manualIndex = new Map(state.manualOrderedIds.map((itemKey, index) => [itemKey, index]));
    const ordered = [...orderedByDefault].sort((a, b) => {
      const aManual = manualIndex.get(a.itemKey);
      const bManual = manualIndex.get(b.itemKey);
      const aHasManual = typeof aManual === "number";
      const bHasManual = typeof bManual === "number";

      if (aHasManual && bHasManual) return (aManual as number) - (bManual as number);
      if (aHasManual) return -1;
      if (bHasManual) return 1;
      return a.defaultSortValue - b.defaultSortValue || a.title.localeCompare(b.title);
    });

    nonOrdered.sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title));
    return { ordered, nonOrdered };
  }

  function renderCalendar() {
    if (!calendarContainer || !calendarInput) return;
    const { calendarEmbed } = getState();
    calendarInput.value = calendarEmbed || "";
    calendarContainer.innerHTML = calendarEmbed
      ? `<div class="today-calendar-frame"><iframe src="${escapeHtml(calendarEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>`
      : emptyState("No calendar added yet.");
  }

  function renderAll() {
    const { ordered, nonOrdered } = buildDerivedItems();

    if (orderedList) {
      orderedList.innerHTML = renderTaskList(
        ordered,
        "ordered",
        "No ordered items for today yet. Timed work tasks, meetings, and timed Today tasks will appear here."
      );
    }

    if (nonOrderedList) {
      nonOrderedList.innerHTML = renderTaskList(
        nonOrdered,
        "nonOrdered",
        "No flexible items for today yet. Untimed tasks and due-today assignments appear here."
      );
    }

    if (orderedResetButton) {
      orderedResetButton.disabled = getState().manualOrderedIds.length === 0;
    }

    if (morningList) {
      morningList.innerHTML = renderRoutineList(getState().morning, "morning", "No morning items yet.");
    }

    if (nightList) {
      nightList.innerHTML = renderRoutineList(getState().night, "night", "No night items yet.");
    }

    renderCalendar();
  }

  async function loadExternalPageStates() {
    const [educationResponse, workResponse] = await Promise.all([
      fetchPageState<EducationState>("education"),
      fetchPageState<WorkState>("work"),
    ]);

    educationState = {
      classes: Array.isArray(educationResponse?.state?.classes) ? educationResponse?.state?.classes ?? [] : [],
      assignments: Array.isArray(educationResponse?.state?.assignments)
        ? (educationResponse?.state?.assignments ?? []).map((assignment) => ({
            ...assignment,
            startTime: assignment.startTime || null,
            dueTime: assignment.dueTime || null,
          }))
        : [],
      removedDefaults: educationResponse?.state?.removedDefaults,
    };

    workState = {
      projects: Array.isArray(workResponse?.state?.projects) ? workResponse?.state?.projects ?? [] : [],
      tasks: Array.isArray(workResponse?.state?.tasks) ? workResponse?.state?.tasks ?? [] : [],
      meetings: Array.isArray(workResponse?.state?.meetings) ? workResponse?.state?.meetings ?? [] : [],
      removedDefaults: workResponse?.state?.removedDefaults,
    };

    renderAll();
  }

  async function syncOriginToggle(kind: ItemOrigin["kind"], id: string, checked: boolean) {
    if (kind === "today") {
      setState((current) => ({
        ...current,
        localTasks: current.localTasks.map((item) => item.id === id ? { ...item, done: checked } : item),
      }));
      return;
    }

    if (kind === "education-assignment") {
      educationState = {
        ...educationState,
        assignments: educationState.assignments.map((item) => item.id === id ? { ...item, completed: checked } : item),
      };
      renderAll();
      await postPageState("education", educationState);
      return;
    }

    if (kind === "work-task") {
      workState = {
        ...workState,
        tasks: workState.tasks.map((item) => item.id === id
          ? {
              ...item,
              completed: checked,
              status: checked ? "done" : item.status === "done" ? "todo" : item.status,
            }
          : item),
      };
      renderAll();
      await postPageState("work", workState);
      return;
    }

    if (kind === "work-meeting") {
      workState = {
        ...workState,
        meetings: workState.meetings.map((item) => item.id === id ? { ...item, completed: checked } : item),
      };
      renderAll();
      await postPageState("work", workState);
    }
  }

  function updateTaskSection(itemKey: string, targetSection: TodayPlacement) {
    const [kind, id] = itemKey.split(":");
    if (!kind || !id) return;

    const { ordered, nonOrdered } = buildDerivedItems();
    const currentItem = [...ordered, ...nonOrdered].find((item) => item.itemKey === itemKey);
    if (!currentItem) return;

    setState((current) => {
      const nextManualIds = current.manualOrderedIds.filter((entry) => entry !== itemKey);

      if (targetSection === "ordered") {
        nextManualIds.push(itemKey);
      }

      if (kind === "today") {
        return {
          ...current,
          localTasks: current.localTasks.map((item) => item.id === id ? { ...item, placement: targetSection } : item),
          manualOrderedIds: nextManualIds,
        };
      }

      const nextOverrides = { ...current.placementOverrides };

      if (targetSection === currentItem.defaultSection) {
        delete nextOverrides[itemKey];
      } else {
        nextOverrides[itemKey] = targetSection;
      }

      return {
        ...current,
        placementOverrides: nextOverrides,
        manualOrderedIds: nextManualIds,
      };
    });
  }

  function reorderOrderedItem(itemKey: string, direction: -1 | 1) {
    const { ordered } = buildDerivedItems();
    const keys = ordered.map((item) => item.itemKey);
    const index = keys.indexOf(itemKey);
    if (index === -1) return;

    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= keys.length) return;

    [keys[index], keys[swapIndex]] = [keys[swapIndex], keys[index]];

    setState((current) => ({
      ...current,
      manualOrderedIds: keys,
    }));
  }

  function bindTaskListEvents(container: HTMLElement | null) {
    container?.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;

      const deleteButton = target.closest("[data-role='delete-local-task']") as HTMLButtonElement | null;
      if (deleteButton) {
        const id = deleteButton.getAttribute("data-id");
        if (!id) return;

        setState((current) => ({
          ...current,
          localTasks: current.localTasks.filter((item) => item.id !== id),
          manualOrderedIds: current.manualOrderedIds.filter((itemKey) => itemKey !== `today:${id}`),
        }));
        return;
      }

      const moveSectionButton = target.closest("[data-role='move-section']") as HTMLButtonElement | null;
      if (moveSectionButton) {
        const itemKey = moveSectionButton.getAttribute("data-key");
        const targetSection = moveSectionButton.getAttribute("data-target-section");
        if (!itemKey || (targetSection !== "ordered" && targetSection !== "nonOrdered")) return;
        updateTaskSection(itemKey, targetSection);
        return;
      }

      const moveUpButton = target.closest("[data-role='move-up']") as HTMLButtonElement | null;
      if (moveUpButton) {
        const itemKey = moveUpButton.getAttribute("data-key");
        if (!itemKey) return;
        reorderOrderedItem(itemKey, -1);
        return;
      }

      const moveDownButton = target.closest("[data-role='move-down']") as HTMLButtonElement | null;
      if (moveDownButton) {
        const itemKey = moveDownButton.getAttribute("data-key");
        if (!itemKey) return;
        reorderOrderedItem(itemKey, 1);
      }
    });

    container?.addEventListener("change", async (event) => {
      const target = event.target as HTMLInputElement;
      if (target.getAttribute("data-role") !== "toggle") return;

      const kind = target.getAttribute("data-kind") as ItemOrigin["kind"] | null;
      const id = target.getAttribute("data-id");
      if (!kind || !id) return;

      await syncOriginToggle(kind, id, target.checked);
    });
  }

  function bindRoutineEvents(container: HTMLElement | null, routineKey: RoutineKey) {
    container?.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;
      if (target.getAttribute("data-role") !== "toggle-routine") return;

      const id = target.getAttribute("data-id");
      if (!id) return;

      setState((current) => ({
        ...current,
        [routineKey]: current[routineKey].map((item) => item.id === id ? { ...item, done: target.checked } : item),
      }));
    });

    container?.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      const deleteButton = target.closest("[data-role='delete-routine']") as HTMLButtonElement | null;
      if (!deleteButton) return;
      const id = deleteButton.getAttribute("data-id");
      if (!id) return;

      const removedItem = getState()[routineKey].find((item) => item.id === id);

      setState((current) => ({
        ...current,
        [routineKey]: current[routineKey].filter((item) => item.id !== id),
        removedDefaults: removedItem && config.defaultsMeta[`${routineKey}Texts` as const].includes(removedItem.text)
          ? {
              ...current.removedDefaults,
              [routineKey]: current.removedDefaults[routineKey].includes(removedItem.text)
                ? current.removedDefaults[routineKey]
                : [...current.removedDefaults[routineKey], removedItem.text],
            }
          : current.removedDefaults,
      }));
    });
  }

  addTaskForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = taskTextInput?.value.trim() || "";
    const timeKindValue = taskTimeKindInput?.value === "start" || taskTimeKindInput?.value === "due"
      ? taskTimeKindInput.value
      : null;
    const time = taskTimeInput?.value || null;
    const placement = taskPlacementInput?.value === "ordered" ? "ordered" : "nonOrdered";

    if (!text) return;

    const nextTaskId = makeId("today");

    setState((current) => ({
      ...current,
      localTasks: [
        ...current.localTasks,
        {
          id: nextTaskId,
          text,
          done: false,
          placement,
          time,
          timeKind: time ? timeKindValue : null,
          createdAt: new Date().toISOString(),
        },
      ],
      manualOrderedIds: placement === "ordered"
        ? [...current.manualOrderedIds.filter((itemKey) => itemKey !== `today:${nextTaskId}`), `today:${nextTaskId}`]
        : current.manualOrderedIds,
    }));

    addTaskForm.reset();
    if (taskPlacementInput) taskPlacementInput.value = "ordered";
  });

  orderedResetButton?.addEventListener("click", () => {
    setState((current) => ({
      ...current,
      manualOrderedIds: [],
    }));
  });

  calendarForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    setState((current) => ({
      ...current,
      calendarEmbed: calendarInput?.value.trim() || "",
    }));
  });

  calendarClearButton?.addEventListener("click", () => {
    setState((current) => ({
      ...current,
      calendarEmbed: "",
    }));
  });

  morningForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = morningInput?.value.trim() || "";
    if (!text) return;

    setState((current) => ({
      ...current,
      morning: [...current.morning, { id: makeId("morning"), text, done: false }],
      removedDefaults: {
        ...current.removedDefaults,
        morning: current.removedDefaults.morning.filter((item) => item !== text),
      },
    }));

    morningForm.reset();
  });

  nightForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = nightInput?.value.trim() || "";
    if (!text) return;

    setState((current) => ({
      ...current,
      night: [...current.night, { id: makeId("night"), text, done: false }],
      removedDefaults: {
        ...current.removedDefaults,
        night: current.removedDefaults.night.filter((item) => item !== text),
      },
    }));

    nightForm.reset();
  });

  morningRestoreButton?.addEventListener("click", () => {
    setState((current) => normalizeTodayState({
      ...current,
      morning: current.morning.filter((item) => !config.defaultsMeta.morningTexts.includes(item.text)),
      removedDefaults: { ...current.removedDefaults, morning: [] },
    }, config));
  });

  nightRestoreButton?.addEventListener("click", () => {
    setState((current) => normalizeTodayState({
      ...current,
      night: current.night.filter((item) => !config.defaultsMeta.nightTexts.includes(item.text)),
      removedDefaults: { ...current.removedDefaults, night: [] },
    }, config));
  });

  bindTaskListEvents(orderedList);
  bindTaskListEvents(nonOrderedList);
  bindRoutineEvents(morningList, "morning");
  bindRoutineEvents(nightList, "night");

  const cleanupPersistence = store.startLifecyclePersistence();
  window.addEventListener("unload", cleanupPersistence, { once: true });

  void store.load().then(() => {
    renderAll();
    return loadExternalPageStates();
  });
}
