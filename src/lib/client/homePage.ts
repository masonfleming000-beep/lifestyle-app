import { createApiPageStore } from "./pageState";
import type { HomeState } from "../../config/pages/home";
import type { NoteCollectionItem, QuoteCollectionItem } from "../../types/ui";

interface HomeSectionConfig {
  listId: string;
  formId: string;
  textInputId: string;
  secondaryInputId: string;
  restoreButtonId: string;
  emptyText: string;
}

interface HomeClientConfig {
  pageKey: string;
  navViewStorageKey: string;
  defaults: HomeState;
  sections: {
    navigation: {
      containerId: string;
      gridButtonId: string;
      listButtonId: string;
    };
    quotes: HomeSectionConfig;
    morals: HomeSectionConfig;
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

function uniqueStrings(items: unknown): string[] {
  if (!Array.isArray(items)) return [];

  return [...new Set(items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean))];
}

function quoteKey(item: QuoteCollectionItem) {
  return `${item.text.trim()}::${(item.author || "").trim()}`;
}

function moralKey(item: NoteCollectionItem) {
  return `${item.title.trim()}::${item.text.trim()}`;
}

function normalizeQuotes(items: unknown): QuoteCollectionItem[] {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  const normalized: QuoteCollectionItem[] = [];

  items.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const text = typeof (item as QuoteCollectionItem).text === "string" ? (item as QuoteCollectionItem).text.trim() : "";
    const author = typeof (item as QuoteCollectionItem).author === "string" ? (item as QuoteCollectionItem).author.trim() : "";
    if (!text) return;

    const normalizedItem = {
      text,
      author: author || "Personal reminder",
    };

    const key = quoteKey(normalizedItem);
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(normalizedItem);
  });

  return normalized;
}

function normalizeMorals(items: unknown): NoteCollectionItem[] {
  if (!Array.isArray(items)) return [];

  const seen = new Set<string>();
  const normalized: NoteCollectionItem[] = [];

  items.forEach((item) => {
    if (!item || typeof item !== "object") return;

    const title = typeof (item as NoteCollectionItem).title === "string" ? (item as NoteCollectionItem).title.trim() : "";
    const text = typeof (item as NoteCollectionItem).text === "string" ? (item as NoteCollectionItem).text.trim() : "";
    if (!title || !text) return;

    const normalizedItem = { title, text };
    const key = moralKey(normalizedItem);
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push(normalizedItem);
  });

  return normalized;
}

function mergeDefaults<T>(items: T[], defaults: readonly T[], removed: string[], getKey: (item: T) => string) {
  const merged = [...items];
  const existing = new Set(merged.map(getKey));
  const removedSet = new Set(removed);

  defaults.forEach((item) => {
    const key = getKey(item);
    if (removedSet.has(key) || existing.has(key)) return;
    merged.push(item);
    existing.add(key);
  });

  return merged;
}


function prependUnique<T>(items: T[], newItem: T, getKey: (item: T) => string) {
  const newKey = getKey(newItem);
  return [newItem, ...items.filter((item) => getKey(item) !== newKey)];
}

function normalizeHomeState(value: unknown, defaults: HomeState): HomeState {
  const saved = value && typeof value === "object" ? (value as Partial<HomeState>) : null;
  const removedDefaultQuotes = uniqueStrings(saved?.removedDefaultQuotes);
  const removedDefaultMorals = uniqueStrings(saved?.removedDefaultMorals);

  return {
    quotes: mergeDefaults(
      normalizeQuotes(saved?.quotes),
      defaults.quotes,
      removedDefaultQuotes,
      quoteKey
    ),
    morals: mergeDefaults(
      normalizeMorals(saved?.morals),
      defaults.morals,
      removedDefaultMorals,
      moralKey
    ),
    removedDefaultQuotes,
    removedDefaultMorals,
  };
}

function renderEmptyState(text: string) {
  return `<div class="today-empty-state">${escapeHtml(text)}</div>`;
}

function renderQuoteCards(items: QuoteCollectionItem[]) {
  return items.map((item, index) => `
    <article class="quote-card surface-section home-quote-card">
      <div>
        <p class="quote-text">“${escapeHtml(item.text)}”</p>
        <span class="quote-author">${escapeHtml(item.author || "Personal reminder")}</span>
      </div>
      <button class="button-secondary delete-btn" data-role="delete-quote" data-index="${index}" type="button">Remove</button>
    </article>
  `).join("");
}

function renderReminderCards(items: NoteCollectionItem[]) {
  return items.map((item, index) => `
    <article class="note-card note-card-padded home-reminder-card">
      <div>
        <h3 class="card-title">${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.text)}</p>
      </div>
      <button class="button-secondary delete-btn" data-role="delete-reminder" data-index="${index}" type="button">Remove</button>
    </article>
  `).join("");
}

