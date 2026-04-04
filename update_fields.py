from pathlib import Path

base = Path('/tmp/fieldsmove')
files = [
    'src/config/pages/education.ts',
    'src/lib/client/educationPage.ts',
    'src/lib/client/todayPage.ts',
    'src/pages/education.astro',
    'src/pages/today.astro',
    'src/src/config/pages/education.ts',
    'src/src/lib/client/educationPage.ts',
    'src/src/lib/client/todayPage.ts',
    'src/src/pages/education.astro',
    'src/src/pages/today.astro',
]

# education config
for rel in ['src/config/pages/education.ts', 'src/src/config/pages/education.ts']:
    p = base / rel
    text = p.read_text()
    text = text.replace(
"""          { id: 'assignment-due', name: 'assignmentDue', type: 'date', label: 'Due date', required: true, className: 'edu-label', inputClassName: 'text-input' },
          {
            id: 'assignment-class', name: 'assignmentClass', type: 'select', label: 'Class', required: true, className: 'edu-label', inputClassName: 'text-input',
            options: [{ value: '', label: 'Select a class' }],
          },
""",
"""          { id: 'assignment-due', name: 'assignmentDue', type: 'date', label: 'Due date', required: true, className: 'edu-label', inputClassName: 'text-input' },
          { id: 'assignment-start-time', name: 'assignmentStartTime', type: 'time', label: 'Start time (optional)', className: 'edu-label', inputClassName: 'text-input' },
          { id: 'assignment-due-time', name: 'assignmentDueTime', type: 'time', label: 'Due time (optional)', className: 'edu-label', inputClassName: 'text-input' },
          {
            id: 'assignment-class', name: 'assignmentClass', type: 'select', label: 'Class', required: true, className: 'edu-label', inputClassName: 'text-input',
            options: [{ value: '', label: 'Select a class' }],
          },
""")
    text = text.replace(
"""      dueInputId: 'assignment-due',
      classSelectId: 'assignment-class',
      weightInputId: 'assignment-weight',
""",
"""      dueInputId: 'assignment-due',
      startTimeInputId: 'assignment-start-time',
      dueTimeInputId: 'assignment-due-time',
      classSelectId: 'assignment-class',
      weightInputId: 'assignment-weight',
""")
    p.write_text(text)

