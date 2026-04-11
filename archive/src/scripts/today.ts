import { createPersistentStore } from "../lib/createPersistentStore";

type ChecklistItem = {
  text: string;
  done: boolean;
};

type TodayState = {
  calendarEmbed: string;
  todos: ChecklistItem[];
  morning: ChecklistItem[];
  night: ChecklistItem[];
  removedDefaults: {
    todos: string[];
    morning: string[];
    night: string[];
  };
};

type TodayDefaultsPayload = {
  calendarEmbed: string;
  todos: ChecklistItem[];
  morningDefaults: string[];
  nightDefaults: string[];
};

const pageKey = "today";

const defaultsEl = document.getElementById("today-defaults");
const defaults: TodayDefaultsPayload = defaultsEl
  ? JSON.parse(defaultsEl.textContent || "{}")
  : {
      calendarEmbed: "",
      todos: [],
      morningDefaults: [],
      nightDefaults: [],
    };

const todoListEl = document.getElementById("todo-list") as HTMLUListElement | null;
const todoForm = document.getElementById("todo-form") as HTMLFormElement | null;
const todoInput = document.getElementById("todo-input") as HTMLInputElement | null;
const todoEditBtn = document.getElementById("todo-edit-btn") as HTMLButtonElement | null;
const todoRestoreBtn = document.getElementById("todo-restore-btn") as HTMLButtonElement | null;

const morningListEl = document.getElementById("morning-list") as HTMLUListElement | null;
const nightListEl = document.getElementById("night-list") as HTMLUListElement | null;

const morningForm = document.getElementById("morning-form") as HTMLFormElement | null;
const nightForm = document.getElementById("night-form") as HTMLFormElement | null;
const morningInput = document.getElementById("morning-input") as HTMLInputElement | null;
const nightInput = document.getElementById("night-input") as HTMLInputElement | null;
const morningEditBtn = document.getElementById("morning-edit-btn") as HTMLButtonElement | null;
const nightEditBtn = document.getElementById("night-edit-btn") as HTMLButtonElement | null;
const morningRestoreBtn = document.getElementById("morning-restore-btn") as HTMLButtonElement | null;
const nightRestoreBtn = document.getElementById("night-restore-btn") as HTMLButtonElement | null;

const calendarForm = document.getElementById("calendar-form") as HTMLFormElement | null;
const calendarInput = document.getElementById("calendar-input") as HTMLInputElement | null;
const calendarContainer = document.getElementById("calendar-container") as HTMLDivElement | null;
const calendarInstructions = document.getElementById("calendar-instructions") as HTMLParagraphElement | null;
const calendarDeleteBtn = document.getElementById("calendar-delete-btn") as HTMLButtonElement | null;
const calendarDeleteWrap = document.getElementById("calendar-delete-wrap") as HTMLDivElement | null;
const calendarEditBtn = document.getElementById("calendar-edit-btn") as HTMLButtonElement | null;

const defaultTodoItems = Array.isArray(defaults.todos) ? defaults.todos : [];
const defaultMorningRoutineItems = Array.isArray(defaults.morningDefaults)
  ? defaults.morningDefaults
  : [];
const defaultNightRoutineItems = Array.isArray(defaults.nightDefaults)
  ? defaults.nightDefaults
  : [];
const defaultCalendarEmbed = typeof defaults.calendarEmbed === "string" ? defaults.calendarEmbed : "";

const defaultTodoTexts = new Set(defaultTodoItems.map((item) => item.text));
const defaultMorningTexts = new Set(defaultMorningRoutineItems);
const defaultNightTexts = new Set(defaultNightRoutineItems);

let editModes = {
  calendar: false,
  todo: false,
  morning: false,
  night: false,
};

function uniqueStrings(items: string[] = []) {
  return [...new Set(items.filter(Boolean))];
}

function mergeDefaults<T>(
  savedItems: T[] | undefined,
  defaultItems: T[],
  keyFn: (item: T) => string,
  removedKeys: string[] = []
) {
  const removedSet = new Set(removedKeys || []);
  const merged = [...(savedItems || [])];

  defaultItems.forEach((defaultItem) => {
    const key = keyFn(defaultItem);
    const exists = merged.some((item) => keyFn(item) === key);

    if (!exists && !removedSet.has(key)) {
      merged.push(defaultItem);
    }
  });

  return merged;
}

function normalizeChecklist(items: ChecklistItem[] = []) {
  return items.map((item) => ({
    text: item.text,
    done: !!item.done,
  }));
}

