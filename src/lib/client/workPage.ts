import { createQueuedPageSaver, loadPageState } from './pageState';

type Project = { id: string; name: string; color: string; createdAt?: string };
type Task = {
  id: string;
  title: string;
  dueDate: string;
  dueTime?: string | null;
  projectId: string;
  priority?: string;
  status?: string;
  estimatedHours?: number | null;
  notes?: string;
  completed?: boolean;
  createdAt?: string;
};
type Meeting = {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  projectId?: string;
  location?: string;
  notes?: string;
  createdAt?: string;
};

type WorkConfig = {
  pageKey: string;
  defaultColor: string;
  defaults: {
    projects: Project[];
    tasks: Task[];
    meetings: Meeting[];
    removedDefaults: { projects: string[] };
  };
  sections: {
    projects: {
      taskSelectId: string;
      meetingSelectId: string;
      formId: string;
      nameInputId: string;
      colorInputId: string;
      colorPickerId: string;
      restoreButtonId: string;
      listId: string;
      emptyText: string;
    };
    tasks: {
      formId: string;
      titleInputId: string;
      dueDateInputId: string;
      dueTimeInputId: string;
      projectSelectId: string;
      priorityInputId: string;
      statusInputId: string;
      estimatedHoursInputId: string;
      notesInputId: string;
      dueThisWeekId: string;
      allUpcomingId: string;
      completedListId: string;
      completedCountId: string;
    };
    meetings: {
      formId: string;
      titleInputId: string;
      dateInputId: string;
      startInputId: string;
      endInputId: string;
      projectSelectId: string;
      locationInputId: string;
      notesInputId: string;
      listId: string;
    };
  };
};

