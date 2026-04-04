// @ts-nocheck
import type { CareerSectionMeta } from "../../config/pages/careerShared";

interface CareerInformationState {
  projects: unknown[];
  school: unknown[];
  experience: unknown[];
  about: unknown[];
  looking: unknown[];
  pitch: unknown[];
  stats: unknown[];
  contact: unknown[];
  timelineItems: unknown[];
  recommendations: unknown[];
  star: unknown[];
  resume: unknown[];
}

interface CareerInformationClientConfig {
  pageKey: string;
  defaults: CareerInformationState;
  sections?: CareerSectionMeta[];
}

export function initCareerInformationPage(config: CareerInformationClientConfig) {
    const pageKey = config.pageKey || "career-information";

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(config.defaults || {}));
  }

  function makeId(prefix = "id") {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeBoolean(value, fallback = true) {
    return typeof value === "boolean" ? value : fallback;
  }

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function isPdfResume(item) {
    return String(item?.fileType || "").toLowerCase().includes("pdf") ||
      String(item?.fileName || "").toLowerCase().endsWith(".pdf");
  }

  function normalizeData(raw) {
    const defaults = cloneDefaults();
    const parsed = raw && typeof raw === "object" ? raw : {};

    const timelineSource = Array.isArray(parsed.timelineItems)
      ? parsed.timelineItems
      : Array.isArray(parsed.timeline)
      ? parsed.timeline
      : [];

    return {
      ...defaults,
      projects: normalizeArray(parsed.projects).map((item) => ({
        id: item?.id || makeId("project"),
        title: item?.title || "",
        description: item?.description || "",
        stage: item?.stage || "",
        completed: item?.completed || "",
        timeline: item?.timeline || "",
        impact: item?.impact || "",
        members: item?.members || "",
        parts: item?.parts || "",
        specifications: item?.specifications || "",
        depth: item?.depth || "",
        issues: item?.issues || "",
        visuals: item?.visuals || "",
        diagrams: item?.diagrams || "",
        link: item?.link || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      school: normalizeArray(parsed.school).map((item) => ({
        id: item?.id || makeId("school"),
        title: item?.title || "",
        helped: item?.helped || "",
        relevance: item?.relevance || "",
        prof: item?.prof || "",
        stage: item?.stage || "",
        notes: item?.notes || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      experience: normalizeArray(parsed.experience).map((item) => ({
        id: item?.id || makeId("experience"),
        title: item?.title || "",
        date: item?.date || "",
        impact: item?.impact || "",
        boss: item?.boss || "",
        responsibilities: Array.isArray(item?.responsibilities)
          ? item.responsibilities.filter(Boolean)
          : typeof item?.responsibilities === "string"
          ? item.responsibilities.split("\n").map((x) => x.trim()).filter(Boolean)
          : [],
        pictures: item?.pictures || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      about: normalizeArray(parsed.about).map((item) => ({
        id: item?.id || makeId("about"),
        title: item?.title || "About Me",
        body: item?.body || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      looking: normalizeArray(parsed.looking).map((item) => ({
        id: item?.id || makeId("looking"),
        title: item?.title || "What I'm Looking For",
        body: item?.body || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      pitch: normalizeArray(parsed.pitch).map((item) => ({
        id: item?.id || makeId("pitch"),
        title: item?.title || "Pitch",
        body: item?.body || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      stats: normalizeArray(parsed.stats).map((item) => ({
        id: item?.id || makeId("stat"),
        title: item?.title || "",
        impact: item?.impact || "",
        description: item?.description || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      contact: normalizeArray(parsed.contact).slice(0, 1).map((item) => ({
        id: item?.id || makeId("contact"),
        title: item?.title || "Contact Info",
        github: item?.github || "",
        email: item?.email || "",
        phone: item?.phone || "",
        link: item?.link || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      resume: normalizeArray(parsed.resume).slice(0, 1).map((item) => ({
        id: item?.id || makeId("resume"),
        title: item?.title || "Resume",
        fileName: item?.fileName || "",
        fileType: item?.fileType || "",
        fileSize: Number(item?.fileSize || 0),
        fileUrl: item?.fileUrl || "",
        note: item?.note || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      timelineItems: timelineSource.map((item) => ({
        id: item?.id || makeId("timeline"),
        title: item?.title || "",
        date: item?.date || "",
        description: item?.description || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      recommendations: normalizeArray(parsed.recommendations).map((item) => ({
        id: item?.id || makeId("recommendation"),
        title: item?.title || "",
        body: item?.body || "",
        owner: item?.owner || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      star: normalizeArray(parsed.star).map((item) => ({
        id: item?.id || makeId("star"),
        title: item?.title || "",
        situation: item?.situation || "",
        task: item?.task || "",
        action: item?.action || "",
        result: item?.result || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
    };
  }

  function getSavableState(source) {
    const clean = deepClone(source);

    clean.resume = normalizeArray(clean.resume).map((item) => ({
      id: item?.id || makeId("resume"),
      title: item?.title || "Resume",
      fileName: item?.fileName || "",
      fileType: item?.fileType || "",
      fileSize: Number(item?.fileSize || 0),
      fileUrl: item?.fileUrl || "",
      note: item?.note || "",
      visible: normalizeBoolean(item?.visible, true),
    }));

    return clean;
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function getChecked(id) {
    const el = document.getElementById(id);
    return !!el?.checked;
  }

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function setCount(id, count) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(count);
  }

  function setSaveStatus(text, kind = "neutral") {
    const el = document.getElementById("save-status");
    if (!el) return;
    el.textContent = text;
    el.className = `save-status ${kind}`;
  }

  async function loadState() {
    try {
      const res = await fetch(`/api/state?pageKey=${encodeURIComponent(pageKey)}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        console.error("Failed to load state:", res.status, res.statusText);
        return null;
      }

      const payload = await res.json();
      return payload?.state ?? null;
    } catch (error) {
      console.error("Failed to load state:", error);
      return null;
    }
  }

  async function uploadResumeFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload-resume", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const payload = await res.json().catch(() => null);

    if (!res.ok) {
      throw new Error(payload?.error || `Upload failed (${res.status})`);
    }

    return payload;
  }

  let data = cloneDefaults();
  let hasLoadedInitialState = false;
  let isSaving = false;
  let pendingSave = false;
  let saveQueuedSnapshot = null;

  async function postState(snapshot) {
    const res = await fetch("/api/state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageKey,
        state: snapshot,
      }),
    });

    if (!res.ok) {
      const message = `Save failed (${res.status})`;
      const error = new Error(message);
      error.status = res.status;
      throw error;
    }
  }

  async function saveState() {
    if (!hasLoadedInitialState) return;

    const snapshot = getSavableState(data);
    saveQueuedSnapshot = snapshot;

    if (isSaving) {
      pendingSave = true;
      setSaveStatus("Queued save...", "neutral");
      return;
    }

    isSaving = true;
    setSaveStatus("Saving...", "neutral");

    try {
      await postState(saveQueuedSnapshot);
      setSaveStatus("Saved", "success");
    } catch (error) {
      console.error("Failed to save state:", error);
      if (error?.status === 413) {
        setSaveStatus("Save failed: payload too large", "error");
      } else {
        setSaveStatus("Save failed", "error");
      }
    } finally {
      isSaving = false;

      if (pendingSave) {
        pendingSave = false;
        await saveState();
      }
    }
  }

  async function persistAndRefresh() {
    renderSavedEntries();
    await saveState();
  }

  async function deleteItem(group, id) {
    data[group] = normalizeArray(data[group]).filter((item) => item.id !== id);
    await persistAndRefresh();
  }

  async function toggleVisible(group, id) {
    data[group] = normalizeArray(data[group]).map((item) =>
      item.id === id ? { ...item, visible: !item.visible } : item
    );
    await persistAndRefresh();
  }

  function emptyCard(text) {
    return `<article class="assignment-card"><div class="assignment-main"><p class="empty-state">${escapeHtml(text)}</p></div></article>`;
  }

  function buildProjectsForm() {
    return `
      <div class="dynamic-form-card">
        <p class="section-helper">Projects need technical structure, visuals, team info, and build details.</p>

        <div class="dynamic-form-grid">
          <label class="edu-label">
            <span>Project title</span>
            <input id="dynamic-project-title" class="form-input" placeholder="Radiation Effects in GAAFET Devices" />
          </label>

          <label class="edu-label">
            <span>Stage</span>
            <input id="dynamic-project-stage" class="form-input" placeholder="Concept, prototyping, testing, completed" />
          </label>

          <label class="edu-label dynamic-form-full">
            <span>Description</span>
            <textarea id="dynamic-project-description" class="form-textarea" placeholder="Project description"></textarea>
          </label>

          <label class="edu-label">
            <span>Members</span>
            <input id="dynamic-project-members" class="form-input" placeholder="Names or team size" />
          </label>

          <label class="edu-label">
            <span>Impact</span>
            <input id="dynamic-project-impact" class="form-input" placeholder="Performance, insight, deliverable" />
          </label>

          <label class="edu-label">
            <span>Status</span>
            <select id="dynamic-project-status" class="form-input">
              <option value="">Select status</option>
              <option>Completed</option>
              <option>In Progress</option>
              <option>Paused</option>
            </select>
          </label>

          <label class="edu-label">
            <span>Timeline</span>
            <input id="dynamic-project-timeline" class="form-input" placeholder="Spring 2025 - Summer 2025" />
          </label>

          <label class="edu-label">
            <span>Parts / Tools</span>
            <input id="dynamic-project-parts" class="form-input" placeholder="Sensors, boards, software, tools" />
          </label>

          <label class="edu-label">
            <span>Specs</span>
            <input id="dynamic-project-specs" class="form-input" placeholder="Voltage, speed, accuracy, size..." />
          </label>

          <label class="edu-label dynamic-form-full">
            <span>Technical depth</span>
            <textarea id="dynamic-project-depth" class="form-textarea" placeholder="Why this project is technically strong"></textarea>
          </label>

          <label class="edu-label dynamic-form-full">
            <span>Issues / Challenges</span>
            <textarea id="dynamic-project-issues" class="form-textarea" placeholder="Problems encountered and how they were handled"></textarea>
          </label>

          <label class="edu-label">
            <span>Visuals</span>
            <input id="dynamic-project-visuals" class="form-input" placeholder="/images/career/project.jpg or visual notes" />
          </label>

          <label class="edu-label">
            <span>Diagrams</span>
            <input id="dynamic-project-diagrams" class="form-input" placeholder="/images/career/diagram.jpg or diagram notes" />
          </label>

          <label class="edu-label">
            <span>Link</span>
            <input id="dynamic-project-link" class="form-input" placeholder="GitHub, demo, paper" />
          </label>

          <label class="check-row dynamic-form-full">
            <input id="dynamic-project-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-project-btn" type="button">Save Project</button>
      </div>
    `;
  }

  function buildSchoolForm() {
    return `
      <div class="dynamic-form-card">
        <p class="section-helper">School items should capture the class, what it built in you, and why it matters.</p>
        <div class="dynamic-form-grid">
          <label class="edu-label">
            <span>Class / item title</span>
            <input id="dynamic-school-title" class="form-input" placeholder="ECE 30200" />
          </label>

          <label class="edu-label">
            <span>Professor</span>
            <input id="dynamic-school-prof" class="form-input" placeholder="Professor name" />
          </label>

          <label class="edu-label dynamic-form-full">
            <span>This class helped with</span>
            <textarea id="dynamic-school-helped" class="form-textarea" placeholder="What this developed"></textarea>
          </label>

          <label class="edu-label">
            <span>Relevance</span>
            <input id="dynamic-school-relevance" class="form-input" placeholder="Why it matters to your path" />
          </label>

          <label class="edu-label">
            <span>Stage / status</span>
            <input id="dynamic-school-stage" class="form-input" placeholder="Completed, ongoing, key learning phase" />
          </label>

          <label class="edu-label dynamic-form-full">
            <span>Notes</span>
            <textarea id="dynamic-school-notes" class="form-textarea" placeholder="Extra notes"></textarea>
          </label>

          <label class="check-row dynamic-form-full">
            <input id="dynamic-school-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-school-btn" type="button">Save School Item</button>
      </div>
    `;
  }

  function buildExperienceForm() {
    return `
      <div class="dynamic-form-card">
        <p class="section-helper">Work experience needs role, date, impact, leader, and responsibilities.</p>
        <div class="dynamic-form-grid">
          <label class="edu-label">
            <span>Role / company</span>
            <input id="dynamic-exp-title" class="form-input" placeholder="Engineering Intern - Company" />
          </label>

          <label class="edu-label">
            <span>Manager / boss</span>
            <input id="dynamic-exp-boss" class="form-input" placeholder="Boss or mentor" />
          </label>

          <label class="edu-label">
            <span>Date / range</span>
            <input id="dynamic-exp-date" class="form-input" placeholder="May 2025 - Aug 2025" />
          </label>

          <label class="edu-label">
            <span>Impact</span>
            <input id="dynamic-exp-impact" class="form-input" placeholder="What changed because of your work?" />
          </label>

          <label class="edu-label dynamic-form-full">
            <span>Responsibilities</span>
            <textarea id="dynamic-exp-responsibilities" class="form-textarea" placeholder="One responsibility per line"></textarea>
          </label>

          <label class="edu-label">
            <span>Pictures / visuals</span>
            <input id="dynamic-exp-pictures" class="form-input" placeholder="/images/career/work.jpg or visual notes" />
          </label>

          <label class="check-row dynamic-form-full">
            <input id="dynamic-exp-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-exp-btn" type="button">Save Experience</button>
      </div>
    `;
  }

  function buildAboutForm() {
    return `
      <div class="dynamic-form-card">
        <p class="section-helper">About / Story should stay simple and text-driven.</p>
        <div class="dynamic-form-grid one">
          <label class="edu-label">
            <span>Section title</span>
            <input id="dynamic-about-title" class="form-input" placeholder="About Me" />
          </label>

          <label class="edu-label">
            <span>Story</span>
            <textarea id="dynamic-about-body" class="form-textarea" placeholder="Your background, what drives you, what you care about"></textarea>
          </label>

          <label class="check-row">
            <input id="dynamic-about-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-about-btn" type="button">Save About Section</button>
      </div>
    `;
  }

  function buildLookingForm() {
    return `
      <div class="dynamic-form-card">
        <div class="dynamic-form-grid one">
          <label class="edu-label">
            <span>Title</span>
            <input id="dynamic-looking-title" class="form-input" placeholder="What I'm Looking For" />
          </label>

          <label class="edu-label">
            <span>Details</span>
            <textarea id="dynamic-looking-body" class="form-textarea" placeholder="Roles, environments, technologies, industries"></textarea>
          </label>

          <label class="check-row">
            <input id="dynamic-looking-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-looking-btn" type="button">Save Looking For</button>
      </div>
    `;
  }

  function buildPitchForm() {
    return `
      <div class="dynamic-form-card">
        <div class="dynamic-form-grid one">
          <label class="edu-label">
            <span>Headline / pitch</span>
            <input id="dynamic-pitch-title" class="form-input" placeholder="Semiconductor + embedded systems engineer..." />
          </label>

          <label class="edu-label">
            <span>Expanded pitch</span>
            <textarea id="dynamic-pitch-body" class="form-textarea" placeholder="Short pitch paragraph"></textarea>
          </label>

          <label class="check-row">
            <input id="dynamic-pitch-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-pitch-btn" type="button">Save Pitch</button>
      </div>
    `;
  }

  function buildStatsForm() {
    return `
      <div class="dynamic-form-card">
        <div class="dynamic-form-grid">
          <label class="edu-label">
            <span>Stat title</span>
            <input id="dynamic-stat-title" class="form-input" placeholder="Research Simulations" />
          </label>

          <label class="edu-label">
            <span>Big stat / impact</span>
            <input id="dynamic-stat-impact" class="form-input" placeholder="150+" />
          </label>

          <label class="edu-label dynamic-form-full">
            <span>Description</span>
            <textarea id="dynamic-stat-description" class="form-textarea" placeholder="What this stat means"></textarea>
          </label>

          <label class="check-row dynamic-form-full">
            <input id="dynamic-stat-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-stat-btn" type="button">Save Stat</button>
      </div>
    `;
  }

  function buildContactForm() {
    return `
      <div class="dynamic-form-card">
        <div class="dynamic-form-grid">
          <label class="edu-label">
            <span>GitHub</span>
            <input id="dynamic-contact-github" class="form-input" placeholder="github.com/username" />
          </label>

          <label class="edu-label">
            <span>Email</span>
            <input id="dynamic-contact-email" class="form-input" placeholder="you@email.com" />
          </label>

          <label class="edu-label">
            <span>Phone</span>
            <input id="dynamic-contact-phone" class="form-input" placeholder="(555) 555-5555" />
          </label>

          <label class="edu-label">
            <span>LinkedIn / website</span>
            <input id="dynamic-contact-link" class="form-input" placeholder="linkedin.com/in/you" />
          </label>

          <label class="check-row dynamic-form-full">
            <input id="dynamic-contact-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-contact-btn" type="button">Save Contact Info</button>
      </div>
    `;
  }

  function buildResumeForm() {
    return `
      <div class="dynamic-form-card">
        <p class="section-helper">
          Upload a resume file. PDF resumes can be previewed on both the Information and Portfolio pages.
        </p>

        <div class="dynamic-form-grid one">
          <label class="edu-label">
            <span>Resume title</span>
            <input id="dynamic-resume-title" class="form-input" placeholder="Current Resume" />
          </label>

          <label class="edu-label">
            <span>Resume file</span>
            <input
              id="dynamic-resume-file"
              class="form-input"
              type="file"
              accept=".pdf,.doc,.docx,.rtf,.txt,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,application/vnd.oasis.opendocument.text"
            />
          </label>

          <label class="edu-label">
            <span>Notes</span>
            <textarea id="dynamic-resume-note" class="form-textarea" placeholder="Optional note about which version this is"></textarea>
          </label>

          <label class="check-row">
            <input id="dynamic-resume-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-resume-btn" type="button">Upload + Save Resume</button>
      </div>
    `;
  }

  function buildTimelineForm() {
    return `
      <div class="dynamic-form-card">
        <div class="dynamic-form-grid">
          <label class="edu-label">
            <span>Milestone title</span>
            <input id="dynamic-timeline-title" class="form-input" placeholder="Started semiconductor research" />
          </label>

          <label class="edu-label">
            <span>Date</span>
            <input id="dynamic-timeline-date" type="date" class="form-input" />
          </label>

          <label class="edu-label dynamic-form-full">
            <span>Description</span>
            <textarea id="dynamic-timeline-description" class="form-textarea" placeholder="What happened and why it mattered"></textarea>
          </label>

          <label class="check-row dynamic-form-full">
            <input id="dynamic-timeline-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-timeline-btn" type="button">Save Timeline Item</button>
      </div>
    `;
  }

  function buildRecommendationsForm() {
    return `
      <div class="dynamic-form-card">
        <div class="dynamic-form-grid one">
          <label class="edu-label">
            <span>Name / source</span>
            <input id="dynamic-rec-title" class="form-input" placeholder="Professor / manager / reference" />
          </label>

          <label class="edu-label">
            <span>Recommendation</span>
            <textarea id="dynamic-rec-body" class="form-textarea" placeholder="Recommendation text or notes"></textarea>
          </label>

          <label class="edu-label">
            <span>Role / context</span>
            <input id="dynamic-rec-owner" class="form-input" placeholder="Professor, manager, mentor" />
          </label>

          <label class="check-row">
            <input id="dynamic-rec-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-rec-btn" type="button">Save Recommendation</button>
      </div>
    `;
  }

  function buildStarForm() {
    return `
      <div class="dynamic-form-card">
        <div class="dynamic-form-grid one">
          <label class="edu-label">
            <span>STAR title</span>
            <input id="dynamic-star-title" class="form-input" placeholder="Debugging a failing prototype" />
          </label>

          <label class="edu-label">
            <span>Situation</span>
            <textarea id="dynamic-star-situation" class="form-textarea" placeholder="Situation"></textarea>
          </label>

          <label class="edu-label">
            <span>Task</span>
            <textarea id="dynamic-star-task" class="form-textarea" placeholder="Task"></textarea>
          </label>

          <label class="edu-label">
            <span>Action</span>
            <textarea id="dynamic-star-action" class="form-textarea" placeholder="Action"></textarea>
          </label>

          <label class="edu-label">
            <span>Result</span>
            <textarea id="dynamic-star-result" class="form-textarea" placeholder="Result"></textarea>
          </label>

          <label class="check-row">
            <input id="dynamic-star-visible" type="checkbox" checked />
            <span>Show in portfolio</span>
          </label>
        </div>

        <button class="button-primary career-inline-button" id="dynamic-save-star-btn" type="button">Save STAR Example</button>
      </div>
    `;
  }

  function renderDynamicForm() {
    const select = document.getElementById("dynamic-section-select");
    const area = document.getElementById("dynamic-form-area");
    if (!select || !area) return;

    const map = {
      projects: buildProjectsForm,
      school: buildSchoolForm,
      experience: buildExperienceForm,
      about: buildAboutForm,
      looking: buildLookingForm,
      pitch: buildPitchForm,
      stats: buildStatsForm,
      contact: buildContactForm,
      resume: buildResumeForm,
      timeline: buildTimelineForm,
      recommendations: buildRecommendationsForm,
      star: buildStarForm,
    };

    area.innerHTML = map[select.value] ? map[select.value]() : "";
    bindDynamicFormActions();
  }

  function bindDynamicFormActions() {
    document.getElementById("dynamic-save-project-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-project-title");
      if (!title) return;

      data.projects.unshift({
        id: makeId("project"),
        title,
        description: getValue("dynamic-project-description"),
        stage: getValue("dynamic-project-stage"),
        completed: getValue("dynamic-project-status"),
        timeline: getValue("dynamic-project-timeline"),
        impact: getValue("dynamic-project-impact"),
        members: getValue("dynamic-project-members"),
        parts: getValue("dynamic-project-parts"),
        specifications: getValue("dynamic-project-specs"),
        depth: getValue("dynamic-project-depth"),
        issues: getValue("dynamic-project-issues"),
        visuals: getValue("dynamic-project-visuals"),
        diagrams: getValue("dynamic-project-diagrams"),
        link: getValue("dynamic-project-link"),
        visible: getChecked("dynamic-project-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-school-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-school-title");
      if (!title) return;

      data.school.unshift({
        id: makeId("school"),
        title,
        helped: getValue("dynamic-school-helped"),
        relevance: getValue("dynamic-school-relevance"),
        prof: getValue("dynamic-school-prof"),
        stage: getValue("dynamic-school-stage"),
        notes: getValue("dynamic-school-notes"),
        visible: getChecked("dynamic-school-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-exp-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-exp-title");
      if (!title) return;

      data.experience.unshift({
        id: makeId("experience"),
        title,
        date: getValue("dynamic-exp-date"),
        impact: getValue("dynamic-exp-impact"),
        boss: getValue("dynamic-exp-boss"),
        responsibilities: getValue("dynamic-exp-responsibilities")
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        pictures: getValue("dynamic-exp-pictures"),
        visible: getChecked("dynamic-exp-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-about-btn")?.addEventListener("click", async () => {
      const body = getValue("dynamic-about-body");
      if (!body) return;

      data.about.unshift({
        id: makeId("about"),
        title: getValue("dynamic-about-title") || "About Me",
        body,
        visible: getChecked("dynamic-about-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-looking-btn")?.addEventListener("click", async () => {
      const body = getValue("dynamic-looking-body");
      if (!body) return;

      data.looking.unshift({
        id: makeId("looking"),
        title: getValue("dynamic-looking-title") || "What I'm Looking For",
        body,
        visible: getChecked("dynamic-looking-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-pitch-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-pitch-title");
      const body = getValue("dynamic-pitch-body");
      if (!title && !body) return;

      data.pitch.unshift({
        id: makeId("pitch"),
        title: title || "Pitch",
        body,
        visible: getChecked("dynamic-pitch-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-stat-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-stat-title");
      if (!title) return;

      data.stats.unshift({
        id: makeId("stat"),
        title,
        impact: getValue("dynamic-stat-impact"),
        description: getValue("dynamic-stat-description"),
        visible: getChecked("dynamic-stat-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-contact-btn")?.addEventListener("click", async () => {
      const github = getValue("dynamic-contact-github");
      const email = getValue("dynamic-contact-email");
      const phone = getValue("dynamic-contact-phone");
      const link = getValue("dynamic-contact-link");

      if (!github && !email && !phone && !link) return;

      data.contact = [
        {
          id: makeId("contact"),
          title: "Contact Info",
          github,
          email,
          phone,
          link,
          visible: getChecked("dynamic-contact-visible"),
        },
      ];

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-resume-btn")?.addEventListener("click", async () => {
      const fileInput = document.getElementById("dynamic-resume-file");
      const file = fileInput?.files?.[0];
      const title = getValue("dynamic-resume-title") || "Resume";
      const note = getValue("dynamic-resume-note");
      const visible = getChecked("dynamic-resume-visible");

      if (!file && !data.resume?.[0]) {
        if (!note) return;
      }

      try {
        setSaveStatus(file ? "Uploading resume..." : "Saving...", "neutral");

        let nextResume = data.resume?.[0]
          ? { ...data.resume[0] }
          : {
              id: makeId("resume"),
              title: "Resume",
              fileName: "",
              fileType: "",
              fileSize: 0,
              fileUrl: "",
              note: "",
              visible: true,
            };

        if (file) {
          const uploaded = await uploadResumeFile(file);

          nextResume = {
            ...nextResume,
            id: nextResume.id || makeId("resume"),
            title,
            fileName: uploaded.fileName || file.name,
            fileType: uploaded.fileType || file.type || "",
            fileSize: Number(uploaded.fileSize || file.size || 0),
            fileUrl: uploaded.fileUrl || "",
            note,
            visible,
          };
        } else {
          nextResume = {
            ...nextResume,
            title,
            note,
            visible,
          };
        }

        data.resume = [nextResume];

        await persistAndRefresh();
        renderDynamicForm();
      } catch (error) {
        console.error("Resume upload failed:", error);
        setSaveStatus(error?.message || "Resume upload failed", "error");
        window.alert(error?.message || "Resume upload failed");
      }
    });

    document.getElementById("dynamic-save-timeline-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-timeline-title");
      if (!title) return;

      data.timelineItems.unshift({
        id: makeId("timeline"),
        title,
        date: document.getElementById("dynamic-timeline-date")?.value || "",
        description: getValue("dynamic-timeline-description"),
        visible: getChecked("dynamic-timeline-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-rec-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-rec-title");
      if (!title) return;

      data.recommendations.unshift({
        id: makeId("recommendation"),
        title,
        body: getValue("dynamic-rec-body"),
        owner: getValue("dynamic-rec-owner"),
        visible: getChecked("dynamic-rec-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-star-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-star-title");
      if (!title) return;

      data.star.unshift({
        id: makeId("star"),
        title,
        situation: getValue("dynamic-star-situation"),
        task: getValue("dynamic-star-task"),
        action: getValue("dynamic-star-action"),
        result: getValue("dynamic-star-result"),
        visible: getChecked("dynamic-star-visible"),
      });

      await persistAndRefresh();
      renderDynamicForm();
    });
  }

  function buildResumeActions(item) {
    if (!item?.fileUrl) {
      return `<p><strong>File:</strong> Not uploaded yet</p>`;
    }

    const previewButton = isPdfResume(item)
      ? `
        <a class="button-secondary career-inline-button career-inline-button-mini" href="${escapeHtml(item.fileUrl)}#toolbar=1" target="_blank" rel="noreferrer">
          View PDF
        </a>
      `
      : "";

    return `
      <div class="resume-link-row">
        ${previewButton}
        <a class="button-primary career-inline-button career-inline-button-mini" href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noreferrer">
          Open
        </a>
        <a class="button-primary career-inline-button career-inline-button-mini resume-download-btn" href="${escapeHtml(item.fileUrl)}" download>
          Download
        </a>
      </div>
    `;
  }

  function buildResumePreview(item) {
    if (!item?.fileUrl || !isPdfResume(item)) return "";

    return `
      <div class="resume-preview-wrap">
        <iframe
          src="${escapeHtml(item.fileUrl)}"
          title="${escapeHtml(item.title || "Resume Preview")}"
          class="resume-preview-frame"
        ></iframe>
      </div>
    `;
  }

  function buildSavedCard(group, item) {
    const visibilityState = item.visible ? "Visible in Portfolio" : "Hidden from Portfolio";
    const stateClass = item.visible ? "selected" : "";

    const baseTop = `
      <div class="selector-state ${stateClass}">${visibilityState}</div>
    `;

    if (group === "projects") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Untitled Project")}</h3>
        <p><strong>Description:</strong> ${escapeHtml(item.description || "—")}</p>
        <p><strong>Stage:</strong> ${escapeHtml(item.stage || "—")}</p>
        <p><strong>Status:</strong> ${escapeHtml(item.completed || "—")}</p>
        <p><strong>Timeline:</strong> ${escapeHtml(item.timeline || "—")}</p>
        <p><strong>Members:</strong> ${escapeHtml(item.members || "—")}</p>
        <p><strong>Impact:</strong> ${escapeHtml(item.impact || "—")}</p>
        <p><strong>Parts / Tools:</strong> ${escapeHtml(item.parts || "—")}</p>
        <p><strong>Specs:</strong> ${escapeHtml(item.specifications || "—")}</p>
        <p><strong>Technical depth:</strong> ${escapeHtml(item.depth || "—")}</p>
        <p><strong>Issues:</strong> ${escapeHtml(item.issues || "—")}</p>
        <p><strong>Visuals:</strong> ${escapeHtml(item.visuals || "—")}</p>
        <p><strong>Diagrams:</strong> ${escapeHtml(item.diagrams || "—")}</p>
        ${
          item.link
            ? `<p><strong>Link:</strong> <a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${escapeHtml(item.link)}</a></p>`
            : ""
        }
      `;
    }

    if (group === "school") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "School Item")}</h3>
        <p><strong>Professor:</strong> ${escapeHtml(item.prof || "—")}</p>
        <p><strong>Helped with:</strong> ${escapeHtml(item.helped || "—")}</p>
        <p><strong>Relevance:</strong> ${escapeHtml(item.relevance || "—")}</p>
        <p><strong>Stage:</strong> ${escapeHtml(item.stage || "—")}</p>
        <p><strong>Notes:</strong> ${escapeHtml(item.notes || "—")}</p>
      `;
    }

    if (group === "experience") {
      const responsibilities = Array.isArray(item.responsibilities) && item.responsibilities.length
        ? `<ul class="list-clean">${item.responsibilities.map((r) => `<li>${escapeHtml(r)}</li>`).join("")}</ul>`
        : "<p><strong>Responsibilities:</strong> —</p>";

      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Experience")}</h3>
        <p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p>
        <p><strong>Manager / boss:</strong> ${escapeHtml(item.boss || "—")}</p>
        <p><strong>Impact:</strong> ${escapeHtml(item.impact || "—")}</p>
        <p><strong>Pictures / visuals:</strong> ${escapeHtml(item.pictures || "—")}</p>
        <div><strong>Responsibilities:</strong>${responsibilities}</div>
      `;
    }

    if (group === "about" || group === "looking" || group === "pitch") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Text Entry")}</h3>
        <p>${escapeHtml(item.body || "—")}</p>
      `;
    }

    if (group === "stats") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Stat")}</h3>
        <p><strong>Big stat:</strong> ${escapeHtml(item.impact || "—")}</p>
        <p>${escapeHtml(item.description || "—")}</p>
      `;
    }

    if (group === "contact") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Contact")}</h3>
        <p><strong>GitHub:</strong> ${escapeHtml(item.github || "—")}</p>
        <p><strong>Email:</strong> ${escapeHtml(item.email || "—")}</p>
        <p><strong>Phone:</strong> ${escapeHtml(item.phone || "—")}</p>
        <p><strong>Link:</strong> ${escapeHtml(item.link || "—")}</p>
      `;
    }

    if (group === "resume") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Resume")}</h3>
        <p><strong>File name:</strong> ${escapeHtml(item.fileName || "—")}</p>
        <p><strong>File type:</strong> ${escapeHtml(item.fileType || "—")}</p>
        <p><strong>File size:</strong> ${item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : "—"}</p>
        <p><strong>Note:</strong> ${escapeHtml(item.note || "—")}</p>
        ${buildResumeActions(item)}
        ${buildResumePreview(item)}
      `;
    }

    if (group === "timelineItems") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Timeline Item")}</h3>
        <p><strong>Date:</strong> ${escapeHtml(formatDate(item.date))}</p>
        <p>${escapeHtml(item.description || "—")}</p>
      `;
    }

    if (group === "recommendations") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "Recommendation")}</h3>
        <p><strong>Source:</strong> ${escapeHtml(item.owner || "—")}</p>
        <p>${escapeHtml(item.body || "—")}</p>
      `;
    }

    if (group === "star") {
      return `
        ${baseTop}
        <h3 class="card-title">${escapeHtml(item.title || "STAR Example")}</h3>
        <p><strong>Situation:</strong> ${escapeHtml(item.situation || "—")}</p>
        <p><strong>Task:</strong> ${escapeHtml(item.task || "—")}</p>
        <p><strong>Action:</strong> ${escapeHtml(item.action || "—")}</p>
        <p><strong>Result:</strong> ${escapeHtml(item.result || "—")}</p>
      `;
    }

    return `
      ${baseTop}
      <h3 class="card-title">${escapeHtml(item.title || "Entry")}</h3>
    `;
  }

  function renderGroup(wrapId, countId, group, items, emptyText) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    setCount(countId, items.length);
    wrap.innerHTML = "";

    if (!items.length) {
      wrap.innerHTML = emptyCard(emptyText);
      return;
    }

    items.forEach((item) => {
      const card = document.createElement("article");
      card.className = "assignment-card";
      card.innerHTML = `
        <div class="assignment-main">
          ${buildSavedCard(group, item)}
        </div>
        <div class="assignment-actions">
          <button class="button-secondary career-inline-button career-inline-button-mini toggle-visibility-btn" type="button">
            ${item.visible ? "Hide" : "Show"}
          </button>
          <button class="danger-btn career-inline-button career-inline-button-mini" type="button">Delete</button>
        </div>
      `;

      card.querySelector(".toggle-visibility-btn")?.addEventListener("click", async () => {
        await toggleVisible(group, item.id);
      });

      card.querySelector(".danger-btn")?.addEventListener("click", async () => {
        await deleteItem(group, item.id);
      });

      wrap.appendChild(card);
    });
  }

  function renderSavedEntries() {
    renderGroup("info-projects", "count-projects", "projects", data.projects, "No saved projects yet.");
    renderGroup("info-school", "count-school", "school", data.school, "No saved school items yet.");
    renderGroup("info-experience", "count-experience", "experience", data.experience, "No saved work experience yet.");
    renderGroup("info-about", "count-about", "about", data.about, "No saved about entries yet.");
    renderGroup("info-looking", "count-looking", "looking", data.looking, "No saved looking-for entries yet.");
    renderGroup("info-pitch", "count-pitch", "pitch", data.pitch, "No saved pitch entries yet.");
    renderGroup("info-stats", "count-stats", "stats", data.stats, "No saved stats yet.");
    renderGroup("info-contact", "count-contact", "contact", data.contact, "No saved contact info yet.");
    renderGroup("info-resume", "count-resume", "resume", data.resume, "No saved resume yet.");

    const timelineSorted = [...data.timelineItems].sort((a, b) => {
      const aDate = a.date || "9999-12-31";
      const bDate = b.date || "9999-12-31";
      return aDate.localeCompare(bDate);
    });

    renderGroup("info-timeline", "count-timeline", "timelineItems", timelineSorted, "No saved timeline items yet.");
    renderGroup("info-recommendations", "count-recommendations", "recommendations", data.recommendations, "No saved recommendations yet.");
    renderGroup("info-star", "count-star", "star", data.star, "No saved STAR moments yet.");
  }

  document.getElementById("dynamic-section-select")?.addEventListener("change", () => {
    renderDynamicForm();
  });

  document.getElementById("clear-all-btn")?.addEventListener("click", async () => {
    data = cloneDefaults();
    renderDynamicForm();
    renderSavedEntries();
    await saveState();
  });

  async function init() {
    setSaveStatus("Loading...", "neutral");

    renderDynamicForm();
    renderSavedEntries();

    const saved = await loadState();
    data = normalizeData(saved);

    hasLoadedInitialState = true;

    renderDynamicForm();
    renderSavedEntries();
    setSaveStatus("Ready", "success");
  }

  init();

}