function normalizeState(saved?: Partial<TodayState> | null): TodayState {
  const removedDefaults = {
    todos: uniqueStrings(saved?.removedDefaults?.todos || []),
    morning: uniqueStrings(saved?.removedDefaults?.morning || []),
    night: uniqueStrings(saved?.removedDefaults?.night || []),
  };

  return {
    calendarEmbed: saved?.calendarEmbed ?? defaultCalendarEmbed,
    removedDefaults,
    todos: normalizeChecklist(
      mergeDefaults(saved?.todos, defaultTodoItems, (item) => item.text, removedDefaults.todos)
    ),
    morning: normalizeChecklist(
      mergeDefaults(
        saved?.morning,
        defaultMorningRoutineItems.map((text) => ({ text, done: false })),
        (item) => item.text,
        removedDefaults.morning
      )
    ),
    night: normalizeChecklist(
      mergeDefaults(
        saved?.night,
        defaultNightRoutineItems.map((text) => ({ text, done: false })),
        (item) => item.text,
        removedDefaults.night
      )
    ),
  };
}

const store = createPersistentStore<TodayState>({
  key: `page-state:${pageKey}`,
  version: 1,
  defaults: normalizeState(),
  merge(defaultsValue, storedValue) {
    return normalizeState({
      ...defaultsValue,
      ...(storedValue || {}),
    });
  },
});

let state = store.load();

function saveState() {
  store.set({
    calendarEmbed: state.calendarEmbed,
    todos: [...state.todos],
    morning: [...state.morning],
    night: [...state.night],
    removedDefaults: {
      todos: [...state.removedDefaults.todos],
      morning: [...state.removedDefaults.morning],
      night: [...state.removedDefaults.night],
    },
  });
}

function markDefaultDeleted(section: "todos" | "morning" | "night", text: string) {
  const arr = state.removedDefaults?.[section] || [];
  if (!arr.includes(text)) {
    state.removedDefaults[section] = [...arr, text];
  }
}

function unmarkDefaultDeleted(section: "todos" | "morning" | "night", text: string) {
  const arr = state.removedDefaults?.[section] || [];
  state.removedDefaults[section] = arr.filter((item) => item !== text);
}

function setVisible(el: HTMLElement | null, visible: boolean, displayValue = "flex") {
  if (!el) return;
  el.style.display = visible ? displayValue : "none";
}

function updateEditUI() {
  if (calendarEditBtn) {
    calendarEditBtn.textContent = editModes.calendar ? "Done" : "Edit";
  }
  if (todoEditBtn) {
    todoEditBtn.textContent = editModes.todo ? "Done" : "Edit";
  }
  if (morningEditBtn) {
    morningEditBtn.textContent = editModes.morning ? "Done" : "Edit";
  }
  if (nightEditBtn) {
    nightEditBtn.textContent = editModes.night ? "Done" : "Edit";
  }

  setVisible(calendarForm, editModes.calendar, "flex");
  setVisible(calendarDeleteWrap, editModes.calendar, "flex");
  setVisible(todoForm, editModes.todo, "flex");
  setVisible(morningForm, editModes.morning, "flex");
  setVisible(nightForm, editModes.night, "flex");
}

function createDeleteButton(onClick: () => void, isVisible: boolean) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Delete";
  btn.className = "today-btn today-btn-danger today-delete-btn";
  btn.style.display = isVisible ? "inline-flex" : "none";
  btn.addEventListener("click", onClick);
  return btn;
}

function createCheckbox(textValue: string, checked: boolean, onChange: () => void) {
  const label = document.createElement("label");
  label.className = "today-item-main";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "today-checkbox";
  checkbox.checked = !!checked;
  checkbox.addEventListener("change", onChange);

  const text = document.createElement("span");
  text.className = "today-item-text";
  text.textContent = textValue;

  label.appendChild(checkbox);
  label.appendChild(text);

  return label;
}