# education client
for rel in ['src/lib/client/educationPage.ts', 'src/src/lib/client/educationPage.ts']:
    p = base / rel
    text = p.read_text()
    text = text.replace(
"""type Assignment = {
  id: string;
  name: string;
  dueDate: string;
  classId: string;
  weight?: number | null;
  completed?: boolean;
  createdAt?: string;
};
""",
"""type Assignment = {
  id: string;
  name: string;
  dueDate: string;
  startTime?: string | null;
  dueTime?: string | null;
  classId: string;
  weight?: number | null;
  completed?: boolean;
  createdAt?: string;
};
""")
    text = text.replace(
"""    assignments: {
      formId: string;
      nameInputId: string;
      dueInputId: string;
      classSelectId: string;
      weightInputId: string;
      dueThisWeekId: string;
""",
"""    assignments: {
      formId: string;
      nameInputId: string;
      dueInputId: string;
      startTimeInputId: string;
      dueTimeInputId: string;
      classSelectId: string;
      weightInputId: string;
      dueThisWeekId: string;
""")
    text = text.replace(
"""  const assignmentNameInput = document.getElementById(config.sections.assignments.nameInputId) as HTMLInputElement | null;
  const assignmentDueInput = document.getElementById(config.sections.assignments.dueInputId) as HTMLInputElement | null;
  const assignmentWeightInput = document.getElementById(config.sections.assignments.weightInputId) as HTMLInputElement | null;
""",
"""  const assignmentNameInput = document.getElementById(config.sections.assignments.nameInputId) as HTMLInputElement | null;
  const assignmentDueInput = document.getElementById(config.sections.assignments.dueInputId) as HTMLInputElement | null;
  const assignmentStartTimeInput = document.getElementById(config.sections.assignments.startTimeInputId) as HTMLInputElement | null;
  const assignmentDueTimeInput = document.getElementById(config.sections.assignments.dueTimeInputId) as HTMLInputElement | null;
  const assignmentWeightInput = document.getElementById(config.sections.assignments.weightInputId) as HTMLInputElement | null;
""")
    text = text.replace(
"""  function formatDate(dateStr: string) {
    const date = parseDate(dateStr);
    if (!date) return 'No date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
""",
"""  function formatDate(dateStr: string) {
    const date = parseDate(dateStr);
    if (!date) return 'No date';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function parseTimeValue(value?: string | null) {
    if (!value) return null;
    const [hours, minutes] = value.split(':');
    const hour = Number(hours);
    const minute = Number(minutes);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function formatTime(value?: string | null) {
    if (!value) return '';
    const [hours, minutes] = value.split(':');
    const date = new Date();
    date.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function getAssignmentSortValue(item: Assignment) {
    const dateValue = parseDate(item.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const timeValue = parseTimeValue(item.startTime) ?? parseTimeValue(item.dueTime) ?? Number.MAX_SAFE_INTEGER;
    return dateValue * 1440 + timeValue;
  }

  function buildAssignmentTimeMeta(item: Assignment) {
    return [
      item.startTime ? `Starts ${formatTime(item.startTime)}` : '',
      item.dueTime ? `Due ${formatTime(item.dueTime)}` : '',
    ].filter(Boolean);
  }
""")
    text = text.replace(
"""  function sortAssignments(items: Assignment[]) {
    return [...items].sort((a, b) => {
      const aTime = parseDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }
""",
"""  function sortAssignments(items: Assignment[]) {
    return [...items].sort((a, b) => getAssignmentSortValue(a) - getAssignmentSortValue(b) || a.name.localeCompare(b.name));
  }
""")
    text = text.replace(
"""          <div class="assignment-meta">
            <span>${escapeHtml(dueText)}</span>
            <span>${escapeHtml(formatDate(item.dueDate))}</span>
            ${item.weight ? `<span>${escapeHtml(item.weight)}% of grade</span>` : ''}
          </div>
""",
"""          <div class="assignment-meta">
            <span>${escapeHtml(dueText)}</span>
            <span>${escapeHtml(formatDate(item.dueDate))}</span>
            ${buildAssignmentTimeMeta(item).map((label) => `<span>${escapeHtml(label)}</span>`).join('')}
            ${item.weight ? `<span>${escapeHtml(item.weight)}% of grade</span>` : ''}
          </div>
""")
    text = text.replace(
"""    const dueDate = assignmentDueInput?.value || '';
    const classId = assignmentClassSelect?.value || '';
    const weightRaw = assignmentWeightInput?.value.trim() || '';
    if (!name || !dueDate || !classId) return;
    assignments.push({ id: makeId(), name, dueDate, classId, weight: weightRaw ? Number(weightRaw) : null, completed: false, createdAt: new Date().toISOString() });
""",
"""    const dueDate = assignmentDueInput?.value || '';
    const startTime = assignmentStartTimeInput?.value || '';
    const dueTime = assignmentDueTimeInput?.value || '';
    const classId = assignmentClassSelect?.value || '';
    const weightRaw = assignmentWeightInput?.value.trim() || '';
    if (!name || !dueDate || !classId) return;
    assignments.push({
      id: makeId(),
      name,
      dueDate,
      startTime: startTime || null,
      dueTime: dueTime || null,
      classId,
      weight: weightRaw ? Number(weightRaw) : null,
      completed: false,
      createdAt: new Date().toISOString(),
    });
""")
    text = text.replace(
"""    assignments = (saved.assignments || []).map((item) => ({ ...item, completed: Boolean(item.completed) }));
""",
"""    assignments = (saved.assignments || []).map((item) => ({
      ...item,
      startTime: item.startTime || null,
      dueTime: item.dueTime || null,
      completed: Boolean(item.completed),
    }));
""")
    p.write_text(text)

