import { createApiPageStore } from "./pageState";
import type { TodayState } from "../../config/pages/today";

type ChecklistSectionKey = "todos" | "morning" | "night";

type ChecklistItem = TodayState[ChecklistSectionKey][number];

interface CalendarSectionConfig {
  editButtonId: string;
  formId: string;
  inputId: string;
  containerId: string;
  instructionsId: string;
  deleteButtonId: string;
  deleteWrapId: string;
  emptyText: string;
  frameClassName: string;
}

interface ChecklistSectionConfig {
  listId: string;
  formId: string;
  inputId: string;
  editButtonId: string;
  restoreButtonId: string;
  emptyText: string;
  defaultTexts: string[];
}

interface TodayClientConfig {
  pageKey: string;
  defaults: TodayState;
  sections: {
    calendar: CalendarSectionConfig;
    todos: ChecklistSectionConfig;
    morning: ChecklistSectionConfig;
    night: ChecklistSectionConfig;
  };
}

function uniqueStrings(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  return [...new Set(items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean))];
}

function normalizeChecklistItems(items: unknown): ChecklistItem[] {
  if (!Array.isArray(items)) return [];

  const normalized: ChecklistItem[] = [];
  const seen = new Set<string>();

  items.forEach((item) => {
    const text = typeof item === "string"
      ? item.trim()
      : item && typeof item === "object" && typeof (item as ChecklistItem).text === "string"
        ? (item as ChecklistItem).text.trim()
        : "";

    if (!text || seen.has(text)) return;

    seen.add(text);
    normalized.push({
      text,
      done: Boolean(item && typeof item === "object" && (item as ChecklistItem).done),
    });
  });

  return normalized;
}

function mergeDefaults(items: ChecklistItem[], defaults: string[], removedDefaults: string[]) {
  const merged = [...items];
  const removedSet = new Set(removedDefaults);

  defaults.forEach((text) => {
    if (!removedSet.has(text) && !merged.some((item) => item.text === text)) {
      merged.push({ text, done: false });
    }
  });

  return merged;
}