function renderCalendar() {
  if (!calendarContainer) return;

  calendarContainer.innerHTML = "";

  const hasEmbed = !!state.calendarEmbed?.trim();

  if (calendarInstructions) {
    calendarInstructions.style.display = !hasEmbed && editModes.calendar ? "block" : "none";
  }

  if (!hasEmbed) {
    const empty = document.createElement("div");
    empty.className = "today-empty-state";
    empty.textContent = "No calendar added yet. Paste a Google Calendar embed URL above.";
    calendarContainer.appendChild(empty);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.src = state.calendarEmbed;
  iframe.style.border = "0";
  iframe.loading = "lazy";
  iframe.width = "100%";
  iframe.height = "600";
  iframe.className = "today-calendar-frame";

  calendarContainer.appendChild(iframe);
}

function renderTodos() {
  if (!todoListEl) return;
  todoListEl.innerHTML = "";

  state.todos.forEach((todo, index) => {
    const li = document.createElement("li");
    li.className = "today-list-item" + (todo.done ? " is-done" : "");

    const row = document.createElement("div");
    row.className = "today-item-row";

    const main = createCheckbox(todo.text, todo.done, () => {
      state.todos[index].done = !state.todos[index].done;
      renderTodos();
      saveState();
    });

    const deleteBtn = createDeleteButton(() => {
      const removed = state.todos[index];

      if (defaultTodoTexts.has(removed.text)) {
        markDefaultDeleted("todos", removed.text);
      }

      state.todos.splice(index, 1);
      renderTodos();
      saveState();
    }, editModes.todo);

    row.appendChild(main);
    row.appendChild(deleteBtn);
    li.appendChild(row);
    todoListEl.appendChild(li);
  });
}

function renderRoutine(listEl: HTMLUListElement | null, key: "morning" | "night") {
  if (!listEl) return;
  listEl.innerHTML = "";

  const sectionIsEditing = editModes[key];

  state[key].forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "today-list-item today-routine-item" + (item.done ? " is-done" : "");

    const row = document.createElement("div");
    row.className = "today-item-row";

    const main = createCheckbox(item.text, item.done, () => {
      state[key][index].done = !state[key][index].done;
      renderRoutine(listEl, key);
      saveState();
    });

    const deleteBtn = createDeleteButton(() => {
      const removed = state[key][index];

      if (key === "morning" && defaultMorningTexts.has(removed.text)) {
        markDefaultDeleted("morning", removed.text);
      }

      if (key === "night" && defaultNightTexts.has(removed.text)) {
        markDefaultDeleted("night", removed.text);
      }

      state[key].splice(index, 1);
      renderRoutine(listEl, key);
      saveState();
    }, sectionIsEditing);

    row.appendChild(main);
    row.appendChild(deleteBtn);
    li.appendChild(row);
    listEl.appendChild(li);
  });
}

function restoreSection(section: "todos" | "morning" | "night") {
  if (section === "todos") {
    state.removedDefaults.todos = [];
    state.todos = mergeDefaults(state.todos, defaultTodoItems, (item) => item.text, []).map(
      (item) => ({
        text: item.text,
        done: !!item.done,
      })
    );
    renderTodos();
    saveState();
    return;
  }

  if (section === "morning") {
    state.removedDefaults.morning = [];
    state.morning = mergeDefaults(
      state.morning,
      defaultMorningRoutineItems.map((text) => ({ text, done: false })),
      (item) => item.text,
      []
    ).map((item) => ({
      text: item.text,
      done: !!item.done,
    }));
    renderRoutine(morningListEl, "morning");
    saveState();
    return;
  }

  state.removedDefaults.night = [];
  state.night = mergeDefaults(
    state.night,
    defaultNightRoutineItems.map((text) => ({ text, done: false })),
    (item) => item.text,
    []
  ).map((item) => ({
    text: item.text,
    done: !!item.done,
  }));
  renderRoutine(nightListEl, "night");
  saveState();
}

calendarEditBtn?.addEventListener("click", () => {
  editModes.calendar = !editModes.calendar;
  updateEditUI();
  renderCalendar();
});

todoEditBtn?.addEventListener("click", () => {
  editModes.todo = !editModes.todo;
  updateEditUI();
  renderTodos();
});

morningEditBtn?.addEventListener("click", () => {
  editModes.morning = !editModes.morning;
  updateEditUI();
  renderRoutine(morningListEl, "morning");
});

nightEditBtn?.addEventListener("click", () => {
  editModes.night = !editModes.night;
  updateEditUI();
  renderRoutine(nightListEl, "night");
});

todoRestoreBtn?.addEventListener("click", () => {
  restoreSection("todos");
});

morningRestoreBtn?.addEventListener("click", () => {
  restoreSection("morning");
});

nightRestoreBtn?.addEventListener("click", () => {
  restoreSection("night");
});

todoForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = todoInput?.value.trim();
  if (!value) return;

  unmarkDefaultDeleted("todos", value);

  state.todos.unshift({ text: value, done: false });
  if (todoInput) todoInput.value = "";
  renderTodos();
  saveState();
});

morningForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = morningInput?.value.trim();
  if (!value) return;

  unmarkDefaultDeleted("morning", value);

  state.morning.unshift({ text: value, done: false });
  if (morningInput) morningInput.value = "";
  renderRoutine(morningListEl, "morning");
  saveState();
});

nightForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = nightInput?.value.trim();
  if (!value) return;

  unmarkDefaultDeleted("night", value);

  state.night.unshift({ text: value, done: false });
  if (nightInput) nightInput.value = "";
  renderRoutine(nightListEl, "night");
  saveState();
});

calendarForm?.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = calendarInput?.value.trim();
  if (!value) return;

  state.calendarEmbed = value;
  if (calendarInput) calendarInput.value = "";
  renderCalendar();
  saveState();
});

calendarDeleteBtn?.addEventListener("click", () => {
  state.calendarEmbed = "";
  renderCalendar();
  saveState();
});

function init() {
  updateEditUI();
  renderCalendar();
  renderTodos();
  renderRoutine(morningListEl, "morning");
  renderRoutine(nightListEl, "night");
}

init();