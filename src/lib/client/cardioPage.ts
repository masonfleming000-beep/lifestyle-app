import type { ChecklistItem, EditableCollectionsPageState } from "../../types/ui";
import type { EditableCollectionControllerSection } from "./editableCollections";
import { createEditableCollectionsController, hydrateEditableCollections } from "./editableCollections";
import { createApiPageStore, fetchPageState, postPageState } from "./pageState";

interface CardioPageState extends EditableCollectionsPageState {
  stravaEmbed: string;
}

interface CardioSessionMetrics {
  totalDistance?: string | number;
  totalTimeDisplay?: string;
  averagePaceDisplay?: string;
  fastestSplitDisplay?: string;
  slowestSplitDisplay?: string;
  tempoPaceDisplay?: string;
  averageSprintTimeDisplay?: string;
  fastestSprintDisplay?: string;
  workRestRatio?: string;
  averageWatts?: string | number;
  maxWatts?: string | number;
  completionPercent?: string | number;
}

interface CardioSessionStep {
  text?: string;
  actual?: string;
}

interface CardioSession {
  id?: string;
  title?: string;
  summary?: string;
  notes?: string;
  dateTime?: string;
  metrics?: CardioSessionMetrics;
  steps?: CardioSessionStep[];
}

interface FitnessHistoryState {
  cardioSessions?: CardioSession[];
  weightliftingSessions?: Array<{ dateTime?: string }>;
}

interface InitCardioPageOptions {
  pageKey: string;
  defaults: CardioPageState;
  sections: EditableCollectionControllerSection[];
  stravaContainerId: string;
  savedSessionsContainerId: string;
  fitnessHistoryPageKey: string;
  profileStatsPageKey: string;
  fallbackRecentSessions: Array<{ title?: string; detail?: string }>;
}