# today client
for rel in ['src/lib/client/todayPage.ts', 'src/src/lib/client/todayPage.ts']:
    p = base / rel
    text = p.read_text()
    text = text.replace(
"""type EducationAssignment = {
  id: string;
  name: string;
  dueDate: string;
  dueTime?: string | null;
  classId?: string;
  completed?: boolean;
  createdAt?: string;
};
""",
"""type EducationAssignment = {
  id: string;
  name: string;
  dueDate: string;
  startTime?: string | null;
  dueTime?: string | null;
  classId?: string;
  completed?: boolean;
  createdAt?: string;
};
""")
    marker = "function uniqueStrings(items: unknown) {\n  if (!Array.isArray(items)) return [] as string[];\n  return [...new Set(items.map((item) => (typeof item === \"string\" ? item.trim() : \"\")).filter(Boolean))];\n}\n"
    replacement = marker + "\nfunction getEducationAssignmentSortTime(assignment: EducationAssignment) {\n  return parseTimeValue(assignment.startTime) ?? parseTimeValue(assignment.dueTime) ?? Number.MAX_SAFE_INTEGER;\n}\n\nfunction getEducationAssignmentTimeLabel(assignment: EducationAssignment) {\n  const parts = [\n    assignment.startTime ? `Start ${formatTime(assignment.startTime)}` : \"\",\n    assignment.dueTime ? `Due ${formatTime(assignment.dueTime)}` : \"\",\n  ].filter(Boolean);\n\n  return parts.join(\" • \" );\n}\n"
    if 'function getEducationAssignmentSortTime' not in text:
        text = text.replace(marker, replacement)
    text = text.replace(
"""        const hasTime = Boolean(assignment.dueTime);
""",
"""        const hasTime = Boolean(assignment.startTime || assignment.dueTime);
""")
    text = text.replace(
"""    const hasTime = Boolean(assignment.dueTime);
    const timeLabel = assignment.dueTime ? `Due ${formatTime(assignment.dueTime)}` : "";
    const meta = [course?.name || "Education", section === "nonOrdered" && hasTime ? "Kept in flexible" : "Due today"].filter(Boolean);
""",
"""    const hasTime = Boolean(assignment.startTime || assignment.dueTime);
    const timeLabel = getEducationAssignmentTimeLabel(assignment);
    const meta = [
      course?.name || "Education",
      assignment.startTime ? "Starts today" : "Due today",
      section === "nonOrdered" && hasTime ? "Kept in flexible" : "",
      section === "ordered" && !hasTime ? "No time set" : "",
    ].filter(Boolean);
""")
    text = text.replace(
"""      defaultSortValue: parseTimeValue(assignment.dueTime) ?? Number.MAX_SAFE_INTEGER,
""",
"""      defaultSortValue: getEducationAssignmentSortTime(assignment),
""")
    text = text.replace(
"""        const hasTime = Boolean(assignment.dueTime);
""",
"""        const hasTime = Boolean(assignment.startTime || assignment.dueTime);
""")
    text = text.replace(
"""      assignments: Array.isArray(educationResponse?.state?.assignments) ? educationResponse?.state?.assignments ?? [] : [],
""",
"""      assignments: Array.isArray(educationResponse?.state?.assignments)
        ? (educationResponse?.state?.assignments ?? []).map((assignment) => ({
            ...assignment,
            startTime: assignment.startTime || null,
            dueTime: assignment.dueTime || null,
          }))
        : [],
""")
    p.write_text(text)

