// @ts-nocheck
import { fetchPageState, postPageState, createApiPageStore } from './pageState';

export function initCardioWorkoutPage(config = {}) {
  const pageKey = config.pageKey || 'cardio-workout-builder';
  const fitnessHistoryPageKey = config.fitnessHistoryPageKey || 'fitness-history';
  const profileStatsPageKey = config.profileStatsPageKey || 'profile-stats';

  const ids = {
    workoutTypeSectionId: config.ids?.workoutTypeSectionId || 'cardio-workout-type-section',
    workoutBuilderSectionId: config.ids?.workoutBuilderSectionId || 'cardio-workout-builder-section',
    liveWorkoutSectionId: config.ids?.liveWorkoutSectionId || 'cardio-live-workout-section',
    liveWorkoutCardId: config.ids?.liveWorkoutCardId || 'live-workout-card',
    editWorkoutTypesButtonId: config.ids?.editWorkoutTypesButtonId || 'edit-workout-types-button',
  };

  const defaultWorkoutTypes = {
    hiit: {
      label: 'HIIT',
      fields: [
        { name: 'rounds', label: 'Intervals', type: 'number', min: 1, value: 8 },
        { name: 'workSeconds', label: 'Work Time (seconds)', type: 'number', min: 5, value: 30 },
        { name: 'restSeconds', label: 'Rest Time (seconds)', type: 'number', min: 5, value: 30 },
      ],
    },
    intervals: {
      label: 'Intervals',
      fields: [
        { name: 'sprintCount', label: 'Number of Sprints', type: 'number', min: 1, value: 4 },
        { name: 'sprintDistance', label: 'Sprint Distance', type: 'text', value: '200m' },
        { name: 'sprintTargetTime', label: 'Sprint Target Time', type: 'text', value: '0:35' },
        { name: 'restDistance', label: 'Jog Rest Distance', type: 'text', value: '100m' },
      ],
    },
    steady: {
      label: 'Steady State',
      fields: [
        { name: 'pace', label: 'Target Pace', type: 'text', value: '8:45 / mile' },
        { name: 'distance', label: 'Distance (miles)', type: 'number', min: 1, step: '0.5', value: 5 },
      ],
    },
    tempo: {
      label: 'Tempo Run',
      fields: [
        { name: 'warmupDistance', label: 'Warmup Distance (miles)', type: 'number', min: 0, step: '0.5', value: 1 },
        { name: 'tempoDistance', label: 'Tempo Distance (miles)', type: 'number', min: 0.5, step: '0.5', value: 3 },
        { name: 'tempoPace', label: 'Tempo Pace', type: 'text', value: '7:15 / mile' },
        { name: 'cooldownDistance', label: 'Cooldown Distance (miles)', type: 'number', min: 0, step: '0.5', value: 1 },
      ],
    },
    fartlek: {
      label: 'Fartlek',
      fields: [
        { name: 'cycles', label: 'Hard / Easy Cycles', type: 'number', min: 1, value: 6 },
        { name: 'hardMinutes', label: 'Hard Effort (minutes)', type: 'number', min: 1, value: 2 },
        { name: 'easyMinutes', label: 'Easy Effort (minutes)', type: 'number', min: 1, value: 2 },
        { name: 'hardEffort', label: 'Hard Effort Target', type: 'text', value: '5K effort' },
        { name: 'easyEffort', label: 'Easy Effort Target', type: 'text', value: 'Easy jog' },
      ],
    },
    hill: {
      label: 'Hill Repeats',
      fields: [
        { name: 'repeatCount', label: 'Hill Repeats', type: 'number', min: 1, value: 6 },
        { name: 'hillDistance', label: 'Hill Distance', type: 'text', value: '200m' },
        { name: 'hillTarget', label: 'Uphill Target', type: 'text', value: 'Hard effort' },
        { name: 'recoveryType', label: 'Recovery', type: 'text', value: 'Walk/jog back down' },
      ],
    },
    power: {
      label: 'Power Workout',
      fields: [
        { name: 'intervalCount', label: 'Power Intervals', type: 'number', min: 1, value: 5 },
        { name: 'workMinutes', label: 'Work Interval (minutes)', type: 'number', min: 1, value: 3 },
        { name: 'targetWatts', label: 'Target Watts', type: 'number', min: 50, value: 250 },
        { name: 'recoveryMinutes', label: 'Recovery (minutes)', type: 'number', min: 1, value: 2 },
      ],
    },
    recovery: {
      label: 'Recovery Run',
      fields: [
        { name: 'pace', label: 'Target Pace', type: 'text', value: '9:00 / mile' },
        { name: 'distance', label: 'Distance (miles)', type: 'number', min: 1, step: '0.5', value: 3 },
      ],
    },
    longrun: {
      label: 'Long Run',
      fields: [
        { name: 'pace', label: 'Target Pace', type: 'text', value: '8:30 / mile' },
        { name: 'distance', label: 'Distance (miles)', type: 'number', min: 1, step: '0.5', value: 10 },
      ],
    },
  };

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function slugify(value) {
    return String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeWorkoutTypes(savedTypes) {
    if (!savedTypes || typeof savedTypes !== 'object') return clone(defaultWorkoutTypes);
    const normalized = {};
    Object.entries(savedTypes).forEach(([key, value]) => {
      const safeKey = slugify(key);
      if (!safeKey || !value || typeof value !== 'object') return;
      const label = String(value.label || safeKey).trim() || safeKey;
      const fields = Array.isArray(value.fields)
        ? value.fields.map((field, index) => ({
            name: slugify(field?.name || `field-${index + 1}`) || `field-${index + 1}`,
            label: String(field?.label || `Field ${index + 1}`),
            type: field?.type === 'number' ? 'number' : 'text',
            min: field?.min ?? '',
            step: field?.step ?? '',
            value: field?.value ?? '',
          }))
        : [];
      normalized[safeKey] = { label, fields: fields.length ? fields : clone(defaultWorkoutTypes.hiit.fields) };
    });
    return Object.keys(normalized).length ? normalized : clone(defaultWorkoutTypes);
  }

  const store = createApiPageStore({
    pageKey,
    defaults: {
      workoutTypes: clone(defaultWorkoutTypes),
      selectedType: 'hiit',
    },
    normalize(value) {
      const parsed = value && typeof value === 'object' ? value : {};
      const selectedType = typeof parsed.selectedType === 'string' ? parsed.selectedType : 'hiit';
      return {
        workoutTypes: normalizeWorkoutTypes(parsed.workoutTypes),
        selectedType,
      };
    },
  });

  let workoutTypes = clone(defaultWorkoutTypes);
  let selectedType = 'hiit';
  let activeWorkout = null;
  let cardioHistory = [];
  let weightliftingHistory = [];
  let visibleMetrics = {};
  let isEditingWorkoutTypes = false;

  const workoutTypeSection = document.getElementById(ids.workoutTypeSectionId);
  const workoutBuilderSection = document.getElementById(ids.workoutBuilderSectionId);
  const liveWorkoutSection = document.getElementById(ids.liveWorkoutSectionId);
  const liveWorkoutCard = document.getElementById(ids.liveWorkoutCardId);
  const editWorkoutTypesButton = document.getElementById(ids.editWorkoutTypesButtonId);

  if (workoutTypeSection) {
    workoutTypeSection.innerHTML = `
      <div class="workout-type-select-wrap">
        <label class="workout-field">
          <span>Workout Type</span>
          <select id="workout-type-select" class="workout-type-select"></select>
        </label>
      </div>
      <div id="workout-type-edit-panel" class="workout-type-edit-panel" hidden></div>
    `;
  }

  if (workoutBuilderSection) {
    workoutBuilderSection.innerHTML = `
      <form id="workout-builder-form" class="todo-form today-form">
        <div id="workout-form-fields" class="workout-form"></div>
        <div class="multi-action-workout-actions editor-toolbar action-bar-start action-bar-wrap">
          <button type="submit" class="button-primary">Start Workout</button>
        </div>
      </form>
    `;
  }

  if (liveWorkoutSection) {
    liveWorkoutSection.innerHTML = `
      <div class="workout-session-notes">
        <label class="workout-field">
          <span>Workout Notes</span>
          <textarea id="cardio-workout-notes" class="workout-actual-textarea" rows="4" placeholder="Overall notes for this cardio workout"></textarea>
        </label>
      </div>
      <div id="live-workout-summary" class="live-workout-summary"></div>
      <ul id="live-workout-steps" class="routine-list workout-live-list"></ul>
      <div class="multi-action-workout-actions editor-toolbar action-bar-start action-bar-wrap">
        <button id="save-splits-button" type="button" class="button-secondary">Save Splits / Times</button>
        <button id="open-manual-metrics-button" type="button" class="button-secondary">Fill In Metrics Manually</button>
        <button id="auto-calculate-metrics-button" type="button" class="button-secondary">Auto Calculate Metrics</button>
        <button id="save-completed-workout-button" type="button" class="button-primary">Save Completed Workout</button>
        <button id="reset-workout-button" type="button" class="button-secondary">Reset Workout</button>
      </div>
      <div id="manual-metrics-panel" class="cardio-metrics-panel" hidden></div>
      <div id="visible-calculated-metrics" class="session-metrics"></div>
    `;
  }

  const workoutTypeSelect = document.getElementById('workout-type-select');
  const workoutTypeEditPanel = document.getElementById('workout-type-edit-panel');
  const form = document.getElementById('workout-builder-form');
  const formFields = document.getElementById('workout-form-fields');
  const liveWorkoutSummary = document.getElementById('live-workout-summary');
  const liveWorkoutSteps = document.getElementById('live-workout-steps');
  const saveSplitsButton = document.getElementById('save-splits-button');
  const openManualMetricsButton = document.getElementById('open-manual-metrics-button');
  const autoCalculateMetricsButton = document.getElementById('auto-calculate-metrics-button');
  const saveCompletedWorkoutButton = document.getElementById('save-completed-workout-button');
  const resetWorkoutButton = document.getElementById('reset-workout-button');
  const manualMetricsPanel = document.getElementById('manual-metrics-panel');
  const visibleCalculatedMetrics = document.getElementById('visible-calculated-metrics');
  const workoutNotes = document.getElementById('cardio-workout-notes');

  function queueStoreSave() {
    store.setState((current) => ({ ...current, workoutTypes: clone(workoutTypes), selectedType }));
    store.queueSave(150);
  }

  function ensureSelectedTypeExists() {
    if (!workoutTypes[selectedType]) {
      selectedType = Object.keys(workoutTypes)[0] || 'hiit';
    }
  }

  function getFieldValueMap() {
    const data = new FormData(form);
    const values = {};
    for (const [key, value] of data.entries()) {
      values[key] = String(value ?? '').trim();
    }
    return values;
  }

  function buildStepsForWorkout(type, values) {
    const make = (text, target = '', actualPlaceholder = 'Enter actual result') => ({
      text,
      target,
      actual: '',
      done: false,
      actualLabel: 'Actual Result / Notes',
      actualPlaceholder,
    });

    const num = (value, fallback = 0) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    if (type === 'hiit') {
      const rounds = Math.max(1, num(values.rounds, 8));
      const work = num(values.workSeconds, 30);
      const rest = num(values.restSeconds, 30);
      const steps = [];
      for (let i = 0; i < rounds; i += 1) {
        steps.push(make(`Interval ${i + 1} work`, `${work}s hard effort`, 'Actual work time / notes'));
        steps.push(make(`Interval ${i + 1} rest`, `${rest}s easy recovery`, 'Actual recovery time / notes'));
      }
      steps.push(make('Finish', 'Record final session time', 'Final time'));
      return steps;
    }

    if (type === 'intervals') {
      const count = Math.max(1, num(values.sprintCount, 4));
      const sprintDistance = values.sprintDistance || '200m';
      const sprintTargetTime = values.sprintTargetTime || '0:35';
      const restDistance = values.restDistance || '100m';
      const steps = [];
      for (let i = 0; i < count; i += 1) {
        steps.push(make(`Sprint ${i + 1}`, `${sprintDistance} at ${sprintTargetTime}`, 'Actual rep time'));
        steps.push(make(`Recovery ${i + 1}`, `${restDistance} easy jog/walk`, 'Actual recovery time'));
      }
      steps.push(make('Finish', 'Record final session time', 'Final time'));
      return steps;
    }

    if (type === 'tempo') {
      return [
        make('Warmup', `${values.warmupDistance || 1} miles easy`, 'Warmup time'),
        make('Tempo', `${values.tempoDistance || 3} miles at ${values.tempoPace || '7:15 / mile'}`, 'Tempo split/time'),
        make('Cooldown', `${values.cooldownDistance || 1} miles easy`, 'Cooldown time'),
        make('Finish', 'Record final session time', 'Final time'),
      ];
    }

    if (type === 'fartlek') {
      const cycles = Math.max(1, num(values.cycles, 6));
      const hardMinutes = values.hardMinutes || 2;
      const easyMinutes = values.easyMinutes || 2;
      const steps = [];
      for (let i = 0; i < cycles; i += 1) {
        steps.push(make(`Cycle ${i + 1} hard`, `${hardMinutes} min at ${values.hardEffort || '5K effort'}`, 'Actual hard interval'));
        steps.push(make(`Cycle ${i + 1} easy`, `${easyMinutes} min at ${values.easyEffort || 'Easy jog'}`, 'Actual easy interval'));
      }
      steps.push(make('Finish', 'Record final session time', 'Final time'));
      return steps;
    }

    if (type === 'hill') {
      const count = Math.max(1, num(values.repeatCount, 6));
      const steps = [];
      for (let i = 0; i < count; i += 1) {
        steps.push(make(`Hill repeat ${i + 1}`, `${values.hillDistance || '200m'} uphill at ${values.hillTarget || 'Hard effort'}`, 'Actual uphill rep'));
        steps.push(make(`Recovery ${i + 1}`, values.recoveryType || 'Walk/jog back down', 'Recovery notes/time'));
      }
      steps.push(make('Finish', 'Record final session time', 'Final time'));
      return steps;
    }

    if (type === 'power') {
      const count = Math.max(1, num(values.intervalCount, 5));
      const steps = [];
      for (let i = 0; i < count; i += 1) {
        steps.push(make(`Power interval ${i + 1}`, `${values.workMinutes || 3} min at ${values.targetWatts || 250} watts`, 'Actual watts / notes'));
        steps.push(make(`Recovery ${i + 1}`, `${values.recoveryMinutes || 2} min easy`, 'Recovery notes/time'));
      }
      steps.push(make('Finish', 'Record final session time', 'Final time'));
      return steps;
    }

    const pace = values.pace || 'Easy pace';
    const distance = values.distance || 3;
    return [
      make('Run', `${distance} miles at ${pace}`, 'Actual run time'),
      make('Finish', 'Record final session time', 'Final time'),
    ];
  }

  function renderWorkoutTypeOptions() {
    ensureSelectedTypeExists();
    if (!workoutTypeSelect) return;
    const entries = Object.entries(workoutTypes);
    workoutTypeSelect.innerHTML = entries
      .map(([key, type]) => `<option value="${escapeHtml(key)}" ${key === selectedType ? 'selected' : ''}>${escapeHtml(type.label)}</option>`)
      .join('');
  }

  function renderBuilderFields() {
    ensureSelectedTypeExists();
    if (!formFields) return;
    const current = workoutTypes[selectedType];
    if (!current) {
      formFields.innerHTML = '<p class="empty-state-text">No workout types available.</p>';
      return;
    }

    formFields.innerHTML = current.fields
      .map((field) => `
        <label class="workout-field">
          <span>${escapeHtml(field.label)}</span>
          <input
            type="${escapeHtml(field.type || 'text')}"
            name="${escapeHtml(field.name)}"
            value="${escapeHtml(field.value ?? '')}"
            ${field.min !== '' && field.min !== undefined ? `min="${escapeHtml(field.min)}"` : ''}
            ${field.step !== '' && field.step !== undefined ? `step="${escapeHtml(field.step)}"` : ''}
          />
        </label>
      `)
      .join('');
  }

  function renderWorkoutTypeEditor() {
    if (!workoutTypeEditPanel) return;
    if (!isEditingWorkoutTypes) {
      workoutTypeEditPanel.hidden = true;
      workoutTypeEditPanel.innerHTML = '';
      return;
    }

    workoutTypeEditPanel.hidden = false;
    workoutTypeEditPanel.innerHTML = `
      <div class="section-header">
        <div>
          <h3 class="section-title">Edit Workout Types</h3>
          <p class="section-subtitle">Rename, add, or remove workout types. Changes save to your builder page state.</p>
        </div>
      </div>
      <div class="workout-type-editor-list">
        ${Object.entries(workoutTypes).map(([key, type]) => `
          <div class="surface-card workout-type-editor-card" data-type-key="${escapeHtml(key)}">
            <label class="workout-field">
              <span>Label</span>
              <input type="text" data-role="type-label" value="${escapeHtml(type.label)}" />
            </label>
            <div class="workout-type-editor-fields">
              ${type.fields.map((field, index) => `
                <div class="workout-type-editor-field" data-field-index="${index}">
                  <input type="text" data-role="field-label" value="${escapeHtml(field.label)}" placeholder="Field label" />
                  <input type="text" data-role="field-name" value="${escapeHtml(field.name)}" placeholder="field-name" />
                  <select data-role="field-type">
                    <option value="text" ${field.type !== 'number' ? 'selected' : ''}>Text</option>
                    <option value="number" ${field.type === 'number' ? 'selected' : ''}>Number</option>
                  </select>
                  <input type="text" data-role="field-value" value="${escapeHtml(field.value ?? '')}" placeholder="Default value" />
                  <button type="button" class="button-secondary" data-action="remove-field">Remove field</button>
                </div>
              `).join('')}
            </div>
            <div class="editor-toolbar action-bar-start action-bar-wrap">
              <button type="button" class="button-secondary" data-action="add-field">Add field</button>
              <button type="button" class="button-secondary" data-action="delete-type">Delete type</button>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="editor-toolbar action-bar-start action-bar-wrap">
        <button type="button" id="add-workout-type-button" class="button-secondary">Add Workout Type</button>
        <button type="button" id="save-workout-type-editor-button" class="button-primary">Save Workout Types</button>
      </div>
    `;

    workoutTypeEditPanel.querySelectorAll('[data-action="add-field"]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('[data-type-key]');
        const key = card?.getAttribute('data-type-key');
        if (!key || !workoutTypes[key]) return;
        workoutTypes[key].fields.push({ name: `field-${workoutTypes[key].fields.length + 1}`, label: 'New Field', type: 'text', value: '' });
        renderWorkoutTypeEditor();
      });
    });

    workoutTypeEditPanel.querySelectorAll('[data-action="remove-field"]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('[data-type-key]');
        const key = card?.getAttribute('data-type-key');
        const row = button.closest('[data-field-index]');
        const index = Number(row?.getAttribute('data-field-index'));
        if (!key || !workoutTypes[key] || !Number.isFinite(index)) return;
        workoutTypes[key].fields.splice(index, 1);
        if (!workoutTypes[key].fields.length) {
          workoutTypes[key].fields.push({ name: 'distance', label: 'Distance', type: 'text', value: '' });
        }
        renderWorkoutTypeEditor();
      });
    });

    workoutTypeEditPanel.querySelectorAll('[data-action="delete-type"]').forEach((button) => {
      button.addEventListener('click', () => {
        const card = button.closest('[data-type-key]');
        const key = card?.getAttribute('data-type-key');
        if (!key || !workoutTypes[key]) return;
        delete workoutTypes[key];
        ensureSelectedTypeExists();
        renderWorkoutTypeEditor();
        renderWorkoutTypeOptions();
        renderBuilderFields();
      });
    });

    workoutTypeEditPanel.querySelector('#add-workout-type-button')?.addEventListener('click', () => {
      let index = Object.keys(workoutTypes).length + 1;
      let key = `custom-${index}`;
      while (workoutTypes[key]) {
        index += 1;
        key = `custom-${index}`;
      }
      workoutTypes[key] = {
        label: `Custom ${index}`,
        fields: [
          { name: 'distance', label: 'Distance', type: 'text', value: '' },
          { name: 'pace', label: 'Target Pace', type: 'text', value: '' },
        ],
      };
      selectedType = key;
      renderWorkoutTypeEditor();
      renderWorkoutTypeOptions();
      renderBuilderFields();
    });

    workoutTypeEditPanel.querySelector('#save-workout-type-editor-button')?.addEventListener('click', () => {
      const nextTypes = {};
      workoutTypeEditPanel.querySelectorAll('[data-type-key]').forEach((card) => {
        const previousKey = card.getAttribute('data-type-key') || '';
        const rawLabel = card.querySelector('[data-role="type-label"]')?.value || previousKey;
        const key = slugify(previousKey || rawLabel) || previousKey;
        const fields = [];
        card.querySelectorAll('[data-field-index]').forEach((row, index) => {
          const label = row.querySelector('[data-role="field-label"]')?.value || `Field ${index + 1}`;
          const rawName = row.querySelector('[data-role="field-name"]')?.value || label;
          fields.push({
            label: String(label).trim() || `Field ${index + 1}`,
            name: slugify(rawName) || `field-${index + 1}`,
            type: row.querySelector('[data-role="field-type"]')?.value === 'number' ? 'number' : 'text',
            value: row.querySelector('[data-role="field-value"]')?.value || '',
          });
        });
        nextTypes[key] = {
          label: String(rawLabel).trim() || previousKey,
          fields: fields.length ? fields : [{ name: 'distance', label: 'Distance', type: 'text', value: '' }],
        };
      });
      workoutTypes = normalizeWorkoutTypes(nextTypes);
      ensureSelectedTypeExists();
      queueStoreSave();
      renderWorkoutTypeOptions();
      renderBuilderFields();
      renderWorkoutTypeEditor();
    });
  }

  function formatMetrics(metrics) {
    return Object.entries(metrics || {})
      .filter(([, value]) => value !== '' && value !== null && value !== undefined)
      .map(([key, value]) => `
        <div class="session-metric-row">
          <span class="session-metric-label">${escapeHtml(key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()))}</span>
          <span class="session-metric-value">${escapeHtml(value)}</span>
        </div>
      `)
      .join('');
  }

  function renderVisibleMetrics() {
    if (!visibleCalculatedMetrics) return;
    visibleCalculatedMetrics.innerHTML = formatMetrics(visibleMetrics);
  }

  function autoCalculateMetrics() {
    if (!activeWorkout) return;
    const totalSteps = Array.isArray(activeWorkout.steps) ? activeWorkout.steps.length : 0;
    const completed = Array.isArray(activeWorkout.steps) ? activeWorkout.steps.filter((step) => step.done).length : 0;
    const finishStep = [...(activeWorkout.steps || [])].reverse().find((step) => String(step.text || '').toLowerCase().includes('finish'));
    visibleMetrics = {
      completionPercent: totalSteps ? Math.round((completed / totalSteps) * 100) : 0,
      completedSteps: completed,
      totalSteps,
      finalTime: finishStep?.actual || '',
    };
    renderVisibleMetrics();
  }

  function renderManualMetricsPanel() {
    if (!manualMetricsPanel) return;
    manualMetricsPanel.hidden = false;
    manualMetricsPanel.innerHTML = `
      <div class="section-header">
        <div>
          <h3 class="section-title">Manual Metrics</h3>
          <p class="section-subtitle">Save any totals or summary values you want with this workout.</p>
        </div>
      </div>
      <div class="workout-form">
        ${['totalDistance', 'totalTime', 'averagePace', 'calories', 'heartRate'].map((key) => `
          <label class="workout-field">
            <span>${escapeHtml(key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()))}</span>
            <input type="text" name="${escapeHtml(key)}" value="${escapeHtml(visibleMetrics[key] ?? '')}" />
          </label>
        `).join('')}
      </div>
      <div class="workout-form-actions">
        <button id="save-manual-metrics-button" type="button" class="button-primary">Save Manual Metrics</button>
      </div>
    `;
    manualMetricsPanel.querySelector('#save-manual-metrics-button')?.addEventListener('click', () => {
      const next = { ...visibleMetrics };
      manualMetricsPanel.querySelectorAll('input[name]').forEach((input) => {
        next[input.name] = input.value.trim();
      });
      visibleMetrics = next;
      renderVisibleMetrics();
    });
  }

  function renderLiveWorkout() {
    if (!liveWorkoutSummary || !liveWorkoutSteps || !liveWorkoutCard) return;
    if (!activeWorkout) {
      liveWorkoutCard.hidden = true;
      liveWorkoutSummary.innerHTML = '';
      liveWorkoutSteps.innerHTML = '';
      if (manualMetricsPanel) {
        manualMetricsPanel.hidden = true;
        manualMetricsPanel.innerHTML = '';
      }
      if (visibleCalculatedMetrics) {
        visibleCalculatedMetrics.innerHTML = '';
      }
      return;
    }

    liveWorkoutCard.hidden = false;
    const typeLabel = workoutTypes[activeWorkout.type]?.label || activeWorkout.type;
    liveWorkoutSummary.innerHTML = `
      <div class="surface-card-inner">
        <h3 class="section-title">${escapeHtml(typeLabel)}</h3>
        <p class="section-subtitle">Track actual results for each step, then save the completed workout.</p>
      </div>
    `;

    liveWorkoutSteps.innerHTML = activeWorkout.steps.map((step, index) => `
      <li class="checklist-card today-card ${step.done ? 'is-complete' : ''}" data-step-index="${index}">
        <div class="checklist-card-main">
          <label class="checklist-card-row">
            <input type="checkbox" class="checklist-checkbox" data-role="step-toggle" ${step.done ? 'checked' : ''} />
            <div class="checklist-card-copy">
              <span class="checklist-card-title">${escapeHtml(step.text)}</span>
              ${step.target ? `<span class="checklist-card-meta">${escapeHtml(step.target)}</span>` : ''}
            </div>
          </label>
          <label class="workout-field">
            <span>${escapeHtml(step.actualLabel || 'Actual Result / Notes')}</span>
            <textarea class="workout-actual-textarea" data-role="step-actual" rows="2" placeholder="${escapeHtml(step.actualPlaceholder || 'Enter actual result')}">${escapeHtml(step.actual || '')}</textarea>
          </label>
        </div>
      </li>
    `).join('');

    liveWorkoutSteps.querySelectorAll('[data-role="step-toggle"]').forEach((input) => {
      input.addEventListener('change', () => {
        const row = input.closest('[data-step-index]');
        const index = Number(row?.getAttribute('data-step-index'));
        if (!Number.isFinite(index) || !activeWorkout?.steps[index]) return;
        activeWorkout.steps[index].done = Boolean(input.checked);
        row.classList.toggle('is-complete', Boolean(input.checked));
        autoCalculateMetrics();
      });
    });

    liveWorkoutSteps.querySelectorAll('[data-role="step-actual"]').forEach((input) => {
      input.addEventListener('input', () => {
        const row = input.closest('[data-step-index]');
        const index = Number(row?.getAttribute('data-step-index'));
        if (!Number.isFinite(index) || !activeWorkout?.steps[index]) return;
        activeWorkout.steps[index].actual = input.value;
      });
    });

    renderVisibleMetrics();
  }

  async function loadFitnessHistory() {
    const history = (await fetchPageState(fitnessHistoryPageKey)) || {};
    return {
      cardioSessions: Array.isArray(history.cardioSessions) ? history.cardioSessions : [],
      weightliftingSessions: Array.isArray(history.weightliftingSessions) ? history.weightliftingSessions : [],
    };
  }

  async function syncFitnessStats() {
    const existing = (await fetchPageState(profileStatsPageKey)) || { fitness: {}, hobbies: {} };
    const combined = [...weightliftingHistory, ...cardioHistory];
    const latestDate = combined
      .map((item) => item?.dateTime || '')
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || '';

    await postPageState(profileStatsPageKey, {
      ...existing,
      fitness: {
        totalWeightliftingSessions: weightliftingHistory.length,
        totalCardioSessions: cardioHistory.length,
        totalFitnessSessions: weightliftingHistory.length + cardioHistory.length,
        lastWorkoutAt: latestDate,
        updatedAt: new Date().toISOString(),
      },
    });
  }

  async function saveCompletedWorkout() {
    if (!activeWorkout) return;
    const history = await loadFitnessHistory();
    cardioHistory = history.cardioSessions;
    weightliftingHistory = history.weightliftingSessions;

    const typeLabel = workoutTypes[activeWorkout.type]?.label || activeWorkout.type;
    const session = {
      id: `${Date.now()}`,
      title: typeLabel,
      summary: `${typeLabel} workout`,
      notes: workoutNotes?.value?.trim() || '',
      dateTime: new Date().toISOString(),
      metrics: { ...visibleMetrics },
      steps: (activeWorkout.steps || []).map((step) => ({ text: step.text, actual: step.actual })),
      type: activeWorkout.type,
      values: { ...activeWorkout.values },
    };

    const nextHistory = {
      ...history,
      cardioSessions: [session, ...cardioHistory],
      weightliftingSessions: weightliftingHistory,
    };

    await postPageState(fitnessHistoryPageKey, nextHistory);
    cardioHistory = nextHistory.cardioSessions;
    await syncFitnessStats();
    window.alert('Completed workout saved.');
  }

  function startWorkout(event) {
    event?.preventDefault?.();
    ensureSelectedTypeExists();
    const values = getFieldValueMap();
    activeWorkout = {
      type: selectedType,
      values,
      steps: buildStepsForWorkout(selectedType, values),
    };
    visibleMetrics = {};
    if (workoutNotes) {
      workoutNotes.value = '';
    }
    renderLiveWorkout();
  }

  function resetWorkout() {
    activeWorkout = null;
    visibleMetrics = {};
    renderLiveWorkout();
  }

  workoutTypeSelect?.addEventListener('change', () => {
    selectedType = workoutTypeSelect.value;
    queueStoreSave();
    renderBuilderFields();
  });

  editWorkoutTypesButton?.addEventListener('click', () => {
    isEditingWorkoutTypes = !isEditingWorkoutTypes;
    renderWorkoutTypeEditor();
  });

  form?.addEventListener('submit', startWorkout);
  saveSplitsButton?.addEventListener('click', () => {
    autoCalculateMetrics();
    window.alert('Splits and completed steps saved.');
  });
  openManualMetricsButton?.addEventListener('click', renderManualMetricsPanel);
  autoCalculateMetricsButton?.addEventListener('click', autoCalculateMetrics);
  saveCompletedWorkoutButton?.addEventListener('click', saveCompletedWorkout);
  resetWorkoutButton?.addEventListener('click', resetWorkout);

  async function initialize() {
    await store.load();
    const state = store.getState();
    workoutTypes = normalizeWorkoutTypes(state.workoutTypes);
    selectedType = typeof state.selectedType === 'string' ? state.selectedType : 'hiit';
    ensureSelectedTypeExists();
    renderWorkoutTypeOptions();
    renderBuilderFields();
    renderWorkoutTypeEditor();
    renderLiveWorkout();
    store.startLifecyclePersistence();
  }

  void initialize();
}
