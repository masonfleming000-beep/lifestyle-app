import type {
  ChecklistItem,
  EditableCollectionMode,
  EditableCollectionState,
  EditableCollectionsPageState,
} from "../../types/ui";
import { ensureCollectionsRoot } from "./pageState";

export interface EditableCollectionControllerSection {
  key: string;
  mode: EditableCollectionMode;
  listId: string;
  editButtonId: string;
  defaults: string[];
  addLabel?: string;
  restoreLabel?: string;
}

interface EditableCollectionsControllerOptions<State extends EditableCollectionsPageState> {
  sections: EditableCollectionControllerSection[];
  getState: () => State;
  save: () => Promise<void>;
  queueSave: (delayMs?: number) => void;
  writeShadow: () => void;
}

function uniqueStrings(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

export function normalizeStringItems(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  return uniqueStrings(
    items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
  );
}

function readDraftChecklistItems(items: unknown): ChecklistItem[] {
  if (!Array.isArray(items)) return [];

  const draftItems: ChecklistItem[] = [];

  items.forEach((item) => {
    if (typeof item === "string") {
      draftItems.push({
        text: item,
        done: false,
      });
      return;
    }

    if (!item || typeof item !== "object") {
      return;
    }

    draftItems.push({
      text: typeof (item as ChecklistItem).text === "string" ? (item as ChecklistItem).text : "",
      done: Boolean((item as ChecklistItem).done),
    });
  });

  return draftItems;
}

export function normalizeChecklistItems(items: unknown): ChecklistItem[] {
  const draftItems = readDraftChecklistItems(items);
  const seen = new Set<string>();
  const normalized: ChecklistItem[] = [];

  draftItems.forEach((item) => {
    const text = item.text.trim();
    if (!text || seen.has(text)) return;

    seen.add(text);
    normalized.push({
      text,
      done: Boolean(item.done),
    });
  });

  return normalized;
}

function normalizeRemovedDefaults(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return uniqueStrings(
    items
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
  );
}

function hasChecklistItem(items: ChecklistItem[], text: string) {
  return items.some((item) => item.text === text);
}

export function ensureCollectionState(
  section: EditableCollectionControllerSection,
  collection: EditableCollectionState | null | undefined
): EditableCollectionState {
  const defaults = normalizeStringItems(section.defaults);
  const removedDefaults = normalizeRemovedDefaults(collection?.removedDefaults);

  if (section.mode === "checklist") {
    const savedItems = normalizeChecklistItems(collection?.items);
    const items = [...savedItems];

    defaults.forEach((defaultText) => {
      if (!removedDefaults.includes(defaultText) && !hasChecklistItem(items, defaultText)) {
        items.push({ text: defaultText, done: false });
      }
    });

    return {
      items,
      removedDefaults,
    };
  }

  const savedItems = normalizeStringItems(collection?.items);
  const items = [...savedItems];

  defaults.forEach((defaultText) => {
    if (!removedDefaults.includes(defaultText) && !items.includes(defaultText)) {
      items.push(defaultText);
    }
  });

  return {
    items,
    removedDefaults,
  };
}

export function updateRemovedDefaultsFromRaw(
  section: EditableCollectionControllerSection,
  collection: EditableCollectionState
): EditableCollectionState {
  const defaults = normalizeStringItems(section.defaults);
  const currentTexts = section.mode === "checklist"
    ? normalizeChecklistItems(collection.items).map((item) => item.text)
    : normalizeStringItems(collection.items);

  return {
    ...collection,
    removedDefaults: defaults.filter((defaultText) => !currentTexts.includes(defaultText)),
  };
}

export function finalizeCollectionState(
  section: EditableCollectionControllerSection,
  collection: EditableCollectionState | null | undefined
): EditableCollectionState {
  const defaults = normalizeStringItems(section.defaults);
  const normalizedCollection = ensureCollectionState(section, collection);

  if (section.mode === "checklist") {
    const items = normalizeChecklistItems(normalizedCollection.items);
    const removedDefaults = defaults.filter(
      (defaultText) => !items.some((item) => item.text === defaultText)
    );

    const merged = [...items];
    defaults.forEach((defaultText) => {
      if (!removedDefaults.includes(defaultText) && !hasChecklistItem(merged, defaultText)) {
        merged.push({ text: defaultText, done: false });
      }
    });

    return {
      items: merged,
      removedDefaults,
    };
  }

  const items = normalizeStringItems(normalizedCollection.items);
  const removedDefaults = defaults.filter((defaultText) => !items.includes(defaultText));
  const merged = [...items];

  defaults.forEach((defaultText) => {
    if (!removedDefaults.includes(defaultText) && !merged.includes(defaultText)) {
      merged.push(defaultText);
    }
  });

  return {
    items: merged,
    removedDefaults,
  };
}

export function hydrateEditableCollections<State extends EditableCollectionsPageState>(
  state: State,
  sections: EditableCollectionControllerSection[]
): State {
  ensureCollectionsRoot(state);

  sections.forEach((section) => {
    state.collections[section.key] = ensureCollectionState(section, state.collections[section.key]);
  });

  return state;
}

function createDeleteButton(onClick: () => Promise<void> | void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "routine-action-button";
  button.textContent = "Delete";
  button.addEventListener("click", () => {
    void onClick();
  });
  return button;
}

function createActionButton(label: string, onClick: () => Promise<void> | void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "routine-action-button";
  button.textContent = label;
  button.addEventListener("click", () => {
    void onClick();
  });
  return button;
}

export function createEditableCollectionsController<State extends EditableCollectionsPageState>(
  options: EditableCollectionsControllerOptions<State>
) {
  const {
    sections,
    getState,
    save,
    queueSave,
    writeShadow,
  } = options;

  const editMode: Record<string, boolean> = Object.fromEntries(
    sections.map((section) => [section.key, false])
  );

  function getSection(key: string) {
    return sections.find((section) => section.key === key) || null;
  }

  function getCollection(section: EditableCollectionControllerSection) {
    const state = ensureCollectionsRoot(getState());

    if (!state.collections[section.key]) {
      state.collections[section.key] = ensureCollectionState(section, null);
    }

    return state.collections[section.key];
  }

  function setCollection(section: EditableCollectionControllerSection, collection: EditableCollectionState) {
    const state = ensureCollectionsRoot(getState());
    state.collections[section.key] = collection;
    return state.collections[section.key];
  }

  function syncEditButton(section: EditableCollectionControllerSection) {
    const button = document.getElementById(section.editButtonId);

    if (button) {
      button.textContent = editMode[section.key] ? "Done" : "Edit";
    }
  }

  function renderListSection(section: EditableCollectionControllerSection, listEl: HTMLElement) {
    const collection = getCollection(section);
    const items = Array.isArray(collection.items) ? collection.items : [];
    const isEditing = editMode[section.key];

    listEl.innerHTML = "";

    if (!items.length && !isEditing) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "routine-item";
      const emptyText = document.createElement("p");
      emptyText.className = "routine-empty-state";
      emptyText.textContent = listEl.dataset.emptyText || "No items yet.";
      emptyItem.appendChild(emptyText);
      listEl.appendChild(emptyItem);
      return;
    }

    items.forEach((itemText, itemIndex) => {
      const li = document.createElement("li");
      li.className = "routine-item";

      const row = document.createElement("div");
      row.className = "routine-row";

      const left = document.createElement("div");
      left.className = "routine-left";

      if (isEditing) {
        const input = document.createElement("input");
        input.type = "text";
        input.className = "routine-inline-input";
        input.value = typeof itemText === "string" ? itemText : "";

        input.addEventListener("input", () => {
          const liveCollection = getCollection(section);
          liveCollection.items[itemIndex] = input.value;
          setCollection(section, updateRemovedDefaultsFromRaw(section, liveCollection));
          writeShadow();
          queueSave();
        });

        input.addEventListener("change", async () => {
          const finalCollection = getCollection(section);
          finalCollection.items[itemIndex] = input.value;
          setCollection(section, finalizeCollectionState(section, finalCollection));
          renderListSection(section, listEl);
          await save();
        });

        left.appendChild(input);
      } else {
        const text = document.createElement("div");
        text.className = "routine-static-text";
        text.textContent = typeof itemText === "string" ? itemText : "";
        left.appendChild(text);
      }

      row.appendChild(left);

      if (isEditing) {
        row.appendChild(
          createDeleteButton(async () => {
            const nextCollection = getCollection(section);
            nextCollection.items.splice(itemIndex, 1);
            setCollection(section, finalizeCollectionState(section, nextCollection));
            renderListSection(section, listEl);
            await save();
          })
        );
      }

      li.appendChild(row);
      listEl.appendChild(li);
    });

    if (isEditing) {
      const actionsLi = document.createElement("li");
      actionsLi.className = "routine-item";

      const row = document.createElement("div");
      row.className = "routine-row routine-row-actions";

      const left = document.createElement("div");
      left.className = "routine-left";
      row.appendChild(left);

      const actions = document.createElement("div");
      actions.className = "routine-actions-group";

      actions.appendChild(
        createActionButton(section.addLabel || "Add", () => {
          const nextCollection = getCollection(section);
          nextCollection.items.push("");
          setCollection(section, updateRemovedDefaultsFromRaw(section, nextCollection));
          renderListSection(section, listEl);

          const inputs = listEl.querySelectorAll<HTMLInputElement>("input[type='text']");
          const lastInput = inputs[inputs.length - 1];
          lastInput?.focus();
          writeShadow();
          queueSave();
        })
      );

      actions.appendChild(
        createActionButton(section.restoreLabel || "Restore Defaults", async () => {
          const currentItems = normalizeStringItems(getCollection(section).items);
          const defaults = normalizeStringItems(section.defaults);
          const customItems = currentItems.filter((item) => !defaults.includes(item));

          setCollection(section, finalizeCollectionState(section, {
            items: customItems,
            removedDefaults: [],
          }));

          renderListSection(section, listEl);
          await save();
        })
      );

      row.appendChild(actions);
      actionsLi.appendChild(row);
      listEl.appendChild(actionsLi);
    }
  }

  function renderChecklistSection(section: EditableCollectionControllerSection, listEl: HTMLElement) {
    const collection = getCollection(section);
    const isEditing = editMode[section.key];
    const items = isEditing ? readDraftChecklistItems(collection.items) : normalizeChecklistItems(collection.items);

    listEl.innerHTML = "";

    if (!items.length && !isEditing) {
      const emptyItem = document.createElement("li");
      emptyItem.className = "routine-item";
      const emptyText = document.createElement("p");
      emptyText.className = "routine-empty-state";
      emptyText.textContent = listEl.dataset.emptyText || "No items yet.";
      emptyItem.appendChild(emptyText);
      listEl.appendChild(emptyItem);
      return;
    }

    items.forEach((item, itemIndex) => {
      const li = document.createElement("li");
      li.className = `routine-item${!isEditing && item.done ? " is-done" : ""}`;

      const row = document.createElement("div");
      row.className = "routine-row";

      if (isEditing) {
        const left = document.createElement("div");
        left.className = "routine-left";

        const input = document.createElement("input");
        input.type = "text";
        input.className = "routine-inline-input";
        input.value = item.text;

        input.addEventListener("input", () => {
          const liveCollection = getCollection(section);
          const draftItems = readDraftChecklistItems(liveCollection.items);
          if (!draftItems[itemIndex]) return;
          draftItems[itemIndex].text = input.value;
          liveCollection.items = draftItems;
          setCollection(section, updateRemovedDefaultsFromRaw(section, liveCollection));
          writeShadow();
          queueSave();
        });

        input.addEventListener("change", async () => {
          const liveCollection = getCollection(section);
          const draftItems = readDraftChecklistItems(liveCollection.items);
          if (!draftItems[itemIndex]) return;
          draftItems[itemIndex].text = input.value;
          liveCollection.items = draftItems;
          setCollection(section, finalizeCollectionState(section, liveCollection));
          renderChecklistSection(section, listEl);
          await save();
        });

        left.appendChild(input);
        row.appendChild(left);

        row.appendChild(
          createDeleteButton(async () => {
            const nextCollection = getCollection(section);
            const draftItems = readDraftChecklistItems(nextCollection.items);
            draftItems.splice(itemIndex, 1);
            nextCollection.items = draftItems;
            setCollection(section, finalizeCollectionState(section, nextCollection));
            renderChecklistSection(section, listEl);
            await save();
          })
        );
      } else {
        const label = document.createElement("label");
        label.className = "routine-left";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = Boolean(item.done);

        checkbox.addEventListener("change", async () => {
          const nextCollection = getCollection(section);
          const nextItems = normalizeChecklistItems(nextCollection.items);
          if (!nextItems[itemIndex]) return;
          nextItems[itemIndex].done = checkbox.checked;
          nextCollection.items = nextItems;
          setCollection(section, finalizeCollectionState(section, nextCollection));
          renderChecklistSection(section, listEl);
          await save();
        });

        const text = document.createElement("span");
        text.textContent = item.text;

        label.appendChild(checkbox);
        label.appendChild(text);
        row.appendChild(label);
      }

      li.appendChild(row);
      listEl.appendChild(li);
    });

    if (isEditing) {
      const actionsLi = document.createElement("li");
      actionsLi.className = "routine-item";

      const row = document.createElement("div");
      row.className = "routine-row routine-row-actions";

      const left = document.createElement("div");
      left.className = "routine-left";
      row.appendChild(left);

      const actions = document.createElement("div");
      actions.className = "routine-actions-group";

      actions.appendChild(
        createActionButton(section.addLabel || "Add", () => {
          const nextCollection = getCollection(section);
          const draftItems = readDraftChecklistItems(nextCollection.items);
          draftItems.push({ text: "", done: false });
          nextCollection.items = draftItems;
          setCollection(section, updateRemovedDefaultsFromRaw(section, nextCollection));
          renderChecklistSection(section, listEl);

          const inputs = listEl.querySelectorAll<HTMLInputElement>("input[type='text']");
          const lastInput = inputs[inputs.length - 1];
          lastInput?.focus();
          writeShadow();
          queueSave();
        })
      );

      actions.appendChild(
        createActionButton(section.restoreLabel || "Restore Defaults", async () => {
          const currentItems = normalizeChecklistItems(getCollection(section).items);
          const defaults = normalizeStringItems(section.defaults);
          const customItems = currentItems.filter((item) => !defaults.includes(item.text));

          setCollection(section, finalizeCollectionState(section, {
            items: customItems,
            removedDefaults: [],
          }));

          renderChecklistSection(section, listEl);
          await save();
        })
      );

      row.appendChild(actions);
      actionsLi.appendChild(row);
      listEl.appendChild(actionsLi);
    }
  }

  function renderSection(section: EditableCollectionControllerSection) {
    const listEl = document.getElementById(section.listId);
    if (!listEl) return;

    if (section.mode === "checklist") {
      renderChecklistSection(section, listEl);
    } else {
      renderListSection(section, listEl);
    }

    syncEditButton(section);
  }

  function renderAll() {
    sections.forEach((section) => {
      renderSection(section);
    });
  }

  function bind() {
    sections.forEach((section) => {
      const button = document.getElementById(section.editButtonId);
      if (!button || button.dataset.bound === "true") return;

      button.dataset.bound = "true";
      button.addEventListener("click", async () => {
        const currentSection = getSection(section.key);
        if (!currentSection) return;

        const wasEditing = editMode[currentSection.key];
        editMode[currentSection.key] = !wasEditing;

        if (wasEditing) {
          setCollection(currentSection, finalizeCollectionState(currentSection, getCollection(currentSection)));
          await save();
        }

        renderSection(currentSection);
      });
    });
  }

  return {
    renderAll,
    bind,
  };
}