function normalizeTodayState(value: unknown, defaults: TodayState, sections: TodayClientConfig["sections"]): TodayState {
  const saved = value && typeof value === "object" ? (value as Partial<TodayState>) : null;
  const removedDefaults = {
    todos: uniqueStrings(saved?.removedDefaults?.todos),
    morning: uniqueStrings(saved?.removedDefaults?.morning),
    night: uniqueStrings(saved?.removedDefaults?.night),
  };

  return {
    calendarEmbed: typeof saved?.calendarEmbed === "string" ? saved.calendarEmbed : defaults.calendarEmbed,
    todos: mergeDefaults(
      normalizeChecklistItems(saved?.todos),
      sections.todos.defaultTexts,
      removedDefaults.todos
    ),
    morning: mergeDefaults(
      normalizeChecklistItems(saved?.morning),
      sections.morning.defaultTexts,
      removedDefaults.morning
    ),
    night: mergeDefaults(
      normalizeChecklistItems(saved?.night),
      sections.night.defaultTexts,
      removedDefaults.night
    ),
    removedDefaults,
  };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setVisible(element: HTMLElement | null, visible: boolean, displayValue = "flex") {
  if (!element) return;
  element.style.display = visible ? displayValue : "none";
}

function renderEmptyState(text: string) {
  return `<div class="today-empty-state">${escapeHtml(text)}</div>`;
}

function renderChecklistItems(items: ChecklistItem[], sectionKey: ChecklistSectionKey, isEditing: boolean) {
  return items.map((item, index) => `
    <li class="today-list-item${item.done ? " is-done" : ""}" data-index="${index}">
      <div class="today-item-row">
        <label class="today-item-main">
          <input
            type="checkbox"
            class="today-checkbox"
            data-role="toggle"
            data-section-key="${sectionKey}"
            data-index="${index}"
            ${item.done ? "checked" : ""}
          />
          <span class="today-item-text">${escapeHtml(item.text)}</span>
        </label>
        ${isEditing ? `
          <button
            type="button"
            class="danger-btn today-delete-btn"
            data-role="delete"
            data-section-key="${sectionKey}"
            data-index="${index}"
          >
            Delete
          </button>
        ` : ""}
      </div>
    </li>
  `).join("");
}

export function initTodayPage(config: TodayClientConfig) {
  const store = createApiPageStore<TodayState>({
    pageKey: config.pageKey,
    defaults: config.defaults,
    normalize: (value) => normalizeTodayState(value, config.defaults, config.sections),
  });

  const cleanupPersistence = store.startLifecyclePersistence();
  window.addEventListener("unload", cleanupPersistence, { once: true });

  const editModes = {
    calendar: false,
    todos: false,
    morning: false,
    night: false,
  };

  function getState() {
    return store.getState();
  }

  function setState(next: TodayState | ((current: TodayState) => TodayState)) {
    return store.setState(next);
  }

  function markDefaultDeleted(sectionKey: ChecklistSectionKey, text: string) {
    setState((current) => ({
      ...current,
      removedDefaults: {
        ...current.removedDefaults,
        [sectionKey]: current.removedDefaults[sectionKey].includes(text)
          ? current.removedDefaults[sectionKey]
          : [...current.removedDefaults[sectionKey], text],
      },
    }));
  }

  function unmarkDefaultDeleted(sectionKey: ChecklistSectionKey, text: string) {
    setState((current) => ({
      ...current,
      removedDefaults: {
        ...current.removedDefaults,
        [sectionKey]: current.removedDefaults[sectionKey].filter((item) => item !== text),
      },
    }));
  }

  function updateEditUi() {
    const calendarConfig = config.sections.calendar;
    const calendarEditButton = document.getElementById(calendarConfig.editButtonId);
    const calendarForm = document.getElementById(calendarConfig.formId);
    const calendarDeleteWrap = document.getElementById(calendarConfig.deleteWrapId);
    const calendarInstructions = document.getElementById(calendarConfig.instructionsId);

    if (calendarEditButton) {
      calendarEditButton.textContent = editModes.calendar ? "Done" : "Edit";
    }

    setVisible(calendarForm, editModes.calendar, "flex");
    setVisible(calendarDeleteWrap, editModes.calendar, "flex");
    setVisible(
      calendarInstructions as HTMLElement | null,
      editModes.calendar && !getState().calendarEmbed.trim(),
      "block"
    );

    (["todos", "morning", "night"] as const).forEach((sectionKey) => {
      const section = config.sections[sectionKey];
      const button = document.getElementById(section.editButtonId);
      const form = document.getElementById(section.formId);

      if (button) {
        button.textContent = editModes[sectionKey] ? "Done" : "Edit";
      }

      setVisible(form, editModes[sectionKey], "flex");
    });
  }

  function renderCalendar() {
    const { calendar } = config.sections;
    const container = document.getElementById(calendar.containerId);
    const instructions = document.getElementById(calendar.instructionsId);
    const state = getState();
    const hasEmbed = Boolean(state.calendarEmbed.trim());

    if (!container) return;

    setVisible(instructions as HTMLElement | null, editModes.calendar && !hasEmbed, "block");

    container.innerHTML = hasEmbed
      ? `<iframe src="${escapeHtml(state.calendarEmbed)}" style="border:0" loading="lazy" width="100%" height="600" class="${calendar.frameClassName}"></iframe>`
      : renderEmptyState(calendar.emptyText);
  }

  function renderChecklistSection(sectionKey: ChecklistSectionKey) {
    const section = config.sections[sectionKey];
    const list = document.getElementById(section.listId);
    const items = getState()[sectionKey];

    if (!list) return;

    list.innerHTML = items.length
      ? renderChecklistItems(items, sectionKey, editModes[sectionKey])
      : renderEmptyState(section.emptyText);
  }

  function renderAll() {
    updateEditUi();
    renderCalendar();
    renderChecklistSection("todos");
    renderChecklistSection("morning");
    renderChecklistSection("night");
  }

  function restoreSection(sectionKey: ChecklistSectionKey) {
    const defaults = config.sections[sectionKey].defaultTexts;

    setState((current) => {
      const currentItems = current[sectionKey];
      const defaultSet = new Set(defaults);
      const customItems = currentItems.filter((item) => !defaultSet.has(item.text));

      return normalizeTodayState({
        ...current,
        [sectionKey]: customItems,
        removedDefaults: {
          ...current.removedDefaults,
          [sectionKey]: [],
        },
      }, config.defaults, config.sections);
    });
  }

  function bindChecklistForm(sectionKey: ChecklistSectionKey) {
    const section = config.sections[sectionKey];
    const form = document.getElementById(section.formId) as HTMLFormElement | null;
    const input = document.getElementById(section.inputId) as HTMLInputElement | null;
    const restoreButton = document.getElementById(section.restoreButtonId);
    const editButton = document.getElementById(section.editButtonId);

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = input?.value.trim() || "";
      if (!value) return;

      unmarkDefaultDeleted(sectionKey, value);
      setState((current) => ({
        ...current,
        [sectionKey]: [{ text: value, done: false }, ...current[sectionKey]],
      }));

      if (input) {
        input.value = "";
      }

      renderChecklistSection(sectionKey);
      await store.save();
    });

    restoreButton?.addEventListener("click", async () => {
      restoreSection(sectionKey);
      renderChecklistSection(sectionKey);
      await store.save();
    });

    editButton?.addEventListener("click", async () => {
      editModes[sectionKey] = !editModes[sectionKey];
      renderChecklistSection(sectionKey);
      updateEditUi();
      if (!editModes[sectionKey]) {
        await store.save();
      }
    });
  }

  function bindCalendar() {
    const { calendar } = config.sections;
    const editButton = document.getElementById(calendar.editButtonId);
    const form = document.getElementById(calendar.formId) as HTMLFormElement | null;
    const input = document.getElementById(calendar.inputId) as HTMLInputElement | null;
    const deleteButton = document.getElementById(calendar.deleteButtonId);

    editButton?.addEventListener("click", () => {
      editModes.calendar = !editModes.calendar;
      updateEditUi();
      renderCalendar();
    });

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const value = input?.value.trim() || "";
      if (!value) return;

      setState((current) => ({
        ...current,
        calendarEmbed: value,
      }));

      if (input) {
        input.value = "";
      }

      renderCalendar();
      await store.save();
    });

    deleteButton?.addEventListener("click", async () => {
      setState((current) => ({
        ...current,
        calendarEmbed: "",
      }));
      renderCalendar();
      await store.save();
    });
  }

  function bindListEvents() {
    document.addEventListener("change", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.dataset.role !== "toggle") return;

      const sectionKey = target.dataset.sectionKey as ChecklistSectionKey | undefined;
      const rawIndex = target.dataset.index;
      if (!sectionKey || rawIndex === undefined) return;

      const index = Number.parseInt(rawIndex, 10);
      if (Number.isNaN(index)) return;

      setState((current) => ({
        ...current,
        [sectionKey]: current[sectionKey].map((item, itemIndex) => (
          itemIndex === index ? { ...item, done: target.checked } : item
        )),
      }));

      renderChecklistSection(sectionKey);
      await store.save();
    });

    document.addEventListener("click", async (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const button = target.closest<HTMLElement>("[data-role='delete']");
      if (!button) return;

      const sectionKey = button.dataset.sectionKey as ChecklistSectionKey | undefined;
      const rawIndex = button.dataset.index;
      if (!sectionKey || rawIndex === undefined) return;

      const index = Number.parseInt(rawIndex, 10);
      if (Number.isNaN(index)) return;

      const removedItem = getState()[sectionKey][index];
      if (!removedItem) return;

      if (config.sections[sectionKey].defaultTexts.includes(removedItem.text)) {
        markDefaultDeleted(sectionKey, removedItem.text);
      }

      setState((current) => ({
        ...current,
        [sectionKey]: current[sectionKey].filter((_, itemIndex) => itemIndex !== index),
      }));

      renderChecklistSection(sectionKey);
      await store.save();
    });
  }

  bindCalendar();
  bindChecklistForm("todos");
  bindChecklistForm("morning");
  bindChecklistForm("night");
  bindListEvents();

  renderAll();

  void store.load().then(() => {
    renderAll();
  });
}
