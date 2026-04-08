import type { ChecklistItem, EditableCollectionsPageState } from "../../types/ui";
import type { EditableCollectionControllerSection } from "./editableCollections";
import { createEditableCollectionsController, hydrateEditableCollections } from "./editableCollections";
import { createApiPageStore } from "./pageState";

interface FitnessPageState extends EditableCollectionsPageState {}

interface InitFitnessPageOptions {
  pageKey: string;
  defaults: FitnessPageState;
  sections: EditableCollectionControllerSection[];
}

function asCollectionItems(value: unknown, fallback: Array<string | ChecklistItem>) {
  return Array.isArray(value) ? (value as Array<string | ChecklistItem>) : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function initFitnessPage(options: InitFitnessPageOptions) {
  const { pageKey, defaults, sections } = options;

  function normalizeFitnessState(raw: unknown): FitnessPageState {
    const parsed = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const collections =
      parsed.collections && typeof parsed.collections === "object"
        ? (parsed.collections as Record<string, unknown>)
        : {};
    const savedWeeklyNotes = collections.weeklyNotes as
      | { items?: unknown; removedDefaults?: unknown }
      | undefined;

    const state: FitnessPageState = {
      collections: {
        weeklyNotes: {
          items: asCollectionItems(
            savedWeeklyNotes?.items ?? parsed.weeklyNotes,
            defaults.collections.weeklyNotes.items
          ),
          removedDefaults: asStringArray(
            savedWeeklyNotes?.removedDefaults ?? parsed.removedDefaultWeeklyNotes
          ),
        },
      },
    };

    return hydrateEditableCollections(state, sections);
  }

  const store = createApiPageStore<FitnessPageState>({
    pageKey,
    defaults,
    normalize: normalizeFitnessState,
  });

  const controller = createEditableCollectionsController<FitnessPageState>({
    sections,
    getState: store.getState,
    save: () => store.save(),
    queueSave: store.queueSave,
    writeShadow: store.writeShadow,
  });

  store.startLifecyclePersistence();
  controller.bind();
  await store.load();
  controller.renderAll();
}
