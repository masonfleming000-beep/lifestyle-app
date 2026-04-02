import { createQueuedPageSaver, loadPageState } from './pageState';

type EducationClass = { id: string; name: string; color: string; createdAt?: string };
type Assignment = {
  id: string;
  name: string;
  dueDate: string;
  classId: string;
  weight?: number | null;
  completed?: boolean;
  createdAt?: string;
};

type EducationConfig = {
  pageKey: string;
  defaultColor: string;
  defaults: {
    classes: EducationClass[];
    assignments: Assignment[];
    removedDefaults: { classes: string[] };
  };
  sections: {
    classes: {
      selectId: string;
      formId: string;
      nameInputId: string;
      colorInputId: string;
      colorPickerId: string;
      restoreButtonId: string;
      listId: string;
      emptyText: string;
    };
    assignments: {
      formId: string;
      nameInputId: string;
      dueInputId: string;
      classSelectId: string;
      weightInputId: string;
      dueThisWeekId: string;
      allUpcomingId: string;
      completedListId: string;
      completedCountId: string;
    };
  };
};

export function initEducationPage(config: EducationConfig) {
  const defaults = structuredClone(config.defaults);
  let classes: EducationClass[] = defaults.classes.map((item) => ({ ...item }));
  let assignments: Assignment[] = [];
  let removedDefaults = { classes: [] as string[] };
  let hasLoadedInitialState = false;

  const classForm = document.getElementById(config.sections.classes.formId) as HTMLFormElement | null;
  const classNameInput = document.getElementById(config.sections.classes.nameInputId) as HTMLInputElement | null;
  const classColorInput = document.getElementById(config.sections.classes.colorInputId) as HTMLInputElement | null;
  const classColorPicker = document.getElementById(config.sections.classes.colorPickerId) as HTMLElement | null;
  const restoreClassesBtn = document.getElementById(config.sections.classes.restoreButtonId) as HTMLButtonElement | null;
  const classList = document.getElementById(config.sections.classes.listId) as HTMLElement | null;
  const assignmentClassSelect = document.getElementById(config.sections.classes.selectId) as HTMLSelectElement | null;

  const assignmentForm = document.getElementById(config.sections.assignments.formId) as HTMLFormElement | null;
  const assignmentNameInput = document.getElementById(config.sections.assignments.nameInputId) as HTMLInputElement | null;
  const assignmentDueInput = document.getElementById(config.sections.assignments.dueInputId) as HTMLInputElement | null;
  const assignmentWeightInput = document.getElementById(config.sections.assignments.weightInputId) as HTMLInputElement | null;
  const dueThisWeekEl = document.getElementById(config.sections.assignments.dueThisWeekId) as HTMLElement | null;
  const allUpcomingEl = document.getElementById(config.sections.assignments.allUpcomingId) as HTMLElement | null;
  const completedListEl = document.getElementById(config.sections.assignments.completedListId) as HTMLElement | null;
  const completedCountEl = document.getElementById(config.sections.assignments.completedCountId) as HTMLElement | null;

  const defaultClassIds = new Set(defaults.classes.map((item) => item.id));

  const client = {
    pageKey: config.pageKey,
    get hasLoadedInitialState() {
      return hasLoadedInitialState;
    },
    getState() {
      return { classes, assignments, removedDefaults };
    },
  };

  const saveState = createQueuedPageSaver(client);

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function uniqueStrings(items: string[] = []) {
    return [...new Set(items.filter(Boolean))];
  }

  function normalizeState(raw: unknown) {
    const parsed = raw && typeof raw === 'object' ? (raw as Record<string, any>) : {};
    return {
      classes: Array.isArray(parsed.classes) ? parsed.classes : defaults.classes,
      assignments: Array.isArray(parsed.assignments) ? parsed.assignments : defaults.assignments,
      removedDefaults: parsed.removedDefaults && typeof parsed.removedDefaults === 'object'
        ? parsed.removedDefaults
        : { classes: [] },
    };
  }

  function mergeDefaultClasses(savedClasses: EducationClass[], removedClassIds: string[] = []) {
    const removedSet = new Set(removedClassIds);
    const merged = [...savedClasses];
    defaults.classes.forEach((defaultClass) => {
      if (!merged.some((item) => item.id === defaultClass.id) && !removedSet.has(defaultClass.id)) {
        merged.push({ ...defaultClass });
      }
    });
    return merged;
  }

  function parseDate(dateStr: string) {
    const date = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function startOfToday() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  function daysUntil(dateStr: string) {
    const due = parseDate(dateStr);
    if (!due) return null;
    return Math.ceil((due.getTime() - startOfToday().getTime()) / 86400000);
  }

  function formatDate(dateStr: string) {
    const date = parseDate(dateStr);
    if (!date) return 'No date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function escapeHtml(value: unknown) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function sortAssignments(items: Assignment[]) {
    return [...items].sort((a, b) => {
      const aTime = parseDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }

  function getClassById(classId: string) {
    return classes.find((item) => item.id === classId);
  }

  function getUpcomingAssignments() {
    return sortAssignments(assignments.filter((item) => !item.completed));
  }

  function getCompletedAssignments() {
    return sortAssignments(assignments.filter((item) => item.completed)).reverse();
  }

  function getDueThisWeekAssignments() {
    return getUpcomingAssignments().filter((item) => {
      const diff = daysUntil(item.dueDate);
      return diff !== null && diff >= 0 && diff <= 7;
    });
  }

  function populateClassSelect() {
    if (!assignmentClassSelect) return;
    assignmentClassSelect.innerHTML = ['<option value="">Select a class</option>']
      .concat(classes.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`))
      .join('');
  }

  function setSelectedColor(color: string) {
    if (classColorInput) classColorInput.value = color;
    classColorPicker?.querySelectorAll<HTMLElement>('[data-color]').forEach((swatch) => {
      swatch.classList.toggle('is-selected', swatch.getAttribute('data-color') === color);
    });
  }

  function restoreDefaultClasses() {
    removedDefaults.classes = [];
    classes = mergeDefaultClasses(classes.filter((item) => !defaultClassIds.has(item.id) || true), []);
  }

  function renderClasses() {
    if (!classList) return;
    if (!classes.length) {
      classList.innerHTML = `<p class="empty-state">${escapeHtml(config.sections.classes.emptyText)}</p>`;
      populateClassSelect();
      return;
    }

    classList.innerHTML = classes.map((item) => `
      <div class="class-chip-row">
        <div class="class-chip-display">
          <span class="class-dot" style="background:${escapeHtml(item.color)}"></span>
          <span>${escapeHtml(item.name)}</span>
        </div>
        <button type="button" class="delete-mini-button" data-class-id="${escapeHtml(item.id)}">Remove</button>
      </div>
    `).join('');
    populateClassSelect();
  }

  function renderAssignmentCard(item: Assignment) {
    const educationClass = getClassById(item.classId);
    const dueDiff = daysUntil(item.dueDate);
    let dueText = formatDate(item.dueDate);
    if (dueDiff === 0) dueText = 'Due today';
    else if (dueDiff === 1) dueText = 'Due tomorrow';
    else if (dueDiff !== null && dueDiff > 1) dueText = `Due in ${dueDiff} days`;
    else if (dueDiff !== null && dueDiff < 0) dueText = `${Math.abs(dueDiff)} day(s) late`;

    return `
      <article class="assignment-card" data-assignment-id="${escapeHtml(item.id)}">
        <label class="assignment-check-wrap">
          <input type="checkbox" class="assignment-check" data-action="toggle-assignment" ${item.completed ? 'checked' : ''} />
          <span></span>
        </label>
        <div class="assignment-main">
          <div class="assignment-topline">
            <h3 class="assignment-title">${escapeHtml(item.name)}</h3>
            ${educationClass ? `<span class="assignment-class-tag" style="background:${escapeHtml(educationClass.color)}22; color:${escapeHtml(educationClass.color)}; border-color:${escapeHtml(educationClass.color)}55">${escapeHtml(educationClass.name)}</span>` : ''}
          </div>
          <div class="assignment-meta">
            <span>${escapeHtml(dueText)}</span>
            <span>${escapeHtml(formatDate(item.dueDate))}</span>
            ${item.weight ? `<span>${escapeHtml(item.weight)}% of grade</span>` : ''}
          </div>
        </div>
        <button type="button" class="delete-mini-button assignment-delete" data-action="delete-assignment">Delete</button>
      </article>
    `;
  }

  function renderAssignmentBuckets() {
    const dueThisWeek = getDueThisWeekAssignments();
    const upcoming = getUpcomingAssignments();
    const completed = getCompletedAssignments();

    if (dueThisWeekEl) dueThisWeekEl.innerHTML = dueThisWeek.length ? dueThisWeek.map(renderAssignmentCard).join('') : '<p class="empty-state">Nothing due this week.</p>';
    if (allUpcomingEl) allUpcomingEl.innerHTML = upcoming.length ? upcoming.map(renderAssignmentCard).join('') : '<p class="empty-state">No upcoming assignments.</p>';
    if (completedListEl) completedListEl.innerHTML = completed.length ? completed.map(renderAssignmentCard).join('') : '<p class="empty-state">No completed assignments yet.</p>';
    if (completedCountEl) completedCountEl.textContent = String(completed.length);
  }

  function renderAll() {
    renderClasses();
    renderAssignmentBuckets();
  }

  classColorPicker?.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-color]');
    if (!target) return;
    setSelectedColor(target.getAttribute('data-color') || config.defaultColor);
  });

  classList?.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-class-id]');
    if (!button) return;
    const classId = button.getAttribute('data-class-id');
    if (!classId) return;
    if (defaultClassIds.has(classId) && !removedDefaults.classes.includes(classId)) removedDefaults.classes = [...removedDefaults.classes, classId];
    classes = classes.filter((item) => item.id !== classId);
    assignments = assignments.filter((item) => item.classId !== classId);
    renderAll();
    await saveState();
  });

  [dueThisWeekEl, allUpcomingEl, completedListEl].forEach((container) => {
    container?.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;
      const card = target.closest<HTMLElement>('[data-assignment-id]');
      if (!card) return;
      const assignmentId = card.getAttribute('data-assignment-id');
      if (!assignmentId) return;
      if (target.closest('[data-action="delete-assignment"]')) {
        assignments = assignments.filter((item) => item.id !== assignmentId);
        renderAssignmentBuckets();
        await saveState();
      }
    });

    container?.addEventListener('change', async (event) => {
      const target = event.target as HTMLElement;
      const checkbox = target.closest<HTMLInputElement>('[data-action="toggle-assignment"]');
      if (!checkbox) return;
      const card = checkbox.closest<HTMLElement>('[data-assignment-id]');
      const assignmentId = card?.getAttribute('data-assignment-id');
      if (!assignmentId) return;
      assignments = assignments.map((item) => item.id === assignmentId ? { ...item, completed: checkbox.checked } : item);
      renderAssignmentBuckets();
      await saveState();
    });
  });

  classForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = classNameInput?.value.trim() || '';
    const color = classColorInput?.value || config.defaultColor;
    if (!name) return;
    classes.push({ id: makeId(), name, color, createdAt: new Date().toISOString() });
    classForm.reset();
    setSelectedColor(config.defaultColor);
    renderClasses();
    await saveState();
  });

  assignmentForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = assignmentNameInput?.value.trim() || '';
    const dueDate = assignmentDueInput?.value || '';
    const classId = assignmentClassSelect?.value || '';
    const weightRaw = assignmentWeightInput?.value.trim() || '';
    if (!name || !dueDate || !classId) return;
    assignments.push({ id: makeId(), name, dueDate, classId, weight: weightRaw ? Number(weightRaw) : null, completed: false, createdAt: new Date().toISOString() });
    assignmentForm.reset();
    renderAssignmentBuckets();
    await saveState();
  });

  restoreClassesBtn?.addEventListener('click', async () => {
    restoreDefaultClasses();
    renderClasses();
    await saveState();
  });

  (async () => {
    setSelectedColor(classColorInput?.value || config.defaultColor);
    renderAll();

    const saved = normalizeState(await loadPageState(config.pageKey));
    removedDefaults = { classes: uniqueStrings(saved.removedDefaults?.classes || []) };
    classes = mergeDefaultClasses((saved.classes || []).map((item) => ({ id: item.id, name: item.name, color: item.color || config.defaultColor })), removedDefaults.classes);
    assignments = (saved.assignments || []).map((item) => ({ ...item, completed: Boolean(item.completed) }));

    hasLoadedInitialState = true;
    renderAll();
  })();
}