export function initWorkPage(config: WorkConfig) {
  const defaults = structuredClone(config.defaults);
  let projects: Project[] = defaults.projects.map((item) => ({ ...item }));
  let tasks: Task[] = [];
  let meetings: Meeting[] = [];
  let removedDefaults = { projects: [] as string[] };
  let hasLoadedInitialState = false;

  const taskForm = document.getElementById(config.sections.tasks.formId) as HTMLFormElement | null;
  const taskTitleInput = document.getElementById(config.sections.tasks.titleInputId) as HTMLInputElement | null;
  const taskDueDateInput = document.getElementById(config.sections.tasks.dueDateInputId) as HTMLInputElement | null;
  const taskDueTimeInput = document.getElementById(config.sections.tasks.dueTimeInputId) as HTMLInputElement | null;
  const taskProjectSelect = document.getElementById(config.sections.tasks.projectSelectId) as HTMLSelectElement | null;
  const taskPriorityInput = document.getElementById(config.sections.tasks.priorityInputId) as HTMLSelectElement | null;
  const taskStatusInput = document.getElementById(config.sections.tasks.statusInputId) as HTMLSelectElement | null;
  const taskEstimatedHoursInput = document.getElementById(config.sections.tasks.estimatedHoursInputId) as HTMLInputElement | null;
  const taskNotesInput = document.getElementById(config.sections.tasks.notesInputId) as HTMLTextAreaElement | null;
  const dueThisWeekEl = document.getElementById(config.sections.tasks.dueThisWeekId) as HTMLElement | null;
  const allUpcomingEl = document.getElementById(config.sections.tasks.allUpcomingId) as HTMLElement | null;
  const completedListEl = document.getElementById(config.sections.tasks.completedListId) as HTMLElement | null;
  const completedCountEl = document.getElementById(config.sections.tasks.completedCountId) as HTMLElement | null;

  const meetingForm = document.getElementById(config.sections.meetings.formId) as HTMLFormElement | null;
  const meetingTitleInput = document.getElementById(config.sections.meetings.titleInputId) as HTMLInputElement | null;
  const meetingDateInput = document.getElementById(config.sections.meetings.dateInputId) as HTMLInputElement | null;
  const meetingStartInput = document.getElementById(config.sections.meetings.startInputId) as HTMLInputElement | null;
  const meetingEndInput = document.getElementById(config.sections.meetings.endInputId) as HTMLInputElement | null;
  const meetingProjectSelect = document.getElementById(config.sections.meetings.projectSelectId) as HTMLSelectElement | null;
  const meetingLocationInput = document.getElementById(config.sections.meetings.locationInputId) as HTMLInputElement | null;
  const meetingNotesInput = document.getElementById(config.sections.meetings.notesInputId) as HTMLTextAreaElement | null;
  const meetingsListEl = document.getElementById(config.sections.meetings.listId) as HTMLElement | null;

  const projectForm = document.getElementById(config.sections.projects.formId) as HTMLFormElement | null;
  const projectNameInput = document.getElementById(config.sections.projects.nameInputId) as HTMLInputElement | null;
  const projectColorInput = document.getElementById(config.sections.projects.colorInputId) as HTMLInputElement | null;
  const projectColorPicker = document.getElementById(config.sections.projects.colorPickerId) as HTMLElement | null;
  const restoreProjectsBtn = document.getElementById(config.sections.projects.restoreButtonId) as HTMLButtonElement | null;
  const projectList = document.getElementById(config.sections.projects.listId) as HTMLElement | null;

  const defaultProjectIds = new Set(defaults.projects.map((item) => item.id));

  const client = {
    pageKey: config.pageKey,
    get hasLoadedInitialState() {
      return hasLoadedInitialState;
    },
    getState() {
      return { projects, tasks, meetings, removedDefaults };
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
      projects: Array.isArray(parsed.projects) ? parsed.projects : defaults.projects,
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : defaults.tasks,
      meetings: Array.isArray(parsed.meetings) ? parsed.meetings : defaults.meetings,
      removedDefaults: parsed.removedDefaults && typeof parsed.removedDefaults === 'object' ? parsed.removedDefaults : { projects: [] },
    };
  }

  function mergeDefaultProjects(savedProjects: Project[], removedProjectIds: string[] = []) {
    const removedSet = new Set(removedProjectIds);
    const merged = [...savedProjects];
    defaults.projects.forEach((defaultProject) => {
      if (!merged.some((item) => item.id === defaultProject.id) && !removedSet.has(defaultProject.id)) merged.push({ ...defaultProject });
    });
    return merged;
  }

  function parseDate(dateStr: string) {
    if (!dateStr) return null;
    const date = new Date(`${dateStr}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function parseDateTime(dateStr: string, timeStr?: string | null) {
    if (!dateStr) return null;
    const date = new Date(`${dateStr}T${timeStr || '23:59'}:00`);
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

  function formatTime(timeStr?: string | null) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(Number(hours), Number(minutes), 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function escapeHtml(value: unknown) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function priorityRank(priority?: string) {
    return ({ urgent: 0, high: 1, medium: 2, low: 3 } as Record<string, number>)[priority || ''] ?? 99;
  }

  function sortTasks(items: Task[]) {
    return [...items].sort((a, b) => {
      const aTime = parseDateTime(a.dueDate, a.dueTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseDateTime(b.dueDate, b.dueTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aTime !== bTime) return aTime - bTime;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });
  }

  function sortMeetings(items: Meeting[]) {
    return [...items].sort((a, b) => {
      const aTime = parseDateTime(a.date, a.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseDateTime(b.date, b.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }

  function getProjectById(projectId?: string) {
    return projects.find((item) => item.id === projectId);
  }

  function getUpcomingTasks() {
    return sortTasks(tasks.filter((item) => !item.completed));
  }

  function getCompletedTasks() {
    return sortTasks(tasks.filter((item) => item.completed)).reverse();
  }

  function getDueThisWeekTasks() {
    return getUpcomingTasks().filter((task) => {
      const diff = daysUntil(task.dueDate);
      return diff !== null && diff >= 0 && diff <= 7;
    });
  }

  function getCompletedMeetings() {
    return sortMeetings(meetings.filter((meeting) => meeting.completed)).reverse();
  }

  function getUpcomingMeetings() {
    const now = new Date();
    return sortMeetings(meetings.filter((meeting) => {
      const start = parseDateTime(meeting.date, meeting.startTime);
      return start && start.getTime() >= now.getTime() - 60000;
    }));
  }

  function populateProjectSelects() {
    if (taskProjectSelect) {
      taskProjectSelect.innerHTML = ['<option value="">Select a section</option>']
        .concat(projects.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`))
        .join('');
    }
    if (meetingProjectSelect) {
      meetingProjectSelect.innerHTML = ['<option value="">No section</option>']
        .concat(projects.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`))
        .join('');
    }
  }

  function setSelectedColor(color: string) {
    if (projectColorInput) projectColorInput.value = color;
    projectColorPicker?.querySelectorAll<HTMLElement>('[data-color]').forEach((swatch) => {
      swatch.classList.toggle('is-selected', swatch.getAttribute('data-color') === color);
    });
  }

  function createBadge(text: string, tone = 'default') {
    return `<span class="work-badge work-badge-${tone}">${escapeHtml(text)}</span>`;
  }

  function renderProjects() {
    if (!projectList) return;
    if (!projects.length) {
      projectList.innerHTML = `<p class="empty-state">${escapeHtml(config.sections.projects.emptyText)}</p>`;
      populateProjectSelects();
      return;
    }
    projectList.innerHTML = projects.map((project) => `
      <div class="class-chip-row">
        <div class="class-chip-display">
          <span class="class-dot" style="background:${escapeHtml(project.color)}"></span>
          <span>${escapeHtml(project.name)}</span>
        </div>
        <button type="button" class="delete-mini-button" data-project-id="${escapeHtml(project.id)}">Remove</button>
      </div>
    `).join('');
    populateProjectSelects();
  }

  function renderTaskCard(task: Task) {
    const project = getProjectById(task.projectId);
    const dueDiff = daysUntil(task.dueDate);
    let dueText = formatDate(task.dueDate);
    if (dueDiff === 0) dueText = 'Due today';
    else if (dueDiff === 1) dueText = 'Due tomorrow';
    else if (dueDiff !== null && dueDiff > 1) dueText = `Due in ${dueDiff} days`;
    else if (dueDiff !== null && dueDiff < 0) dueText = `${Math.abs(dueDiff)} day(s) late`;

    const statusTone = task.status === 'done' ? 'done' : task.status === 'blocked' ? 'blocked' : task.status === 'in-progress' ? 'progress' : 'default';
    const priorityTone = task.priority === 'urgent' ? 'blocked' : task.priority === 'high' ? 'progress' : task.priority === 'low' ? 'low' : 'default';

    return `
      <article class="assignment-card" data-task-id="${escapeHtml(task.id)}">
        <label class="assignment-check-wrap">
          <input type="checkbox" class="assignment-check" data-action="toggle-task" ${task.completed ? 'checked' : ''} />
          <span></span>
        </label>
        <div class="assignment-main">
          <div class="assignment-topline">
            <h3 class="assignment-title">${escapeHtml(task.title)}</h3>
            ${project ? `<span class="assignment-class-tag" style="background:${escapeHtml(project.color)}22; color:${escapeHtml(project.color)}; border-color:${escapeHtml(project.color)}55">${escapeHtml(project.name)}</span>` : ''}
            ${createBadge(task.priority || 'medium', priorityTone)}
            ${createBadge(task.status || 'todo', statusTone)}
          </div>
          <div class="assignment-meta">
            <span>${escapeHtml(dueText)}</span>
            <span>${escapeHtml(formatDate(task.dueDate))}</span>
            ${task.dueTime ? `<span>${escapeHtml(formatTime(task.dueTime))}</span>` : ''}
            ${task.estimatedHours ? `<span>${escapeHtml(task.estimatedHours)} hr est.</span>` : ''}
          </div>
          ${task.notes ? `<p class="work-notes">${escapeHtml(task.notes)}</p>` : ''}
        </div>
        <button type="button" class="delete-mini-button task-delete" data-action="delete-task">Delete</button>
      </article>
    `;
  }

  function renderMeetingCard(meeting: Meeting) {
    const project = getProjectById(meeting.projectId);
    return `
      <article class="assignment-card work-meeting-card" data-meeting-id="${escapeHtml(meeting.id)}">
        <div class="assignment-main">
          <div class="assignment-topline">
            <h3 class="assignment-title">${escapeHtml(meeting.title)}</h3>
            ${project ? `<span class="assignment-class-tag" style="background:${escapeHtml(project.color)}22; color:${escapeHtml(project.color)}; border-color:${escapeHtml(project.color)}55">${escapeHtml(project.name)}</span>` : ''}
            ${createBadge('meeting', 'default')}
          </div>
          <div class="assignment-meta">
            <span>${escapeHtml(formatDate(meeting.date))}</span>
            <span>${escapeHtml(formatTime(meeting.startTime))} - ${escapeHtml(formatTime(meeting.endTime))}</span>
            ${meeting.location ? `<span>${escapeHtml(meeting.location)}</span>` : ''}
          </div>
          ${meeting.notes ? `<p class="work-notes">${escapeHtml(meeting.notes)}</p>` : ''}
        </div>
        <button type="button" class="delete-mini-button meeting-delete" data-action="delete-meeting">Delete</button>
      </article>
    `;
  }

  function renderTasks() {
    const dueThisWeek = getDueThisWeekTasks();
    const upcoming = getUpcomingTasks();
    const completed = getCompletedTasks();
    if (dueThisWeekEl) dueThisWeekEl.innerHTML = dueThisWeek.length ? dueThisWeek.map(renderTaskCard).join('') : '<p class="empty-state">Nothing due this week.</p>';
    if (allUpcomingEl) allUpcomingEl.innerHTML = upcoming.length ? upcoming.map(renderTaskCard).join('') : '<p class="empty-state">No upcoming tasks.</p>';
    if (completedListEl) completedListEl.innerHTML = completed.length ? completed.map(renderTaskCard).join('') : '<p class="empty-state">No completed tasks yet.</p>';
    if (completedCountEl) completedCountEl.textContent = String(completed.length);
  }

  function renderMeetings() {
    if (!meetingsListEl) return;
    const upcoming = getUpcomingMeetings();
    meetingsListEl.innerHTML = upcoming.length ? upcoming.slice(0, 6).map(renderMeetingCard).join('') : '<p class="empty-state">No upcoming meetings.</p>';
  }

  function renderAll() {
    renderProjects();
    renderTasks();
    renderMeetings();
  }

  projectColorPicker?.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-color]');
    if (!target) return;
    setSelectedColor(target.getAttribute('data-color') || config.defaultColor);
  });

  projectList?.addEventListener('click', async (event) => {
    const button = (event.target as HTMLElement).closest<HTMLElement>('[data-project-id]');
    if (!button) return;
    const projectId = button.getAttribute('data-project-id');
    if (!projectId) return;
    if (defaultProjectIds.has(projectId) && !removedDefaults.projects.includes(projectId)) removedDefaults.projects = [...removedDefaults.projects, projectId];
    projects = projects.filter((item) => item.id !== projectId);
    tasks = tasks.filter((item) => item.projectId !== projectId);
    meetings = meetings.map((item) => item.projectId === projectId ? { ...item, projectId: '' } : item);
    renderAll();
    await saveState();
  });

  [dueThisWeekEl, allUpcomingEl, completedListEl].forEach((container) => {
    container?.addEventListener('click', async (event) => {
      const target = event.target as HTMLElement;
      const card = target.closest<HTMLElement>('[data-task-id]');
      if (!card) return;
      const taskId = card.getAttribute('data-task-id');
      if (!taskId) return;
      if (target.closest('[data-action="delete-task"]')) {
        tasks = tasks.filter((item) => item.id !== taskId);
        renderTasks();
        await saveState();
      }
    });
    container?.addEventListener('change', async (event) => {
      const checkbox = (event.target as HTMLElement).closest<HTMLInputElement>('[data-action="toggle-task"]');
      if (!checkbox) return;
      const taskId = checkbox.closest<HTMLElement>('[data-task-id]')?.getAttribute('data-task-id');
      if (!taskId) return;
      tasks = tasks.map((item) => item.id === taskId ? { ...item, completed: checkbox.checked, status: checkbox.checked ? 'done' : item.status === 'done' ? 'todo' : item.status } : item);
      renderTasks();
      await saveState();
    });
  });

  meetingsListEl?.addEventListener('click', async (event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-action="delete-meeting"]')) return;
    const meetingId = target.closest<HTMLElement>('[data-meeting-id]')?.getAttribute('data-meeting-id');
    if (!meetingId) return;
    meetings = meetings.filter((item) => item.id !== meetingId);
    renderMeetings();
    await saveState();
  });

  taskForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = taskTitleInput?.value.trim() || '';
    const dueDate = taskDueDateInput?.value || '';
    const dueTime = taskDueTimeInput?.value || '';
    const projectId = taskProjectSelect?.value || '';
    if (!title || !dueDate || !projectId) return;
    tasks.push({
      id: makeId(),
      title,
      dueDate,
      dueTime: dueTime || null,
      projectId,
      priority: taskPriorityInput?.value || 'medium',
      status: taskStatusInput?.value || 'todo',
      estimatedHours: taskEstimatedHoursInput?.value.trim() ? Number(taskEstimatedHoursInput.value) : null,
      notes: taskNotesInput?.value.trim() || '',
      completed: (taskStatusInput?.value || 'todo') === 'done',
      createdAt: new Date().toISOString(),
    });
    taskForm.reset();
    renderTasks();
    await saveState();
  });

  meetingForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const title = meetingTitleInput?.value.trim() || '';
    const date = meetingDateInput?.value || '';
    const startTime = meetingStartInput?.value || '';
    const endTime = meetingEndInput?.value || '';
    if (!title || !date || !startTime || !endTime) return;
    meetings.push({
      id: makeId(),
      title,
      date,
      startTime,
      endTime,
      projectId: meetingProjectSelect?.value || '',
      location: meetingLocationInput?.value.trim() || '',
      notes: meetingNotesInput?.value.trim() || '',
      createdAt: new Date().toISOString(),
    });
    meetingForm.reset();
    renderMeetings();
    await saveState();
  });

  projectForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const name = projectNameInput?.value.trim() || '';
    const color = projectColorInput?.value || config.defaultColor;
    if (!name) return;
    projects.push({ id: makeId(), name, color, createdAt: new Date().toISOString() });
    projectForm.reset();
    setSelectedColor(config.defaultColor);
    renderProjects();
    await saveState();
  });

  restoreProjectsBtn?.addEventListener('click', async () => {
    removedDefaults.projects = [];
    projects = mergeDefaultProjects(projects, []);
    renderProjects();
    await saveState();
  });

  (async () => {
    setSelectedColor(projectColorInput?.value || config.defaultColor);
    renderAll();

    const saved = normalizeState(await loadPageState(config.pageKey));
    removedDefaults = { projects: uniqueStrings(saved.removedDefaults?.projects || []) };
    projects = mergeDefaultProjects((saved.projects || []).map((item) => ({ id: item.id, name: item.name, color: item.color || config.defaultColor })), removedDefaults.projects);
    tasks = (saved.tasks || []).map((item) => ({ ...item, projectId: item.projectId || '', priority: item.priority || 'medium', status: item.status || (item.completed ? 'done' : 'todo'), estimatedHours: item.estimatedHours ?? null, notes: item.notes || '', completed: Boolean(item.completed) }));
    meetings = (saved.meetings || []).map((item) => ({ ...item, projectId: item.projectId || '', location: item.location || '', notes: item.notes || '' }));

    hasLoadedInitialState = true;
    renderAll();
  })();
}