export function initHomePage(config: HomeClientConfig) {
  const store = createApiPageStore<HomeState>({
    pageKey: config.pageKey,
    defaults: config.defaults,
    normalize: (value) => normalizeHomeState(value, config.defaults),
  });

  const cleanupPersistence = store.startLifecyclePersistence();
  window.addEventListener("unload", cleanupPersistence, { once: true });

  function getState() {
    return store.getState();
  }

  function setState(next: HomeState | ((current: HomeState) => HomeState)) {
    return store.setState(next);
  }

  function setNavView(view: string) {
    const container = document.getElementById(config.sections.navigation.containerId);
    const gridButton = document.getElementById(config.sections.navigation.gridButtonId);
    const listButton = document.getElementById(config.sections.navigation.listButtonId);
    const normalized = view === "list" ? "list" : "grid";

    if (container) {
      container.classList.remove("quick-links-grid--grid", "quick-links-grid--list", "quick-links-grid--triple");
      container.classList.add(normalized === "list" ? "quick-links-grid--list" : "quick-links-grid--grid");
      container.setAttribute("data-view", normalized);
    }

    [gridButton, listButton].forEach((button) => {
      if (!button) return;
      const isActive = button.dataset.action === normalized;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    window.localStorage.setItem(config.navViewStorageKey, normalized);
  }

  function renderQuotes() {
    const container = document.getElementById(config.sections.quotes.listId);
    if (!container) return;
    const items = getState().quotes;
    container.innerHTML = items.length ? renderQuoteCards(items) : renderEmptyState(config.sections.quotes.emptyText);
  }

  function renderMorals() {
    const container = document.getElementById(config.sections.morals.listId);
    if (!container) return;
    const items = getState().morals;
    container.innerHTML = items.length ? renderReminderCards(items) : renderEmptyState(config.sections.morals.emptyText);
  }

  function renderAll() {
    renderQuotes();
    renderMorals();
  }

  function bindNavigation() {
    const gridButton = document.getElementById(config.sections.navigation.gridButtonId);
    const listButton = document.getElementById(config.sections.navigation.listButtonId);
    const savedView = window.localStorage.getItem(config.navViewStorageKey);

    setNavView(savedView === "list" ? "list" : "grid");

    gridButton?.addEventListener("click", (event) => {
      event.preventDefault();
      setNavView("grid");
    });
    listButton?.addEventListener("click", (event) => {
      event.preventDefault();
      setNavView("list");
    });
  }

  function bindQuoteControls() {
    const form = document.getElementById(config.sections.quotes.formId) as HTMLFormElement | null;
    const textInput = document.getElementById(config.sections.quotes.textInputId) as HTMLInputElement | null;
    const authorInput = document.getElementById(config.sections.quotes.secondaryInputId) as HTMLInputElement | null;
    const restoreButton = document.getElementById(config.sections.quotes.restoreButtonId);
    const list = document.getElementById(config.sections.quotes.listId);

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const text = textInput?.value.trim() || "";
      const author = authorInput?.value.trim() || "Personal reminder";
      if (!text) return;

      const newItem = { text, author };
      const newKey = quoteKey(newItem);

      setState((current) => ({
        ...current,
        quotes: prependUnique(current.quotes, newItem, quoteKey),
        removedDefaultQuotes: current.removedDefaultQuotes.filter((item) => item !== newKey),
      }));

      form.reset();
      renderQuotes();
      await store.save();
    });

    restoreButton?.addEventListener("click", async () => {
      setState((current) => normalizeHomeState({
        ...current,
        removedDefaultQuotes: [],
      }, config.defaults));
      renderQuotes();
      await store.save();
    });

    list?.addEventListener("click", async (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("[data-role='delete-quote']") as HTMLElement | null;
      if (!button) return;

      const index = Number(button.dataset.index || "-1");
      const item = getState().quotes[index];
      if (!item) return;
      const key = quoteKey(item);

      setState((current) => ({
        ...current,
        quotes: current.quotes.filter((_, itemIndex) => itemIndex !== index),
        removedDefaultQuotes: config.defaults.quotes.some((defaultItem) => quoteKey(defaultItem) === key)
          ? (current.removedDefaultQuotes.includes(key)
            ? current.removedDefaultQuotes
            : [...current.removedDefaultQuotes, key])
          : current.removedDefaultQuotes,
      }));

      renderQuotes();
      await store.save();
    });
  }

  function bindReminderControls() {
    const form = document.getElementById(config.sections.morals.formId) as HTMLFormElement | null;
    const titleInput = document.getElementById(config.sections.morals.textInputId) as HTMLInputElement | null;
    const textInput = document.getElementById(config.sections.morals.secondaryInputId) as HTMLTextAreaElement | null;
    const restoreButton = document.getElementById(config.sections.morals.restoreButtonId);
    const list = document.getElementById(config.sections.morals.listId);

    form?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = titleInput?.value.trim() || "";
      const text = textInput?.value.trim() || "";
      if (!title || !text) return;

      const newItem = { title, text };
      const newKey = moralKey(newItem);

      setState((current) => ({
        ...current,
        morals: prependUnique(current.morals, newItem, moralKey),
        removedDefaultMorals: current.removedDefaultMorals.filter((item) => item !== newKey),
      }));

      form.reset();
      renderMorals();
      await store.save();
    });

    restoreButton?.addEventListener("click", async () => {
      setState((current) => normalizeHomeState({
        ...current,
        removedDefaultMorals: [],
      }, config.defaults));
      renderMorals();
      await store.save();
    });

    list?.addEventListener("click", async (event) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest("[data-role='delete-reminder']") as HTMLElement | null;
      if (!button) return;

      const index = Number(button.dataset.index || "-1");
      const item = getState().morals[index];
      if (!item) return;
      const key = moralKey(item);

      setState((current) => ({
        ...current,
        morals: current.morals.filter((_, itemIndex) => itemIndex !== index),
        removedDefaultMorals: config.defaults.morals.some((defaultItem) => moralKey(defaultItem) === key)
          ? (current.removedDefaultMorals.includes(key)
            ? current.removedDefaultMorals
            : [...current.removedDefaultMorals, key])
          : current.removedDefaultMorals,
      }));

      renderMorals();
      await store.save();
    });
  }

  async function init() {
    await store.load();
    bindNavigation();
    bindQuoteControls();
    bindReminderControls();
    renderAll();
  }

  void init();
}