function asCollectionItems(value: unknown, fallback: Array<string | ChecklistItem>) {
  return Array.isArray(value) ? (value as Array<string | ChecklistItem>) : fallback;
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function extractStravaSrc(value: string) {
  if (!value) return "";

  const trimmed = value.trim();

  if (trimmed.startsWith("<iframe")) {
    const srcMatch = trimmed.match(/src=['\"]([^'\"]+)['\"]/i);
    return srcMatch?.[1] || "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return "";
}

export async function initCardioPage(options: InitCardioPageOptions) {
  const {
    pageKey,
    defaults,
    sections,
    stravaContainerId,
    savedSessionsContainerId,
    fitnessHistoryPageKey,
    profileStatsPageKey,
    fallbackRecentSessions,
  } = options;

  let cardioHistory: CardioSession[] = [];
  let weightliftingHistory: Array<{ dateTime?: string }> = [];

  function normalizeCardioState(raw: unknown): CardioPageState {
    const parsed = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const collections =
      parsed.collections && typeof parsed.collections === "object"
        ? (parsed.collections as Record<string, unknown>)
        : {};
    const removedDefaults =
      parsed.removedDefaults && typeof parsed.removedDefaults === "object"
        ? (parsed.removedDefaults as Record<string, unknown>)
        : {};

    const rulesCollection = collections.rules as { items?: unknown; removedDefaults?: unknown } | undefined;
    const goalsCollection = collections.goals as { items?: unknown; removedDefaults?: unknown } | undefined;
    const warmupCollection = collections.warmup as { items?: unknown; removedDefaults?: unknown } | undefined;
    const cooldownCollection = collections.cooldown as { items?: unknown; removedDefaults?: unknown } | undefined;

    const state: CardioPageState = {
      stravaEmbed:
        typeof parsed.stravaEmbed === "string"
          ? parsed.stravaEmbed
          : defaults.stravaEmbed,
      collections: {
        rules: {
          items: asCollectionItems(rulesCollection?.items ?? parsed.rules, defaults.collections.rules.items),
          removedDefaults: asStringArray(rulesCollection?.removedDefaults ?? removedDefaults.rules),
        },
        goals: {
          items: asCollectionItems(goalsCollection?.items ?? parsed.goals, defaults.collections.goals.items),
          removedDefaults: asStringArray(goalsCollection?.removedDefaults ?? removedDefaults.goals),
        },
        warmup: {
          items: asCollectionItems(warmupCollection?.items ?? parsed.warmup, defaults.collections.warmup.items),
          removedDefaults: asStringArray(warmupCollection?.removedDefaults ?? removedDefaults.warmup),
        },
        cooldown: {
          items: asCollectionItems(cooldownCollection?.items ?? parsed.cooldown, defaults.collections.cooldown.items),
          removedDefaults: asStringArray(cooldownCollection?.removedDefaults ?? removedDefaults.cooldown),
        },
      },
    };

    return hydrateEditableCollections(state, sections);
  }

  const store = createApiPageStore<CardioPageState>({
    pageKey,
    defaults,
    normalize: normalizeCardioState,
  });

  const controller = createEditableCollectionsController<CardioPageState>({
    sections,
    getState: store.getState,
    save: () => store.save(),
    queueSave: store.queueSave,
    writeShadow: store.writeShadow,
  });

  async function loadFitnessHistory() {
    const response = await fetchPageState<FitnessHistoryState>(fitnessHistoryPageKey);
    const history = response?.state || {};

    return {
      weightliftingSessions: Array.isArray(history.weightliftingSessions)
        ? history.weightliftingSessions
        : [],
      cardioSessions: Array.isArray(history.cardioSessions) ? history.cardioSessions : [],
    };
  }

  async function saveFitnessHistory(nextState: FitnessHistoryState) {
    await postPageState(fitnessHistoryPageKey, nextState);
  }

  async function loadProfileStats() {
    const response = await fetchPageState<Record<string, unknown>>(profileStatsPageKey);
    return response?.state || { fitness: {}, hobbies: {} };
  }

  function buildFitnessStats(historyState: FitnessHistoryState) {
    const weightSessions = Array.isArray(historyState.weightliftingSessions)
      ? historyState.weightliftingSessions
      : [];
    const cardioSessions = Array.isArray(historyState.cardioSessions)
      ? historyState.cardioSessions
      : [];
    const latestDate = [...weightSessions, ...cardioSessions]
      .map((item) => item?.dateTime || "")
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || "";

    return {
      totalWeightliftingSessions: weightSessions.length,
      totalCardioSessions: cardioSessions.length,
      totalFitnessSessions: weightSessions.length + cardioSessions.length,
      lastWorkoutAt: latestDate,
      updatedAt: new Date().toISOString(),
    };
  }

  async function syncFitnessStats() {
    const existingStats = await loadProfileStats();
    await postPageState(profileStatsPageKey, {
      ...existingStats,
      fitness: buildFitnessStats({
        weightliftingSessions: weightliftingHistory,
        cardioSessions: cardioHistory,
      }),
    });
  }

  function renderStrava() {
    const container = document.getElementById(stravaContainerId);
    if (!container) return;

    container.innerHTML = "";
    const state = store.getState();

    if (!state.stravaEmbed) {
      const wrapper = document.createElement("div");
      wrapper.className = "strava-empty-state";
      wrapper.innerHTML = `
        <div class="card">
          <p class="section-subtitle">No Strava embed added yet.</p>
          <div class="strava-guide">
            <p><strong>How to find your embed link:</strong></p>
            <ol>
              <li>Login to Strava</li>
              <li>Go to <strong>My Profile</strong></li>
              <li>Scroll to the bottom to <strong>Share Your Activities</strong></li>
              <li>Click <strong>Share your activities</strong></li>
              <li>Copy the embed code and paste it below</li>
            </ol>
            <p class="embed-example-label">Expected format:</p>
            <code class="embed-example">&lt;iframe height='454' width='300' frameborder='0' allowtransparency='true' scrolling='no' src='https://www.strava.com/athletes/115475457/latest-rides/6aa243149a11d283a34873ef8f65f506d1cba24e'&gt;&lt;/iframe&gt;</code>
          </div>
        </div>
      `;

      const form = document.createElement("div");
      form.className = "strava-form";

      const textarea = document.createElement("textarea");
      textarea.className = "routine-input";
      textarea.rows = 5;
      textarea.placeholder = "Paste Strava iframe embed code here";

      const saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.className = "button-primary";
      saveButton.textContent = "Save Strava Embed";

      const feedback = document.createElement("p");
      feedback.className = "section-subtitle";

      saveButton.addEventListener("click", async () => {
        const src = extractStravaSrc(textarea.value);

        if (!src) {
          feedback.textContent = "Please paste a valid Strava iframe embed code or URL.";
          return;
        }

        store.getState().stravaEmbed = src;
        renderStrava();
        await store.save();
      });

      form.appendChild(textarea);
      form.appendChild(saveButton);
      form.appendChild(feedback);
      wrapper.appendChild(form);
      container.appendChild(wrapper);
      return;
    }

    const shell = document.createElement("div");
    shell.className = "running-embed-shell";

    const iframe = document.createElement("iframe");
    iframe.src = state.stravaEmbed;
    iframe.title = "Strava latest cardio activities";
    iframe.setAttribute("frameborder", "0");
    iframe.setAttribute("scrolling", "no");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allowtransparency", "true");
    shell.appendChild(iframe);

    const actions = document.createElement("div");
    actions.className = "editor-toolbar";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "button-secondary";
    clearButton.textContent = "Remove Embed";
    clearButton.addEventListener("click", async () => {
      store.getState().stravaEmbed = "";
      renderStrava();
      await store.save();
    });

    actions.appendChild(clearButton);
    container.appendChild(shell);
    container.appendChild(actions);
  }

  function renderSavedCardioSessions() {
    const container = document.getElementById(savedSessionsContainerId);
    if (!container) return;

    if (!cardioHistory.length) {
      if (fallbackRecentSessions.length) {
        container.innerHTML = `
          <ul class="list-clean">
            ${fallbackRecentSessions
              .map(
                (session) => `<li><strong>${escapeHtml(session.title)}</strong> — ${escapeHtml(session.detail)}</li>`
              )
              .join("")}
          </ul>
        `;
        return;
      }

      container.innerHTML = `<p class="section-subtitle">No saved cardio sessions yet.</p>`;
      return;
    }

    container.innerHTML = `
      <div class="stack-list">
        ${cardioHistory
          .map(
            (session) => `
              <details class="dropdown-card">
                <summary>
                  <div>
                    <p class="kicker">Cardio</p>
                    <h3 class="card-title">${escapeHtml(session.title)}</h3>
                    <p>${escapeHtml(session.summary || "")}</p>
                    ${session.notes ? `<p><strong>Notes:</strong> ${escapeHtml(session.notes)}</p>` : ""}
                  </div>
                  <span class="dropdown-arrow">⌄</span>
                </summary>
                <div class="dropdown-content">
                  ${session.summary ? `<p>${escapeHtml(session.summary)}</p>` : ""}
                  ${session.notes ? `<p><strong>Notes:</strong> ${escapeHtml(session.notes)}</p>` : ""}
                  ${session.metrics ? `
                    <div class="session-metrics">
                      ${session.metrics.totalDistance ? `<p><strong>Total Distance:</strong> ${escapeHtml(session.metrics.totalDistance)} mi</p>` : ""}
                      ${session.metrics.totalTimeDisplay ? `<p><strong>Total Time:</strong> ${escapeHtml(session.metrics.totalTimeDisplay)}</p>` : ""}
                      ${session.metrics.averagePaceDisplay ? `<p><strong>Average Pace:</strong> ${escapeHtml(session.metrics.averagePaceDisplay)}</p>` : ""}
                      ${session.metrics.fastestSplitDisplay ? `<p><strong>Fastest Split:</strong> ${escapeHtml(session.metrics.fastestSplitDisplay)}</p>` : ""}
                      ${session.metrics.slowestSplitDisplay ? `<p><strong>Slowest Split:</strong> ${escapeHtml(session.metrics.slowestSplitDisplay)}</p>` : ""}
                      ${session.metrics.tempoPaceDisplay ? `<p><strong>Tempo Pace:</strong> ${escapeHtml(session.metrics.tempoPaceDisplay)}</p>` : ""}
                      ${session.metrics.averageSprintTimeDisplay ? `<p><strong>Average Sprint Time:</strong> ${escapeHtml(session.metrics.averageSprintTimeDisplay)}</p>` : ""}
                      ${session.metrics.fastestSprintDisplay ? `<p><strong>Fastest Sprint:</strong> ${escapeHtml(session.metrics.fastestSprintDisplay)}</p>` : ""}
                      ${session.metrics.workRestRatio ? `<p><strong>Work / Rest Ratio:</strong> ${escapeHtml(session.metrics.workRestRatio)}</p>` : ""}
                      ${session.metrics.averageWatts ? `<p><strong>Average Watts:</strong> ${escapeHtml(session.metrics.averageWatts)}</p>` : ""}
                      ${session.metrics.maxWatts ? `<p><strong>Max Watts:</strong> ${escapeHtml(session.metrics.maxWatts)}</p>` : ""}
                      ${session.metrics.completionPercent ? `<p><strong>Completion:</strong> ${escapeHtml(session.metrics.completionPercent)}%</p>` : ""}
                    </div>
                  ` : ""}
                  <ul class="list-clean">
                    ${(session.steps || [])
                      .map(
                        (step) => `
                          <li>
                            <strong>${escapeHtml(step.text || "")}</strong><br />
                            Actual: ${escapeHtml(step.actual || "-")}
                          </li>
                        `
                      )
                      .join("")}
                  </ul>
                  <div class="mind-item-actions">
                    <button type="button" class="danger-btn" data-delete-cardio-session="${escapeHtml(session.id || "")}">
                      Remove Past Workout
                    </button>
                  </div>
                </div>
              </details>
            `
          )
          .join("")}
      </div>
    `;

    container.querySelectorAll<HTMLButtonElement>("[data-delete-cardio-session]").forEach((button) => {
      button.addEventListener("click", async () => {
        const sessionId = button.getAttribute("data-delete-cardio-session");
        if (!sessionId) return;

        const latestHistory = await loadFitnessHistory();
        const latestWeightlifting = Array.isArray(latestHistory.weightliftingSessions)
          ? latestHistory.weightliftingSessions
          : [];
        const latestCardio = Array.isArray(latestHistory.cardioSessions)
          ? latestHistory.cardioSessions
          : [];

        const nextCardioHistory = latestCardio.filter((entry) => entry.id !== sessionId);

        await saveFitnessHistory({
          weightliftingSessions: latestWeightlifting,
          cardioSessions: nextCardioHistory,
        });

        weightliftingHistory = latestWeightlifting;
        cardioHistory = nextCardioHistory;

        await syncFitnessStats();
        renderSavedCardioSessions();
      });
    });
  }

  function renderAll() {
    controller.renderAll();
    renderStrava();
    renderSavedCardioSessions();
  }

  store.startLifecyclePersistence();
  controller.bind();
  await store.load();

  const historyState = await loadFitnessHistory();
  cardioHistory = Array.isArray(historyState.cardioSessions) ? historyState.cardioSessions : [];
  weightliftingHistory = Array.isArray(historyState.weightliftingSessions)
    ? historyState.weightliftingSessions
    : [];

  renderAll();
}
