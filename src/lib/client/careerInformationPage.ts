// @ts-nocheck
import type { CareerSectionMeta } from "../../config/pages/careerShared";

interface CareerInformationClientConfig {
  pageKey: string;
  defaults: Record<string, any>;
  sections?: CareerSectionMeta[];
}

export function initCareerInformationPage(config: CareerInformationClientConfig) {
  const pageKey = config.pageKey || "career-information";
  const sections = Array.isArray(config.sections) ? config.sections : [];

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

  function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeBoolean(value, fallback = true) {
    return typeof value === "boolean" ? value : fallback;
  }

  function ensureSingletonArray(item, prefix, fallback = {}) {
    if (!item || typeof item !== "object") {
      return [{ id: makeId(prefix), ...fallback, visible: true }];
    }
    return [item];
  }

  function splitLines(value) {
    return String(value || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "page";
  }

  function defaultMenuItems() {
    return normalizeArray(config.defaults?.portfolioMenuItems).length
      ? normalizeArray(config.defaults.portfolioMenuItems).map((item) => ({ ...item }))
      : [{ id: "main", label: "Home", slug: "home" }];
  }

  function defaultLayout() {
    return normalizeArray(config.defaults?.portfolioSectionLayout).map((item, index) => ({
      id: item?.id || makeId(`layout-${item?.key || index}`),
      key: item?.key || "",
      title: item?.title || item?.key || `Section ${index + 1}`,
      pageId: item?.pageId || "main",
      enabled: normalizeBoolean(item?.enabled, true),
      collapsed: normalizeBoolean(item?.collapsed, false),
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    }));
  }

  function normalizeData(raw) {
    const parsed = raw && typeof raw === "object" ? raw : {};
    const defaults = cloneDefaults();

    const normalized = {
      ...defaults,
      profile: normalizeArray(parsed.profile).slice(0, 1).map((item) => ({
        id: item?.id || makeId("profile"),
        fullName: item?.fullName || "",
        headline: item?.headline || "",
        description: item?.description || "",
        photoUrl: item?.photoUrl || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      externalLinks: normalizeArray(parsed.externalLinks).map((item) => ({
        id: item?.id || makeId("link"),
        type: item?.type || "website",
        label: item?.label || "",
        url: item?.url || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      experience: normalizeArray(parsed.experience).map((item) => ({
        id: item?.id || makeId("experience"),
        role: item?.role || item?.title || "",
        company: item?.company || item?.boss || "",
        location: item?.location || "",
        startDate: item?.startDate || "",
        endDate: item?.endDate || item?.date || "",
        summary: item?.summary || item?.impact || "",
        bullets: Array.isArray(item?.bullets)
          ? item.bullets.filter(Boolean)
          : Array.isArray(item?.responsibilities)
          ? item.responsibilities.filter(Boolean)
          : splitLines(item?.responsibilities),
        visible: normalizeBoolean(item?.visible, true),
      })),
      leadership: normalizeArray(parsed.leadership).map((item) => ({
        id: item?.id || makeId("leadership"),
        title: item?.title || "",
        organization: item?.organization || "",
        date: item?.date || "",
        summary: item?.summary || "",
        bullets: Array.isArray(item?.bullets) ? item.bullets.filter(Boolean) : splitLines(item?.bullets),
        visible: normalizeBoolean(item?.visible, true),
      })),
      projects: normalizeArray(parsed.projects).map((item) => ({
        id: item?.id || makeId("project"),
        title: item?.title || "",
        subtitle: item?.subtitle || item?.stage || "",
        description: item?.description || "",
        skills: item?.skills || item?.parts || "",
        link: item?.link || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      organizations: normalizeArray(parsed.organizations).map((item) => ({
        id: item?.id || makeId("organization"),
        name: item?.name || item?.title || "",
        role: item?.role || "",
        date: item?.date || "",
        description: item?.description || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      honors: normalizeArray(parsed.honors || parsed.stats).map((item) => ({
        id: item?.id || makeId("honor"),
        title: item?.title || "",
        value: item?.value || item?.impact || "",
        issuer: item?.issuer || "",
        date: item?.date || "",
        description: item?.description || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      licenses: normalizeArray(parsed.licenses).map((item) => ({
        id: item?.id || makeId("license"),
        title: item?.title || "",
        issuer: item?.issuer || "",
        date: item?.date || "",
        credentialId: item?.credentialId || "",
        link: item?.link || "",
        visible: normalizeBoolean(item?.visible, true),
      })),
      contact: normalizeArray(parsed.contact).slice(0, 1).map((item) => ({
        id: item?.id || makeId("contact"),
        preferredMethod: item?.preferredMethod || item?.title || "email",
        value: item?.value || item?.email || item?.link || item?.phone || "",
        label: item?.label || "",
        note: item?.note || "",
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
      timelineItems: normalizeArray(parsed.timelineItems || parsed.timeline).map((item) => ({
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
      portfolioMenuItems: normalizeArray(parsed.portfolioMenuItems).length
        ? normalizeArray(parsed.portfolioMenuItems).map((item, index) => ({
            id: item?.id || makeId(`menu-${index}`),
            label: item?.label || `Page ${index + 1}`,
            slug: slugify(item?.slug || item?.label || `page-${index + 1}`),
          }))
        : defaultMenuItems(),
      portfolioSectionLayout: normalizeArray(parsed.portfolioSectionLayout).length
        ? normalizeArray(parsed.portfolioSectionLayout).map((item, index) => ({
            id: item?.id || makeId(`layout-${item?.key || index}`),
            key: item?.key || "",
            title: item?.title || item?.key || `Section ${index + 1}`,
            pageId: item?.pageId || "main",
            enabled: normalizeBoolean(item?.enabled, true),
            collapsed: normalizeBoolean(item?.collapsed, false),
            order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
          }))
        : defaultLayout(),
    };

    const menuIds = new Set(normalized.portfolioMenuItems.map((item) => item.id));
    normalized.portfolioSectionLayout = normalized.portfolioSectionLayout.map((item, index) => ({
      ...item,
      pageId: menuIds.has(item.pageId) ? item.pageId : normalized.portfolioMenuItems[0]?.id || "main",
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    }));

    return normalized;
  }

  function getSavableState(source) {
    return JSON.parse(JSON.stringify(source));
  }

  function getValue(id) {
    const el = document.getElementById(id);
    return el ? String(el.value || "").trim() : "";
  }

  function getChecked(id) {
    const el = document.getElementById(id);
    return !!el?.checked;
  }

  function isPdfResume(item) {
    return String(item?.fileType || "").toLowerCase().includes("pdf") ||
      String(item?.fileName || "").toLowerCase().endsWith(".pdf");
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
      if (!res.ok) return null;
      const payload = await res.json();
      return payload?.state ?? null;
    } catch (error) {
      console.error("Failed to load state:", error);
      return null;
    }
  }

  async function postState(snapshot) {
    const res = await fetch("/api/state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey, state: snapshot }),
    });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
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
    if (!res.ok) throw new Error(payload?.error || `Upload failed (${res.status})`);
    return payload;
  }

  let data = normalizeData(cloneDefaults());
  let hasLoadedInitialState = false;
  let isSaving = false;
  let pendingSave = false;

  async function saveState() {
    if (!hasLoadedInitialState) return;

    if (isSaving) {
      pendingSave = true;
      setSaveStatus("Queued save...", "neutral");
      return;
    }

    isSaving = true;
    setSaveStatus("Saving...", "neutral");

    try {
      await postState(getSavableState(data));
      setSaveStatus("Saved", "success");
    } catch (error) {
      console.error("Failed to save state:", error);
      setSaveStatus(error?.message || "Save failed", "error");
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

  function emptyCard(text) {
    return `
      <article class="card portfolio-empty-card">
        <p class="empty-state">${escapeHtml(text)}</p>
      </article>
    `;
  }

  function formShell(helper, body, buttonId, buttonText) {
    return `
      <div class="dynamic-form-card">
        ${helper ? `<p class="section-helper">${escapeHtml(helper)}</p>` : ""}
        ${body}
        ${buttonId ? `<button class="button-primary career-inline-button" id="${buttonId}" type="button">${escapeHtml(buttonText)}</button>` : ""}
      </div>
    `;
  }

  function buildProfileForm() {
    const item = data.profile?.[0] || {};
    return formShell(
      "Shown at the top of the portfolio preview. If photo URL is blank, the app avatar can be used later.",
      `
        <div class="dynamic-form-grid one">
          <label class="edu-label"><span>Full name</span><input id="dynamic-profile-fullName" class="form-input" value="${escapeHtml(item.fullName || "")}" placeholder="Your public name" /></label>
          <label class="edu-label"><span>Headline</span><input id="dynamic-profile-headline" class="form-input" value="${escapeHtml(item.headline || "")}" placeholder="Product Designer · CS Student · Software Engineer" /></label>
          <label class="edu-label"><span>Photo URL (optional)</span><input id="dynamic-profile-photoUrl" class="form-input" value="${escapeHtml(item.photoUrl || "")}" placeholder="https://..." /></label>
          <label class="edu-label"><span>Description</span><textarea id="dynamic-profile-description" class="form-textarea" placeholder="Short intro for your portfolio">${escapeHtml(item.description || "")}</textarea></label>
          <label class="check-row"><input id="dynamic-profile-visible" type="checkbox" ${item.visible !== false ? "checked" : ""} /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-profile-btn",
      "Save Profile Basics"
    );
  }

  function buildExternalLinksForm() {
    return formShell(
      "Add public links that will appear under your profile section.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Link type</span><select id="dynamic-link-type" class="form-input"><option value="github">GitHub</option><option value="linkedin">LinkedIn</option><option value="email">Email</option><option value="website">Website</option><option value="facebook">Facebook</option><option value="instagram">Instagram</option><option value="other">Other</option></select></label>
          <label class="edu-label"><span>Label (optional)</span><input id="dynamic-link-label" class="form-input" placeholder="Portfolio, personal site, etc." /></label>
          <label class="edu-label dynamic-form-full"><span>URL or email</span><input id="dynamic-link-url" class="form-input" placeholder="https://... or hello@example.com" /></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-link-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-link-btn",
      "Add External Link"
    );
  }

  function buildExperienceForm() {
    return formShell(
      "Use this for work experience cards.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Role</span><input id="dynamic-exp-role" class="form-input" placeholder="Software Engineer Intern" /></label>
          <label class="edu-label"><span>Company</span><input id="dynamic-exp-company" class="form-input" placeholder="Company name" /></label>
          <label class="edu-label"><span>Location</span><input id="dynamic-exp-location" class="form-input" placeholder="City, State or Remote" /></label>
          <label class="edu-label"><span>Start date</span><input id="dynamic-exp-startDate" type="date" class="form-input" /></label>
          <label class="edu-label"><span>End date</span><input id="dynamic-exp-endDate" type="date" class="form-input" /></label>
          <label class="edu-label dynamic-form-full"><span>Summary</span><textarea id="dynamic-exp-summary" class="form-textarea" placeholder="What you did and why it mattered"></textarea></label>
          <label class="edu-label dynamic-form-full"><span>Bullets (one per line)</span><textarea id="dynamic-exp-bullets" class="form-textarea" placeholder="Led...&#10;Built...&#10;Improved..."></textarea></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-exp-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-exp-btn",
      "Save Work Experience"
    );
  }

  function buildLeadershipForm() {
    return formShell(
      "Use this for leadership roles, mentoring, or team leadership experience.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Title</span><input id="dynamic-leadership-title" class="form-input" placeholder="President, Team Lead, Mentor" /></label>
          <label class="edu-label"><span>Organization</span><input id="dynamic-leadership-organization" class="form-input" placeholder="Club, company, volunteer group" /></label>
          <label class="edu-label"><span>Date or range</span><input id="dynamic-leadership-date" class="form-input" placeholder="2024 - Present" /></label>
          <label class="edu-label dynamic-form-full"><span>Summary</span><textarea id="dynamic-leadership-summary" class="form-textarea" placeholder="Scope of leadership and outcomes"></textarea></label>
          <label class="edu-label dynamic-form-full"><span>Bullets (one per line)</span><textarea id="dynamic-leadership-bullets" class="form-textarea" placeholder="Managed...&#10;Organized...&#10;Mentored..."></textarea></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-leadership-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-leadership-btn",
      "Save Leadership Experience"
    );
  }

  function buildProjectsForm() {
    return formShell(
      "Use this for featured portfolio projects.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Project title</span><input id="dynamic-project-title" class="form-input" placeholder="Project name" /></label>
          <label class="edu-label"><span>Subtitle / stage</span><input id="dynamic-project-subtitle" class="form-input" placeholder="Capstone · Shipped · Ongoing" /></label>
          <label class="edu-label dynamic-form-full"><span>Description</span><textarea id="dynamic-project-description" class="form-textarea" placeholder="What the project is and what it achieved"></textarea></label>
          <label class="edu-label"><span>Skills / stack</span><input id="dynamic-project-skills" class="form-input" placeholder="Astro, React, Figma, Python" /></label>
          <label class="edu-label"><span>Link</span><input id="dynamic-project-link" class="form-input" placeholder="https://..." /></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-project-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-project-btn",
      "Save Project"
    );
  }

  function buildOrganizationsForm() {
    return formShell(
      "Use this for clubs, associations, volunteer orgs, and communities.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Organization</span><input id="dynamic-organization-name" class="form-input" placeholder="Organization name" /></label>
          <label class="edu-label"><span>Role</span><input id="dynamic-organization-role" class="form-input" placeholder="Member, Volunteer, Board" /></label>
          <label class="edu-label"><span>Date or range</span><input id="dynamic-organization-date" class="form-input" placeholder="2023 - Present" /></label>
          <label class="edu-label dynamic-form-full"><span>Description</span><textarea id="dynamic-organization-description" class="form-textarea" placeholder="How you're involved"></textarea></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-organization-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-organization-btn",
      "Save Organization"
    );
  }

  function buildHonorsForm() {
    return formShell(
      "Use this for honors, awards, or stat-style highlights.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Title</span><input id="dynamic-honor-title" class="form-input" placeholder="Dean's List, Scholarship, Competition Win" /></label>
          <label class="edu-label"><span>Value / stat</span><input id="dynamic-honor-value" class="form-input" placeholder="#1, 3.9 GPA, Top 10%, $5k award" /></label>
          <label class="edu-label"><span>Issuer</span><input id="dynamic-honor-issuer" class="form-input" placeholder="University, company, organization" /></label>
          <label class="edu-label"><span>Date</span><input id="dynamic-honor-date" class="form-input" placeholder="May 2025" /></label>
          <label class="edu-label dynamic-form-full"><span>Description</span><textarea id="dynamic-honor-description" class="form-textarea" placeholder="Optional extra context"></textarea></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-honor-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-honor-btn",
      "Save Honor or Award"
    );
  }

  function buildLicensesForm() {
    return formShell(
      "Use this for certifications, licenses, and credential badges.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Title</span><input id="dynamic-license-title" class="form-input" placeholder="AWS Certified Cloud Practitioner" /></label>
          <label class="edu-label"><span>Issuer</span><input id="dynamic-license-issuer" class="form-input" placeholder="Issuer" /></label>
          <label class="edu-label"><span>Date</span><input id="dynamic-license-date" class="form-input" placeholder="Apr 2025" /></label>
          <label class="edu-label"><span>Credential ID</span><input id="dynamic-license-credentialId" class="form-input" placeholder="Optional credential ID" /></label>
          <label class="edu-label dynamic-form-full"><span>Credential link</span><input id="dynamic-license-link" class="form-input" placeholder="https://..." /></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-license-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-license-btn",
      "Save License or Certificate"
    );
  }

  function buildContactForm() {
    const item = data.contact?.[0] || {};
    return formShell(
      "This powers the final contact call-to-action section.",
      `
        <div class="dynamic-form-grid one">
          <label class="edu-label"><span>Preferred method</span><select id="dynamic-contact-method" class="form-input"><option value="email" ${item.preferredMethod === "email" ? "selected" : ""}>Email</option><option value="linkedin" ${item.preferredMethod === "linkedin" ? "selected" : ""}>LinkedIn</option><option value="github" ${item.preferredMethod === "github" ? "selected" : ""}>GitHub</option><option value="phone" ${item.preferredMethod === "phone" ? "selected" : ""}>Phone</option><option value="website" ${item.preferredMethod === "website" ? "selected" : ""}>Website</option><option value="other" ${item.preferredMethod === "other" ? "selected" : ""}>Other</option></select></label>
          <label class="edu-label"><span>Value</span><input id="dynamic-contact-value" class="form-input" value="${escapeHtml(item.value || "")}" placeholder="hello@example.com or https://linkedin.com/in/..." /></label>
          <label class="edu-label"><span>Label (optional)</span><input id="dynamic-contact-label" class="form-input" value="${escapeHtml(item.label || "")}" placeholder="Let's connect, Best for recruiting, etc." /></label>
          <label class="edu-label"><span>Note</span><textarea id="dynamic-contact-note" class="form-textarea" placeholder="Optional note about response preference">${escapeHtml(item.note || "")}</textarea></label>
          <label class="check-row"><input id="dynamic-contact-visible" type="checkbox" ${item.visible !== false ? "checked" : ""} /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-contact-btn",
      "Save Preferred Contact"
    );
  }

  function buildResumeForm() {
    const item = data.resume?.[0] || {};
    return formShell(
      "Upload a resume and optionally choose whether to show it publicly.",
      `
        <div class="dynamic-form-grid one">
          <label class="edu-label"><span>Resume title</span><input id="dynamic-resume-title" class="form-input" value="${escapeHtml(item.title || "Resume")}" placeholder="Current Resume" /></label>
          <label class="edu-label"><span>Resume file</span><input id="dynamic-resume-file" class="form-input" type="file" accept=".pdf,.doc,.docx,.rtf,.txt,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/rtf,application/vnd.oasis.opendocument.text" /></label>
          <label class="edu-label"><span>Notes</span><textarea id="dynamic-resume-note" class="form-textarea" placeholder="Optional note about this version">${escapeHtml(item.note || "")}</textarea></label>
          <label class="check-row"><input id="dynamic-resume-visible" type="checkbox" ${item.visible !== false ? "checked" : ""} /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-resume-btn",
      "Upload + Save Resume"
    );
  }

  function buildSchoolForm() {
    return formShell(
      "Legacy section kept for compatibility with existing saved content.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Title</span><input id="dynamic-school-title" class="form-input" placeholder="Class, lab, or academic initiative" /></label>
          <label class="edu-label"><span>Professor / lead</span><input id="dynamic-school-prof" class="form-input" placeholder="Professor or lead" /></label>
          <label class="edu-label"><span>Stage</span><input id="dynamic-school-stage" class="form-input" placeholder="Completed, ongoing, etc." /></label>
          <label class="edu-label dynamic-form-full"><span>Helped with</span><textarea id="dynamic-school-helped" class="form-textarea" placeholder="What you contributed"></textarea></label>
          <label class="edu-label dynamic-form-full"><span>Relevance</span><textarea id="dynamic-school-relevance" class="form-textarea" placeholder="Why this matters"></textarea></label>
          <label class="edu-label dynamic-form-full"><span>Notes</span><textarea id="dynamic-school-notes" class="form-textarea" placeholder="Extra context"></textarea></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-school-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-school-btn",
      "Save School Development"
    );
  }

  function buildSimpleTextForm(prefix, defaults) {
    return formShell(
      defaults.helper,
      `
        <div class="dynamic-form-grid one">
          <label class="edu-label"><span>Title</span><input id="dynamic-${prefix}-title" class="form-input" placeholder="${escapeHtml(defaults.titlePlaceholder)}" /></label>
          <label class="edu-label"><span>Body</span><textarea id="dynamic-${prefix}-body" class="form-textarea" placeholder="${escapeHtml(defaults.bodyPlaceholder)}"></textarea></label>
          <label class="check-row"><input id="dynamic-${prefix}-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      `dynamic-save-${prefix}-btn`,
      defaults.buttonText
    );
  }

  function buildTimelineForm() {
    return formShell(
      "Legacy section kept for compatibility with existing saved content.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Milestone title</span><input id="dynamic-timeline-title" class="form-input" placeholder="Started new role" /></label>
          <label class="edu-label"><span>Date</span><input id="dynamic-timeline-date" type="date" class="form-input" /></label>
          <label class="edu-label dynamic-form-full"><span>Description</span><textarea id="dynamic-timeline-description" class="form-textarea" placeholder="What happened"></textarea></label>
          <label class="check-row dynamic-form-full"><input id="dynamic-timeline-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-timeline-btn",
      "Save Timeline Item"
    );
  }

  function buildRecommendationsForm() {
    return formShell(
      "Legacy section kept for compatibility with existing saved content.",
      `
        <div class="dynamic-form-grid one">
          <label class="edu-label"><span>Name / source</span><input id="dynamic-rec-title" class="form-input" placeholder="Manager, professor, teammate" /></label>
          <label class="edu-label"><span>Recommendation</span><textarea id="dynamic-rec-body" class="form-textarea" placeholder="Recommendation text"></textarea></label>
          <label class="edu-label"><span>Role / context</span><input id="dynamic-rec-owner" class="form-input" placeholder="Manager, professor, mentor" /></label>
          <label class="check-row"><input id="dynamic-rec-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-rec-btn",
      "Save Recommendation"
    );
  }

  function buildStarForm() {
    return formShell(
      "Legacy section kept for compatibility with existing saved content.",
      `
        <div class="dynamic-form-grid one">
          <label class="edu-label"><span>STAR title</span><input id="dynamic-star-title" class="form-input" placeholder="Resolving a production issue" /></label>
          <label class="edu-label"><span>Situation</span><textarea id="dynamic-star-situation" class="form-textarea"></textarea></label>
          <label class="edu-label"><span>Task</span><textarea id="dynamic-star-task" class="form-textarea"></textarea></label>
          <label class="edu-label"><span>Action</span><textarea id="dynamic-star-action" class="form-textarea"></textarea></label>
          <label class="edu-label"><span>Result</span><textarea id="dynamic-star-result" class="form-textarea"></textarea></label>
          <label class="check-row"><input id="dynamic-star-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
      `,
      "dynamic-save-star-btn",
      "Save STAR Example"
    );
  }

  function renderDynamicForm() {
    const select = document.getElementById("dynamic-section-select");
    const area = document.getElementById("dynamic-form-area");
    if (!select || !area) return;

    const map = {
      profile: buildProfileForm,
      externalLinks: buildExternalLinksForm,
      experience: buildExperienceForm,
      leadership: buildLeadershipForm,
      projects: buildProjectsForm,
      organizations: buildOrganizationsForm,
      honors: buildHonorsForm,
      licenses: buildLicensesForm,
      contact: buildContactForm,
      resume: buildResumeForm,
      school: buildSchoolForm,
      about: () => buildSimpleTextForm("about", {
        helper: "Legacy section kept for compatibility with existing saved content.",
        titlePlaceholder: "About Me",
        bodyPlaceholder: "Tell your story",
        buttonText: "Save About Section",
      }),
      looking: () => buildSimpleTextForm("looking", {
        helper: "Legacy section kept for compatibility with existing saved content.",
        titlePlaceholder: "What I'm Looking For",
        bodyPlaceholder: "What kinds of opportunities are you seeking?",
        buttonText: "Save Looking For Section",
      }),
      pitch: () => buildSimpleTextForm("pitch", {
        helper: "Legacy section kept for compatibility with existing saved content.",
        titlePlaceholder: "Pitch",
        bodyPlaceholder: "Short pitch",
        buttonText: "Save Pitch",
      }),
      timelineItems: buildTimelineForm,
      recommendations: buildRecommendationsForm,
      star: buildStarForm,
    };

    area.innerHTML = map[select.value] ? map[select.value]() : "";
    bindDynamicFormActions();
  }

  function bindDynamicFormActions() {
    document.getElementById("dynamic-save-profile-btn")?.addEventListener("click", async () => {
      data.profile = [{
        id: data.profile?.[0]?.id || makeId("profile"),
        fullName: getValue("dynamic-profile-fullName"),
        headline: getValue("dynamic-profile-headline"),
        description: getValue("dynamic-profile-description"),
        photoUrl: getValue("dynamic-profile-photoUrl"),
        visible: getChecked("dynamic-profile-visible"),
      }];
      await persistAndRefresh();
    });

    document.getElementById("dynamic-save-link-btn")?.addEventListener("click", async () => {
      const url = getValue("dynamic-link-url");
      if (!url) return;
      data.externalLinks.unshift({
        id: makeId("link"),
        type: getValue("dynamic-link-type") || "website",
        label: getValue("dynamic-link-label"),
        url,
        visible: getChecked("dynamic-link-visible"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-exp-btn")?.addEventListener("click", async () => {
      const role = getValue("dynamic-exp-role");
      if (!role) return;
      data.experience.unshift({
        id: makeId("experience"),
        role,
        company: getValue("dynamic-exp-company"),
        location: getValue("dynamic-exp-location"),
        startDate: getValue("dynamic-exp-startDate"),
        endDate: getValue("dynamic-exp-endDate"),
        summary: getValue("dynamic-exp-summary"),
        bullets: splitLines(getValue("dynamic-exp-bullets")),
        visible: getChecked("dynamic-exp-visible"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-leadership-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-leadership-title");
      if (!title) return;
      data.leadership.unshift({
        id: makeId("leadership"),
        title,
        organization: getValue("dynamic-leadership-organization"),
        date: getValue("dynamic-leadership-date"),
        summary: getValue("dynamic-leadership-summary"),
        bullets: splitLines(getValue("dynamic-leadership-bullets")),
        visible: getChecked("dynamic-leadership-visible"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-project-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-project-title");
      if (!title) return;
      data.projects.unshift({
        id: makeId("project"),
        title,
        subtitle: getValue("dynamic-project-subtitle"),
        description: getValue("dynamic-project-description"),
        skills: getValue("dynamic-project-skills"),
        link: getValue("dynamic-project-link"),
        visible: getChecked("dynamic-project-visible"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-organization-btn")?.addEventListener("click", async () => {
      const name = getValue("dynamic-organization-name");
      if (!name) return;
      data.organizations.unshift({
        id: makeId("organization"),
        name,
        role: getValue("dynamic-organization-role"),
        date: getValue("dynamic-organization-date"),
        description: getValue("dynamic-organization-description"),
        visible: getChecked("dynamic-organization-visible"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-honor-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-honor-title");
      if (!title) return;
      data.honors.unshift({
        id: makeId("honor"),
        title,
        value: getValue("dynamic-honor-value"),
        issuer: getValue("dynamic-honor-issuer"),
        date: getValue("dynamic-honor-date"),
        description: getValue("dynamic-honor-description"),
        visible: getChecked("dynamic-honor-visible"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-license-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-license-title");
      if (!title) return;
      data.licenses.unshift({
        id: makeId("license"),
        title,
        issuer: getValue("dynamic-license-issuer"),
        date: getValue("dynamic-license-date"),
        credentialId: getValue("dynamic-license-credentialId"),
        link: getValue("dynamic-license-link"),
        visible: getChecked("dynamic-license-visible"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-contact-btn")?.addEventListener("click", async () => {
      const value = getValue("dynamic-contact-value");
      if (!value) return;
      data.contact = [{
        id: data.contact?.[0]?.id || makeId("contact"),
        preferredMethod: getValue("dynamic-contact-method") || "email",
        value,
        label: getValue("dynamic-contact-label"),
        note: getValue("dynamic-contact-note"),
        visible: getChecked("dynamic-contact-visible"),
      }];
      await persistAndRefresh();
    });

    document.getElementById("dynamic-save-resume-btn")?.addEventListener("click", async () => {
      const fileInput = document.getElementById("dynamic-resume-file");
      const file = fileInput?.files?.[0];
      const title = getValue("dynamic-resume-title") || "Resume";
      const note = getValue("dynamic-resume-note");
      const visible = getChecked("dynamic-resume-visible");
      try {
        setSaveStatus(file ? "Uploading resume..." : "Saving...", "neutral");
        let nextResume = data.resume?.[0] || { id: makeId("resume"), title: "Resume", fileName: "", fileType: "", fileSize: 0, fileUrl: "", note: "", visible: true };
        if (file) {
          const uploaded = await uploadResumeFile(file);
          nextResume = {
            ...nextResume,
            title,
            fileName: uploaded.fileName || file.name,
            fileType: uploaded.fileType || file.type || "",
            fileSize: Number(uploaded.fileSize || file.size || 0),
            fileUrl: uploaded.fileUrl || "",
            note,
            visible,
          };
        } else {
          nextResume = { ...nextResume, title, note, visible };
        }
        data.resume = [nextResume];
        await persistAndRefresh();
        renderDynamicForm();
      } catch (error) {
        console.error("Resume upload failed:", error);
        setSaveStatus(error?.message || "Resume upload failed", "error");
      }
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

    ["about", "looking", "pitch"].forEach((key) => {
      document.getElementById(`dynamic-save-${key}-btn`)?.addEventListener("click", async () => {
        const body = getValue(`dynamic-${key}-body`);
        if (!body) return;
        data[key].unshift({
          id: makeId(key),
          title: getValue(`dynamic-${key}-title`) || key,
          body,
          visible: getChecked(`dynamic-${key}-visible`),
        });
        await persistAndRefresh();
        renderDynamicForm();
      });
    });

    document.getElementById("dynamic-save-timeline-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-timeline-title");
      if (!title) return;
      data.timelineItems.unshift({
        id: makeId("timeline"),
        title,
        date: getValue("dynamic-timeline-date"),
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

  function buildVisibilityBadge(item) {
    return `<div class="selector-state ${item.visible !== false ? "selected" : ""}">${item.visible !== false ? "Visible in Portfolio" : "Hidden from Portfolio"}</div>`;
  }

  function buildBullets(items) {
    return Array.isArray(items) && items.length
      ? `<ul class="list-clean">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>—</p>";
  }

  function buildResumeActions(item) {
    if (!item?.fileUrl) return `<p><strong>File:</strong> Not uploaded yet</p>`;
    return `
      <div class="resume-link-row">
        ${isPdfResume(item) ? `<a class="button-secondary career-inline-button career-inline-button-mini" href="${escapeHtml(item.fileUrl)}#toolbar=1" target="_blank" rel="noreferrer">View PDF</a>` : ""}
        <a class="button-primary career-inline-button career-inline-button-mini" href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noreferrer">Open</a>
        <a class="button-primary career-inline-button career-inline-button-mini resume-download-btn" href="${escapeHtml(item.fileUrl)}" download>Download</a>
      </div>
    `;
  }

  function buildResumePreview(item) {
    if (!item?.fileUrl || !isPdfResume(item)) return "";
    return `
      <div class="resume-preview-wrap">
        <iframe src="${escapeHtml(item.fileUrl)}" title="${escapeHtml(item.title || "Resume Preview")}" class="resume-preview-frame"></iframe>
      </div>
    `;
  }

  function buildSavedCard(group, item) {
    const top = buildVisibilityBadge(item);
    if (group === "profile") {
      return `${top}<h3 class="card-title">${escapeHtml(item.fullName || "Profile basics")}</h3><p><strong>Headline:</strong> ${escapeHtml(item.headline || "—")}</p><p>${escapeHtml(item.description || "—")}</p><p><strong>Photo URL:</strong> ${escapeHtml(item.photoUrl || "Using profile/avatar later")}</p>`;
    }
    if (group === "externalLinks") {
      return `${top}<h3 class="card-title">${escapeHtml(item.label || item.type || "Link")}</h3><p><strong>Type:</strong> ${escapeHtml(item.type || "—")}</p><p><strong>URL / value:</strong> ${escapeHtml(item.url || "—")}</p>`;
    }
    if (group === "experience") {
      return `${top}<h3 class="card-title">${escapeHtml(item.role || "Experience")}</h3><p><strong>Company:</strong> ${escapeHtml(item.company || "—")}</p><p><strong>Location:</strong> ${escapeHtml(item.location || "—")}</p><p><strong>Dates:</strong> ${escapeHtml(item.startDate || "—")}${item.endDate ? ` → ${escapeHtml(item.endDate)}` : ""}</p><p>${escapeHtml(item.summary || "—")}</p><div><strong>Bullets:</strong>${buildBullets(item.bullets)}</div>`;
    }
    if (group === "leadership") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Leadership")}</h3><p><strong>Organization:</strong> ${escapeHtml(item.organization || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p>${escapeHtml(item.summary || "—")}</p><div><strong>Bullets:</strong>${buildBullets(item.bullets)}</div>`;
    }
    if (group === "projects") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Project")}</h3><p><strong>Subtitle:</strong> ${escapeHtml(item.subtitle || "—")}</p><p>${escapeHtml(item.description || "—")}</p><p><strong>Skills:</strong> ${escapeHtml(item.skills || "—")}</p>${item.link ? `<p><strong>Link:</strong> <a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${escapeHtml(item.link)}</a></p>` : ""}`;
    }
    if (group === "organizations") {
      return `${top}<h3 class="card-title">${escapeHtml(item.name || "Organization")}</h3><p><strong>Role:</strong> ${escapeHtml(item.role || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p>${escapeHtml(item.description || "—")}</p>`;
    }
    if (group === "honors") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Honor")}</h3><p><strong>Value:</strong> ${escapeHtml(item.value || "—")}</p><p><strong>Issuer:</strong> ${escapeHtml(item.issuer || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p>${escapeHtml(item.description || "—")}</p>`;
    }
    if (group === "licenses") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "License")}</h3><p><strong>Issuer:</strong> ${escapeHtml(item.issuer || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p><strong>Credential ID:</strong> ${escapeHtml(item.credentialId || "—")}</p>${item.link ? `<p><strong>Link:</strong> <a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${escapeHtml(item.link)}</a></p>` : ""}`;
    }
    if (group === "contact") {
      return `${top}<h3 class="card-title">${escapeHtml(item.label || "Preferred contact")}</h3><p><strong>Method:</strong> ${escapeHtml(item.preferredMethod || "—")}</p><p><strong>Value:</strong> ${escapeHtml(item.value || "—")}</p><p>${escapeHtml(item.note || "—")}</p>`;
    }
    if (group === "resume") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Resume")}</h3><p><strong>File name:</strong> ${escapeHtml(item.fileName || "—")}</p><p><strong>File type:</strong> ${escapeHtml(item.fileType || "—")}</p><p><strong>File size:</strong> ${item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : "—"}</p><p><strong>Note:</strong> ${escapeHtml(item.note || "—")}</p>${buildResumeActions(item)}${buildResumePreview(item)}`;
    }
    if (group === "school") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "School Development")}</h3><p><strong>Professor:</strong> ${escapeHtml(item.prof || "—")}</p><p><strong>Helped with:</strong> ${escapeHtml(item.helped || "—")}</p><p><strong>Relevance:</strong> ${escapeHtml(item.relevance || "—")}</p><p><strong>Stage:</strong> ${escapeHtml(item.stage || "—")}</p><p><strong>Notes:</strong> ${escapeHtml(item.notes || "—")}</p>`;
    }
    if (group === "about" || group === "looking" || group === "pitch") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || group)}</h3><p>${escapeHtml(item.body || "—")}</p>`;
    }
    if (group === "timelineItems") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Timeline item")}</h3><p><strong>Date:</strong> ${escapeHtml(formatDate(item.date))}</p><p>${escapeHtml(item.description || "—")}</p>`;
    }
    if (group === "recommendations") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Recommendation")}</h3><p><strong>Source:</strong> ${escapeHtml(item.owner || "—")}</p><p>${escapeHtml(item.body || "—")}</p>`;
    }
    if (group === "star") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "STAR Example")}</h3><p><strong>Situation:</strong> ${escapeHtml(item.situation || "—")}</p><p><strong>Task:</strong> ${escapeHtml(item.task || "—")}</p><p><strong>Action:</strong> ${escapeHtml(item.action || "—")}</p><p><strong>Result:</strong> ${escapeHtml(item.result || "—")}</p>`;
    }
    return `${top}<h3 class="card-title">${escapeHtml(item.title || "Entry")}</h3>`;
  }

  async function toggleVisible(group, id) {
    data[group] = normalizeArray(data[group]).map((item) => item.id === id ? { ...item, visible: !normalizeBoolean(item.visible, true) } : item);
    await persistAndRefresh();
  }

  async function deleteItem(group, id) {
    data[group] = normalizeArray(data[group]).filter((item) => item.id !== id);
    await persistAndRefresh();
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
        <div class="assignment-main">${buildSavedCard(group, item)}</div>
        <div class="assignment-actions">
          <button class="button-secondary career-inline-button career-inline-button-mini toggle-visibility-btn" type="button">${item.visible !== false ? "Hide" : "Show"}</button>
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
    sections.forEach((section) => {
      const items = normalizeArray(data[section.key]);
      const sorted = section.key === "timelineItems"
        ? [...items].sort((a, b) => String(a.date || "9999-12-31").localeCompare(String(b.date || "9999-12-31")))
        : items;
      renderGroup(section.containerId, section.countId, section.key, sorted, section.emptyText);
    });
  }

  document.getElementById("dynamic-section-select")?.addEventListener("change", () => {
    renderDynamicForm();
  });

  document.getElementById("clear-all-btn")?.addEventListener("click", async () => {
    data = normalizeData(cloneDefaults());
    renderDynamicForm();
    renderSavedEntries();
    await saveState();
  });

  async function init() {
    setSaveStatus("Loading...", "neutral");
    renderDynamicForm();
    renderSavedEntries();
    const saved = await loadState();
    data = normalizeData(saved || cloneDefaults());
    hasLoadedInitialState = true;
    renderDynamicForm();
    renderSavedEntries();
    setSaveStatus("Ready", "success");
  }

  init();
}