# pages education.astro minimal field additions and wording + init config ids / inline logic delegate to same concepts
for rel in ['src/pages/education.astro', 'src/src/pages/education.astro']:
    p = base / rel
    text = p.read_text()
    text = text.replace('subtitle="Add work by class and due date."', 'subtitle="Add work by class, due date, and optional start or due times."')
    text = text.replace(
"""          <label class="edu-label">
            <span>Due date</span>
            <input type="date" id="assignment-due" required />
          </label>

          <label class="edu-label">
            <span>Class</span>
""",
"""          <label class="edu-label">
            <span>Due date</span>
            <input type="date" id="assignment-due" required />
          </label>

          <label class="edu-label">
            <span>Start time (optional)</span>
            <input type="time" id="assignment-start-time" />
          </label>

          <label class="edu-label">
            <span>Due time (optional)</span>
            <input type="time" id="assignment-due-time" />
          </label>

          <label class="edu-label">
            <span>Class</span>
""")
    # inline script additions only if older inline present
    if 'function parseTimeValue(' not in text:
        text = text.replace(
"""  function formatDate(dateStr) {
    const date = parseDate(dateStr);
    if (!date) return "No date";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
""",
"""  function formatDate(dateStr) {
    const date = parseDate(dateStr);
    if (!date) return "No date";
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function parseTimeValue(value) {
    if (!value) return null;
    const [hours, minutes] = value.split(":");
    const hour = Number(hours);
    const minute = Number(minutes);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function formatTime(value) {
    if (!value) return "";
    const [hours, minutes] = value.split(":");
    const date = new Date();
    date.setHours(Number(hours || 0), Number(minutes || 0), 0, 0);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function getAssignmentSortValue(item) {
    const dateValue = parseDate(item.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const timeValue = parseTimeValue(item.startTime) ?? parseTimeValue(item.dueTime) ?? Number.MAX_SAFE_INTEGER;
    return dateValue * 1440 + timeValue;
  }

  function buildAssignmentTimeMeta(item) {
    return [
      item.startTime ? `Starts ${formatTime(item.startTime)}` : "",
      item.dueTime ? `Due ${formatTime(item.dueTime)}` : "",
    ].filter(Boolean);
  }
""")
        text = text.replace(
"""  function sortAssignments(items) {
    return [...items].sort((a, b) => {
      const aTime = parseDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = parseDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return aTime - bTime;
    });
  }
""",
"""  function sortAssignments(items) {
    return [...items].sort((a, b) => getAssignmentSortValue(a) - getAssignmentSortValue(b) || a.name.localeCompare(b.name));
  }
""")
        text = text.replace(
"""            <span>${escapeHtml(dueText)}</span>
            <span>${escapeHtml(formatDate(item.dueDate))}</span>
            ${item.weight ? `<span>${escapeHtml(item.weight)}% of grade</span>` : ""}
""",
"""            <span>${escapeHtml(dueText)}</span>
            <span>${escapeHtml(formatDate(item.dueDate))}</span>
            ${buildAssignmentTimeMeta(item).map((label) => `<span>${escapeHtml(label)}</span>`).join("")}
            ${item.weight ? `<span>${escapeHtml(item.weight)}% of grade</span>` : ""}
""")
        text = text.replace(
"""    const assignmentClassSelect = document.getElementById("assignment-class");
    const assignmentWeightInput = document.getElementById("assignment-weight");
""",
"""    const assignmentClassSelect = document.getElementById("assignment-class");
    const assignmentStartTimeInput = document.getElementById("assignment-start-time");
    const assignmentDueTimeInput = document.getElementById("assignment-due-time");
    const assignmentWeightInput = document.getElementById("assignment-weight");
""")
        text = text.replace(
"""      assignments = (saved.assignments || []).map((item) => ({ ...item, completed: Boolean(item.completed) }));
""",
"""      assignments = (saved.assignments || []).map((item) => ({
        ...item,
        startTime: item.startTime || null,
        dueTime: item.dueTime || null,
        completed: Boolean(item.completed),
      }));
""")
        text = text.replace(
"""      const dueDate = assignmentDueInput?.value || "";
      const classId = assignmentClassSelect?.value || "";
      const weightRaw = assignmentWeightInput?.value.trim() || "";

      if (!name || !dueDate || !classId) return;

      assignments.push({
        id: makeId(),
        name,
        dueDate,
        classId,
        weight: weightRaw ? Number(weightRaw) : null,
        completed: false,
        createdAt: new Date().toISOString(),
      });
""",
"""      const dueDate = assignmentDueInput?.value || "";
      const startTime = assignmentStartTimeInput?.value || "";
      const dueTime = assignmentDueTimeInput?.value || "";
      const classId = assignmentClassSelect?.value || "";
      const weightRaw = assignmentWeightInput?.value.trim() || "";

      if (!name || !dueDate || !classId) return;

      assignments.push({
        id: makeId(),
        name,
        dueDate,
        startTime: startTime || null,
        dueTime: dueTime || null,
        classId,
        weight: weightRaw ? Number(weightRaw) : null,
        completed: false,
        createdAt: new Date().toISOString(),
      });
""")
    p.write_text(text)

# today astro subtitle tweak both copies
for rel in ['src/pages/today.astro', 'src/src/pages/today.astro']:
    p = base / rel
    text = p.read_text()
    text = text.replace(
      'subtitle="Timed items from Today, Work, and Education, sorted from earliest to latest by default."',
      'subtitle="Timed items from Today, Work, and Education, including assignment start and due times, sorted from earliest to latest by default."'
    )
    text = text.replace(
      'subtitle="Timed items from Today, Work, and Education, sorted from earliest to latest."',
      'subtitle="Timed items from Today, Work, and Education, including assignment start and due times, sorted from earliest to latest."'
    )
    p.write_text(text)

print('updated')
