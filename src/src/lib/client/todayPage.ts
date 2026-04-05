import { createApiPageStore, fetchPageState, postPageState } from "./pageState";
import type { TodayLocalTask, TodayRoutineItem, TodayState, TodayTimeKind } from "../../config/pages/today";

type RoutineKey = "morning" | "night";
type TodayPlacement = "ordered" | "nonOrdered";

type EducationClass = { id: string; name: string; color?: string };
type EducationAssignment = {
  id: string;
  name: string;
  dueDate: string;
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

interface DerivedChecklistItem {
  id: string;
  title: string;
  done: boolean;
  ordered: boolean;
  sortValue: number;
  timeLabel: string;
  meta: string[];
  sourceLabel: string;
  sourceTone: "today" | "work" | "education";
  sourceTypeLabel: string;
  deletable: boolean;
  origin:
    | { kind: "today"; id: string }
    | { kind: "work-task"; id: string }
    | { kind: "work-meeting"; id: string }
    | { kind: "education-assignment"; id: string };
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
  const hasExplicitLocalTasks = Array.isArray(saved?.localTasks);
  const hasLegacyTodos = Array.isArray(saved?.todos);
  const legacyTodos = hasLegacyTodos ? saved?.todos : [];
  const localTaskSource = hasExplicitLocalTasks ? saved?.localTasks : legacyTodos;

  const removedDefaults = {
    morning: uniqueStrings(saved?.removedDefaults?.morning),
    night: uniqueStrings(saved?.removedDefaults?.night),
  };

  return {
    calendarEmbed: typeof saved?.calendarEmbed === "string" ? saved.calendarEmbed : config.defaults.calendarEmbed,
    localTasks: hasExplicitLocalTasks || hasLegacyTodos
      ? normalizeLocalTasks(localTaskSource, config.defaults.localTasks)
      : structuredClone(config.defaults.localTasks),
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

function renderTaskList(items: DerivedChecklistItem[], emptyText: string) {
  if (!items.length) return emptyState(emptyText);

  return `
    <ul class="today-list">
      ${items.map((item) => `
        <li class="today-task-card${item.done ? " is-done" : ""}">
          <input
            type="checkbox"
            class="today-check"
            data-role="toggle"
            data-kind="${item.origin.kind}"
            data-id="${escapeHtml(item.origin.id)}"
            ${item.done ? "checked" : ""}
          />

          <div class="today-task-content">
            <p class="today-task-title">${escapeHtml(item.title)}</p>
            <div class="today-task-meta">
              <span class="today-pill today-pill-source-${item.sourceTone}">${escapeHtml(item.sourceLabel)}</span>
              <span class="today-pill">${escapeHtml(item.sourceTypeLabel)}</span>
              ${item.timeLabel ? `<span class="today-pill">${escapeHtml(item.timeLabel)}</span>` : ""}
              ${item.meta.map((meta) => `<span class="today-pill">${escapeHtml(meta)}</span>`).join("")}
            </div>
          </div>

          ${item.deletable ? `
            <button
              type="button"
              class="danger-btn today-delete-btn"
              data-role="delete-local-task"
              data-id="${escapeHtml(item.origin.id)}"
            >
              Delete
            </button>
          ` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function renderRoutineList(items: TodayRoutineItem[], routineKey: RoutineKey, emptyText: string) {
  if (!items.length) return emptyState(emptyText);

  return `
    <ul class="today-list">
      ${items.map((item) => `
        <li class="today-task-card${item.done ? " is-done" : ""}">
          <input
            type="checkbox"
            class="today-check"
            data-role="toggle-routine"
            data-routine="${routineKey}"
            data-id="${escapeHtml(item.id)}"
            ${item.done ? "checked" : ""}
          />

          <div class="today-task-content">
            <p class="today-routine-text">${escapeHtml(item.text)}</p>
          </div>

          <button
            type="button"
            class="danger-btn today-delete-btn"
            data-role="delete-routine"
            data-routine="${routineKey}"
            data-id="${escapeHtml(item.id)}"
          >
            Delete
          </button>
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

  function buildDerivedItems() {
    const todayKey = toDateKey();
    const state = getState();
    const ordered: DerivedChecklistItem[] = [];
    const nonOrdered: DerivedChecklistItem[] = [];

    state.localTasks.forEach((task) => {
      const hasTime = Boolean(task.time);
      const orderedItem = task.placement === "ordered" && hasTime;
      const destination = orderedItem ? ordered : nonOrdered;
      const timeLabel = hasTime
        ? `${task.timeKind === "start" ? "Start" : "Due"} ${formatTime(task.time)}`
        : "";

      destination.push({
        id: `today-${task.id}`,
        title: task.text,
        done: task.done,
        ordered: orderedItem,
        sortValue: parseTimeValue(task.time) ?? Number.MAX_SAFE_INTEGER,
        timeLabel,
        meta: task.placement === "nonOrdered" && hasTime ? ["Kept in non-ordered"] : [],
        sourceLabel: "Today",
        sourceTone: "today",
        sourceTypeLabel: "task",
        deletable: true,
        origin: { kind: "today", id: task.id },
      });
    });

    educationState.assignments
      .filter((assignment) => assignment.dueDate === todayKey && !assignment.completed)
      .forEach((assignment) => {
        const course = getEducationClass(assignment.classId);
        nonOrdered.push({
          id: `education-${assignment.id}`,
          title: assignment.name,
          done: Boolean(assignment.completed),
          ordered: false,
          sortValue: Number.MAX_SAFE_INTEGER,
          timeLabel: "",
          meta: [course?.name || "Education", "Due today"],
          sourceLabel: "Education",
          sourceTone: "education",
          sourceTypeLabel: "assignment",
          deletable: false,
          origin: { kind: "education-assignment", id: assignment.id },
        });
      });

    workState.tasks
      .filter((task) => task.dueDate === todayKey && !task.completed)
      .forEach((task) => {
        const project = getWorkProject(task.projectId);
        const destination = task.dueTime ? ordered : nonOrdered;
        destination.push({
          id: `work-task-${task.id}`,
          title: task.title,
          done: Boolean(task.completed),
          ordered: Boolean(task.dueTime),
          sortValue: parseTimeValue(task.dueTime) ?? Number.MAX_SAFE_INTEGER,
          timeLabel: task.dueTime ? `Due ${formatTime(task.dueTime)}` : "",
          meta: [project?.name || "Work", task.priority ? `${task.priority} priority` : "Due today"].filter(Boolean),
          sourceLabel: "Work",
          sourceTone: "work",
          sourceTypeLabel: "task",
          deletable: false,
          origin: { kind: "work-task", id: task.id },
        });
      });

    workState.meetings
      .filter((meeting) => meeting.date === todayKey && !meeting.completed)
      .forEach((meeting) => {
        const project = getWorkProject(meeting.projectId);
        ordered.push({
          id: `work-meeting-${meeting.id}`,
          title: meeting.title,
          done: Boolean(meeting.completed),
          ordered: true,
          sortValue: parseTimeValue(meeting.startTime) ?? Number.MAX_SAFE_INTEGER,
          timeLabel: meeting.startTime
            ? `${formatTime(meeting.startTime)}${meeting.endTime ? ` - ${formatTime(meeting.endTime)}` : ""}`
            : "",
          meta: [project?.name || "Work", meeting.location || "Meeting"].filter(Boolean),
          sourceLabel: "Work",
          sourceTone: "work",
          sourceTypeLabel: "meeting",
          deletable: false,
          origin: { kind: "work-meeting", id: meeting.id },
        });
      });

    ordered.sort((a, b) => a.sortValue - b.sortValue || a.title.localeCompare(b.title));
    nonOrdered.sort((a, b) => Number(a.done) - Number(b.done) || a.title.localeCompare(b.title));

    return { ordered, nonOrdered };
  }

  function renderCalendar() {
    if (!calendarContainer || !calendarInput) return;
    const { calendarEmbed } = getState();
    calendarInput.value = calendarEmbed || "";
    calendarContainer.innerHTML = calendarEmbed
      ? `<iframe src="${escapeHtml(calendarEmbed)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
      : emptyState("No calendar added yet.");
  }

  function renderAll() {
    const { ordered, nonOrdered } = buildDerivedItems();

    if (orderedList) {
      orderedList.innerHTML = renderTaskList(
        ordered,
        "No timed items for today yet. Timed work tasks, meetings, and timed Today tasks will appear here."
      );
    }

    if (nonOrderedList) {
      nonOrderedList.innerHTML = renderTaskList(
        nonOrdered,
        "No flexible items for today yet. Untimed tasks and due-today assignments appear here."
      );
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

  async function syncOriginToggle(kind: DerivedChecklistItem["origin"]["kind"], id: string, checked: boolean) {
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

  function bindTaskListEvents(container: HTMLElement | null) {
    container?.addEventListener("click", async (event) => {
      const target = event.target as HTMLElement;
      const deleteButton = target.closest("[data-role='delete-local-task']") as HTMLButtonElement | null;
      if (!deleteButton) return;

      const id = deleteButton.getAttribute("data-id");
      if (!id) return;

      setState((current) => ({
        ...current,
        localTasks: current.localTasks.filter((item) => item.id !== id),
      }));
    });

    container?.addEventListener("change", async (event) => {
      const target = event.target as HTMLInputElement;
      if (target.getAttribute("data-role") !== "toggle") return;

      const kind = target.getAttribute("data-kind") as DerivedChecklistItem["origin"]["kind"] | null;
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

    setState((current) => ({
      ...current,
      localTasks: [
        ...current.localTasks,
        {
          id: makeId("today"),
          text,
          done: false,
          placement,
          time,
          timeKind: time ? timeKindValue : null,
          createdAt: new Date().toISOString(),
        },
      ],
    }));

    addTaskForm.reset();
    if (taskPlacementInput) taskPlacementInput.value = "ordered";
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
