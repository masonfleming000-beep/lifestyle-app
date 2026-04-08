// @ts-nocheck
import {
  countItemsForSectionKey,
  findProjectByLayoutKey,
  isProjectLayoutKey,
  normalizeArray,
  normalizeBoolean,
  normalizeProjectIdentity,
  slugify,
  syncPortfolioSectionLayout,
} from "../careerPortfolioSections";

interface CareerPortfolioClientConfig {
  sourcePageKey: string;
  sectionOrder?: string[];
  sectionTitles?: Record<string, string>;
  previewPath?: string;
  shareBasePath?: string;
  shareLinkBaseUrl?: string;
}

export function initCareerPortfolioPage(config: CareerPortfolioClientConfig) {
  const sourcePageKey = config.sourcePageKey || "career-information";
  const previewPath = config.previewPath || "/career/portfolio-preview";
  const shareBasePath = config.shareBasePath || "/portfolio";
  const shareLinkBaseUrl = String(config.shareLinkBaseUrl || "").trim();

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

  function publicOrigin() {
    if (!shareLinkBaseUrl) return window.location.origin;
    try {
      return new URL(shareLinkBaseUrl).origin;
    } catch {
      return window.location.origin;
    }
  }

  function titleFor(key) {
    return config.sectionTitles?.[key] || key;
  }

  function defaultMenuItems() {
    return [{ id: "main", label: "Home", slug: "home" }];
  }

  const SECTION_FIELD_TEMPLATES = {
    profile: [
      { key: "headline", label: "Headline" },
      { key: "description", label: "Description" },
      { key: "links", label: "Public links" },
    ],
    resume: [
      { key: "file-name", label: "File name" },
      { key: "actions", label: "Action buttons" },
      { key: "note", label: "Note" },
      { key: "preview", label: "Preview" },
    ],
    experience: [
      { key: "company-location", label: "Company and location" },
      { key: "dates", label: "Dates" },
      { key: "summary", label: "Summary" },
      { key: "bullets", label: "Bullets" },
    ],
    leadership: [
      { key: "organization-date", label: "Organization and date" },
      { key: "summary", label: "Summary" },
      { key: "bullets", label: "Bullets" },
    ],
    organizations: [
      { key: "role-date", label: "Role and date" },
      { key: "description", label: "Description" },
    ],
    honors: [
      { key: "value", label: "Value" },
      { key: "issuer-date", label: "Issuer and date" },
      { key: "description", label: "Description" },
    ],
    licenses: [
      { key: "issuer-date", label: "Issuer and date" },
      { key: "credential-id", label: "Credential ID" },
      { key: "link", label: "Credential link" },
    ],
    contact: [
      { key: "note", label: "Note" },
      { key: "action", label: "Contact button" },
      { key: "value", label: "Value" },
    ],
    school: [
      { key: "prof-stage", label: "Professor and stage" },
      { key: "helped", label: "Helped with" },
      { key: "relevance", label: "Relevance" },
      { key: "notes", label: "Notes" },
    ],
    about: [{ key: "body", label: "Body" }],
    looking: [{ key: "body", label: "Body" }],
    pitch: [{ key: "body", label: "Body" }],
    timelineItems: [
      { key: "date", label: "Date" },
      { key: "description", label: "Description" },
    ],
    recommendations: [
      { key: "owner", label: "Source" },
      { key: "body", label: "Body" },
    ],
    star: [
      { key: "situation", label: "Situation" },
      { key: "task", label: "Task" },
      { key: "action", label: "Action" },
      { key: "result", label: "Result" },
    ],
  };
  const PROJECT_CARD_DISPLAY_OPTIONS = [
    { key: "showCoverPhoto", label: "Cover photo" },
    { key: "showSubtitle", label: "Subtitle" },
    { key: "showDescription", label: "Description" },
    { key: "showSkills", label: "Skills" },
    { key: "showLink", label: "Link" },
  ];

  function syncFieldLayout(key, existing) {
    const template = Array.isArray(SECTION_FIELD_TEMPLATES[key]) ? SECTION_FIELD_TEMPLATES[key] : [];
    const existingMap = new Map(normalizeArray(existing).map((item) => [String(item?.key || ''), item]));
    return template
      .map((item, index) => {
        const prev = existingMap.get(item.key) || {};
        return {
          key: item.key,
          label: item.label,
          visible: normalizeBoolean(prev?.visible, true),
          order: Number.isFinite(Number(prev?.order)) ? Number(prev.order) : index,
        };
      })
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((item, index) => ({ ...item, order: index }));
  }

  function normalizeProjectCardDisplay(value) {
    const raw = value && typeof value === "object" ? value : {};
    return {
      showCoverPhoto: normalizeBoolean(raw?.showCoverPhoto, true),
      showSubtitle: normalizeBoolean(raw?.showSubtitle, true),
      showDescription: normalizeBoolean(raw?.showDescription, true),
      showSkills: normalizeBoolean(raw?.showSkills, true),
      showLink: normalizeBoolean(raw?.showLink, true),
    };
  }

  function normalizeFieldType(value, fallback = "text") {
    const next = String(value || "").trim().toLowerCase();
    return ["text", "textarea", "number", "date", "list", "link", "image", "video", "file"].includes(next) ? next : fallback;
  }

  function projectSectionLabelFromKey(key) {
    const normalizedKey = String(key || "").trim();
    if (normalizedKey === "cover-photo") return "Cover Photo";
    if (normalizedKey === "subtitle") return "Subtitle";
    if (normalizedKey === "description") return "Description";
    if (normalizedKey === "skills") return "Skills";
    if (normalizedKey === "project-link") return "Project Link";
    if (normalizedKey.startsWith("field:")) return normalizedKey.replace(/^field:/, "").replace(/-/g, " ");
    return normalizedKey.replace(/-/g, " ");
  }

  function buildProjectPageSectionCandidates(project) {
    const candidates = [];
    const addSection = (key, title, type, value) => {
      const textValue = Array.isArray(value) ? value.filter(Boolean).join("\n") : String(value || "").trim();
      if (!textValue) return;
      candidates.push({ key, title, type: normalizeFieldType(type, type), value: textValue });
    };
    addSection("cover-photo", "Cover Photo", "image", project?.coverPhotoUrl || project?.image || project?.photoUrl || "");
    addSection("subtitle", "Subtitle", "text", project?.subtitle || "");
    addSection("description", "Description", "textarea", project?.description || "");
    addSection("skills", "Skills", "list", String(project?.skills || "").replace(/,\s*/g, "\n"));
    addSection("project-link", "Project Link", "link", project?.link || "");
    normalizeArray(project?.customFields).forEach((field, index) => {
      const rawValue = Array.isArray(field?.value) ? field.value.filter(Boolean).join("\n") : String(field?.value || "");
      if (!rawValue.trim()) return;
      candidates.push({
        key: `field:${field?.key || index}`,
        title: field?.label || `Field ${index + 1}`,
        type: normalizeFieldType(field?.type, "text"),
        value: rawValue,
      });
    });
    return candidates;
  }

  function syncProjectPageSections(project) {
    const candidates = buildProjectPageSectionCandidates(project);
    const existingMap = new Map(normalizeArray(project?.projectPageSections || project?.pageSections).map((item) => [String(item?.key || ''), item]));
    return candidates
      .map((item, index) => {
        const prev = existingMap.get(item.key) || {};
        return {
          id: prev?.id || makeId(`project-section-${item.key || index}`),
          key: item.key,
          title: item.title,
          type: item.type,
          value: item.value,
          visible: normalizeBoolean(prev?.visible, true),
          order: Number.isFinite(Number(prev?.order)) ? Number(prev.order) : index,
        };
      })
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((item, index) => ({ ...item, order: index }));
  }

  function projectSectionPreviewValue(section) {
    const type = normalizeFieldType(section?.type, "text");
    if (type === "image") return String(section?.value || "").trim() ? "Image set" : "Empty";
    if (type === "list") return String(section?.value || "").split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 2).join(", ") || "Empty";
    return String(section?.value || "").trim().slice(0, 60) || "Empty";
  }

  function defaultSectionLayout() {
    const order = Array.isArray(config.sectionOrder) && config.sectionOrder.length
      ? config.sectionOrder
      : ["profile", "resume", "experience", "leadership", "projects", "organizations", "honors", "licenses", "contact"];

    return order.map((key, index) => ({
      id: `layout-${key}`,
      key,
      title: titleFor(key),
      pageId: "main",
      enabled: ["profile", "resume", "experience", "leadership", "projects", "organizations", "honors", "licenses", "contact"].includes(key),
      collapsed: false,
      order: index,
    }));
  }

  function normalizeState(raw) {
    const parsed = raw && typeof raw === "object" ? raw : {};
    const menuItems = normalizeArray(parsed.portfolioMenuItems).length
      ? normalizeArray(parsed.portfolioMenuItems).map((item, index) => ({
          id: item?.id || makeId(`menu-${index}`),
          label: item?.label || `Page ${index + 1}`,
          slug: slugify(item?.slug || item?.label || `page-${index + 1}`),
        }))
      : defaultMenuItems();

    const projects = normalizeArray(parsed.projects).map((item, index) => normalizeProjectIdentity(item, index));
    const fallbackLayout = normalizeArray(parsed.portfolioSectionLayout).length
      ? normalizeArray(parsed.portfolioSectionLayout)
      : defaultSectionLayout();

    const syncedLayout = syncPortfolioSectionLayout(fallbackLayout, projects, {
      titleFor,
      defaultMenuId: menuItems[0]?.id || "main",
    }).map((item, index) => ({
      ...item,
      id: item?.id || makeId(`layout-${item?.key || index}`),
      pageId: menuItems.some((menuItem) => menuItem.id === item?.pageId) ? item.pageId : menuItems[0]?.id || "main",
      enabled: normalizeBoolean(item?.enabled, true),
      collapsed: normalizeBoolean(item?.collapsed, false),
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    }));

    return {
      ...parsed,
      profile: normalizeArray(parsed.profile),
      externalLinks: normalizeArray(parsed.externalLinks),
      experience: normalizeArray(parsed.experience),
      leadership: normalizeArray(parsed.leadership),
      organizations: normalizeArray(parsed.organizations),
      honors: normalizeArray(parsed.honors || parsed.stats),
      licenses: normalizeArray(parsed.licenses),
      contact: normalizeArray(parsed.contact),
      resume: normalizeArray(parsed.resume),
      school: normalizeArray(parsed.school),
      about: normalizeArray(parsed.about),
      looking: normalizeArray(parsed.looking),
      pitch: normalizeArray(parsed.pitch),
      timelineItems: normalizeArray(parsed.timelineItems || parsed.timeline),
      recommendations: normalizeArray(parsed.recommendations),
      star: normalizeArray(parsed.star),
      portfolioMenuItems: menuItems,
      portfolioSectionLayout: syncedLayout,
      portfolioFieldLayout: Object.fromEntries(Object.keys(SECTION_FIELD_TEMPLATES).map((key) => [key, syncFieldLayout(key, parsed?.portfolioFieldLayout?.[key])])),
      projects: projects.map((item) => ({ ...item, cardDisplay: normalizeProjectCardDisplay(item?.cardDisplay), projectPageSections: syncProjectPageSections(item) })),
    };
  }

  async function loadState() {
    try {
      const res = await fetch(`/api/state?pageKey=${encodeURIComponent(sourcePageKey)}`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const payload = await res.json();
      return payload?.state ?? null;
    } catch (error) {
      console.error("Failed to load portfolio layout state:", error);
      return null;
    }
  }

  async function loadMe() {
    try {
      const res = await fetch("/api/me", {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) return null;
      const payload = await res.json();
      return payload?.user || null;
    } catch {
      return null;
    }
  }

  function absoluteShareHref(username, slug) {
    if (!username) return "";
    return `${publicOrigin()}${shareBasePath}/${encodeURIComponent(username)}?page=${encodeURIComponent(slug || data.portfolioMenuItems[0]?.slug || "home")}`;
  }

  async function copyShareLink(slug) {
    const user = await loadMe();
    const href = absoluteShareHref(user?.username, slug);
    if (!href) {
      window.alert("Set a username in your profile settings to create a public share link.");
      return;
    }
    try {
      await navigator.clipboard.writeText(href);
      saveStatus("Share link copied", "success");
    } catch {
      window.prompt("Copy this public portfolio link:", href);
    }
  }

  async function postState(snapshot) {
    const res = await fetch("/api/state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey: sourcePageKey, state: snapshot }),
    });
    if (!res.ok) throw new Error(`Save failed (${res.status})`);
  }

  let data = normalizeState({});
  let ready = false;
  let isSaving = false;
  let pendingSave = false;

  function refreshDynamicSections() {
    data.projects = normalizeArray(data.projects).map((item, index) => {
      const identity = normalizeProjectIdentity(item, index);
      const project = { ...identity, ...item, cardDisplay: normalizeProjectCardDisplay(item?.cardDisplay) };
      return { ...project, projectPageSections: syncProjectPageSections(project) };
    });
    data.portfolioSectionLayout = syncPortfolioSectionLayout(data.portfolioSectionLayout, data.projects, {
      titleFor,
      defaultMenuId: data.portfolioMenuItems[0]?.id || "main",
    });
  }

  function sectionStats(key) {
    return countItemsForSectionKey(data, key);
  }

  function saveStatus(text, kind = "neutral") {
    const el = document.getElementById("portfolio-layout-status");
    if (!el) return;
    el.textContent = text;
    el.className = `save-status ${kind}`;
  }

  async function saveState() {
    if (!ready) return;
    if (isSaving) {
      pendingSave = true;
      saveStatus("Queued save...", "neutral");
      return;
    }

    isSaving = true;
    saveStatus("Saving...", "neutral");

    try {
      refreshDynamicSections();
      data.portfolioSectionLayout = [...data.portfolioSectionLayout]
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
        .map((item, index) => ({ ...item, order: index }));
      await postState(data);
      saveStatus("Saved", "success");
    } catch (error) {
      console.error("Failed to save portfolio layout:", error);
      saveStatus(error?.message || "Save failed", "error");
    } finally {
      isSaving = false;
      if (pendingSave) {
        pendingSave = false;
        await saveState();
      }
    }
  }

  function previewHref(slug) {
    return `${previewPath}?page=${encodeURIComponent(slug || data.portfolioMenuItems[0]?.slug || "home")}`;
  }

  function renderMenuManager() {
    const root = document.getElementById("portfolio-menu-manager");
    if (!root) return;

    root.innerHTML = `
      <div class="portfolio-menu-header">
        <div>
          <p class="kicker">Portfolio menu</p>
          <h2 class="section-title">Top navigation items</h2>
          <p class="section-subtitle">These items power the preview's public-style navigation. Each section below can be assigned to one of these pages.</p>
        </div>
        <div class="portfolio-menu-header-actions">
          <button id="portfolio-add-menu-item" class="button-secondary" type="button">+ New menu item</button>
          <a id="portfolio-preview-link" class="button-primary" href="${escapeHtml(previewHref(data.portfolioMenuItems[0]?.slug))}" target="_blank" rel="noreferrer">Open portfolio preview</a>
          <button id="portfolio-share-link" class="button-secondary" type="button">Copy public share link</button>
        </div>
      </div>
      <div class="portfolio-menu-list">
        ${data.portfolioMenuItems
          .map((item) => `
            <article class="portfolio-menu-card card">
              <div class="portfolio-menu-card-copy">
                <label class="edu-label">
                  <span>Menu label</span>
                  <input data-menu-input="${escapeHtml(item.id)}" class="form-input" value="${escapeHtml(item.label)}" />
                </label>
                <p class="portfolio-menu-slug">Page URL: <code>${escapeHtml(previewHref(item.slug))}</code></p>
              </div>
              <div class="portfolio-menu-card-actions">
                <a class="button-secondary" href="${escapeHtml(previewHref(item.slug))}" target="_blank" rel="noreferrer">Open page</a>
                <button class="button-secondary" type="button" data-menu-share="${escapeHtml(item.slug)}">Share page</button>
                <button class="button-secondary" type="button" data-menu-duplicate="${escapeHtml(item.id)}">Duplicate</button>
                <button class="danger-btn" type="button" data-menu-delete="${escapeHtml(item.id)}" ${data.portfolioMenuItems.length <= 1 ? "disabled" : ""}>Delete</button>
              </div>
            </article>
          `)
          .join("")}
      </div>
    `;

    root.querySelector("#portfolio-share-link")?.addEventListener("click", async () => {
      await copyShareLink(data.portfolioMenuItems[0]?.slug);
    });

    root.querySelector("#portfolio-add-menu-item")?.addEventListener("click", async () => {
      const nextIndex = data.portfolioMenuItems.length + 1;
      const label = `Page ${nextIndex}`;
      data.portfolioMenuItems.push({ id: makeId("menu"), label, slug: slugify(label) });
      refreshDynamicSections();
      renderAll();
      await saveState();
    });

    root.querySelectorAll("[data-menu-input]").forEach((input) => {
      input.addEventListener("change", async (event) => {
        const id = event.currentTarget.getAttribute("data-menu-input");
        const value = String(event.currentTarget.value || "").trim() || "Untitled";
        const otherSlugs = data.portfolioMenuItems.filter((item) => item.id !== id).map((item) => item.slug);
        let slug = slugify(value);
        let counter = 2;
        while (otherSlugs.includes(slug)) {
          slug = `${slugify(value)}-${counter}`;
          counter += 1;
        }
        data.portfolioMenuItems = data.portfolioMenuItems.map((item) => item.id === id ? { ...item, label: value, slug } : item);
        refreshDynamicSections();
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-menu-share]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const slug = event.currentTarget.getAttribute("data-menu-share") || data.portfolioMenuItems[0]?.slug || "home";
        await copyShareLink(slug);
      });
    });

    root.querySelectorAll("[data-menu-duplicate]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const id = event.currentTarget.getAttribute("data-menu-duplicate");
        const original = data.portfolioMenuItems.find((item) => item.id === id);
        if (!original) return;
        const label = `${original.label} Copy`;
        let slug = slugify(label);
        let counter = 2;
        const existing = data.portfolioMenuItems.map((item) => item.slug);
        while (existing.includes(slug)) {
          slug = `${slugify(label)}-${counter}`;
          counter += 1;
        }
        data.portfolioMenuItems.push({ id: makeId("menu"), label, slug });
        refreshDynamicSections();
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-menu-delete]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const id = event.currentTarget.getAttribute("data-menu-delete");
        if (data.portfolioMenuItems.length <= 1) return;
        data.portfolioMenuItems = data.portfolioMenuItems.filter((item) => item.id !== id);
        const fallbackId = data.portfolioMenuItems[0]?.id || "main";
        data.portfolioSectionLayout = data.portfolioSectionLayout.map((item) => item.pageId === id ? { ...item, pageId: fallbackId } : item);
        refreshDynamicSections();
        renderAll();
        await saveState();
      });
    });
  }

  function moveSection(id, direction) {
    const ordered = [...data.portfolioSectionLayout].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const index = ordered.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    const swap = ordered[target];
    const current = ordered[index];
    const currentOrder = current.order;
    current.order = swap.order;
    swap.order = currentOrder;
    data.portfolioSectionLayout = ordered;
  }

  function sectionHint(section) {
    const stats = sectionStats(section.key);
    if (isProjectLayoutKey(section.key)) {
      const project = findProjectByLayoutKey(data.projects, section.key);
      if (!project) return "This project was removed. Save again to clean up the layout.";
      return project.visible !== false
        ? "Quick-link card is visible in preview and opens the dedicated project page."
        : "Project entry is hidden in Information Builder, so this quick link stays hidden until you show it again.";
    }
    if (stats.saved > 0) {
      return `${stats.visible} visible / ${stats.saved} saved in Information Builder`;
    }
    return "No saved content yet — this stays as a suggestion until you fill it in or hide it.";
  }

  function sectionMetaRows(section) {
    const stats = sectionStats(section.key);
    const project = isProjectLayoutKey(section.key) ? findProjectByLayoutKey(data.projects, section.key) : null;
    const assignedPage = data.portfolioMenuItems.find((item) => item.id === section.pageId)?.label || "Home";

    if (project) {
      return `
        <p><strong>Section key:</strong> ${escapeHtml(section.key)}</p>
        <p><strong>Project page slug:</strong> ${escapeHtml(project.projectSlug || "project")}</p>
        <p><strong>Assigned page:</strong> ${escapeHtml(assignedPage)}</p>
        <p><strong>Card visibility:</strong> ${project.visible !== false ? "Visible" : "Hidden in Information Builder"}</p>
        <p><strong>Public behavior:</strong> The section card acts as a quick link to the dedicated project page, and the page itself uses the project's visible dropdown sections.</p>
      `;
    }

    return `
      <p><strong>Section key:</strong> ${escapeHtml(section.key)}</p>
      <p><strong>Assigned page:</strong> ${escapeHtml(assignedPage)}</p>
      <p><strong>Saved content:</strong> ${stats.saved} item(s)</p>
      <p><strong>Visible content:</strong> ${stats.visible} item(s)</p>
      <p><strong>Note:</strong> Content is edited on the Information page. This page only controls order, visibility, and which menu page each section lives on.</p>
    `;
  }

  function updateSectionFieldLayout(sectionKey, updater) {
    const current = syncFieldLayout(sectionKey, data.portfolioFieldLayout?.[sectionKey]);
    const next = typeof updater === "function" ? updater(current) : current;
    data.portfolioFieldLayout = { ...data.portfolioFieldLayout, [sectionKey]: syncFieldLayout(sectionKey, next) };
  }

  function updateProject(projectKey, updater) {
    data.projects = normalizeArray(data.projects).map((item, index) => {
      const normalized = { ...item, cardDisplay: normalizeProjectCardDisplay(item?.cardDisplay), projectPageSections: syncProjectPageSections(item) };
      const itemKey = normalized.projectLayoutKey || normalized.projectSlug || `project-${index}`;
      if (itemKey !== projectKey) return normalized;
      const updated = typeof updater === "function" ? updater(normalized) : normalized;
      return { ...updated, cardDisplay: normalizeProjectCardDisplay(updated?.cardDisplay), projectPageSections: syncProjectPageSections(updated) };
    });
  }

  function moveSectionField(sectionKey, fieldKey, direction) {
    updateSectionFieldLayout(sectionKey, (fields) => {
      const index = fields.findIndex((item) => item.key === fieldKey);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= fields.length) return fields;
      const next = [...fields];
      const [current] = next.splice(index, 1);
      next.splice(target, 0, current);
      return next.map((item, order) => ({ ...item, order }));
    });
  }

  function toggleSectionField(sectionKey, fieldKey) {
    updateSectionFieldLayout(sectionKey, (fields) => fields.map((item, order) => item.key === fieldKey ? { ...item, visible: !normalizeBoolean(item?.visible, true), order } : { ...item, order }));
  }

  function moveProjectField(projectKey, fieldKey, direction) {
    updateProject(projectKey, (project) => {
      const sections = syncProjectPageSections(project);
      const index = sections.findIndex((item) => item.key === fieldKey);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sections.length) return project;
      const next = [...sections];
      const [current] = next.splice(index, 1);
      next.splice(target, 0, current);
      return { ...project, projectPageSections: next.map((item, order) => ({ ...item, order })) };
    });
  }

  function toggleProjectField(projectKey, fieldKey) {
    updateProject(projectKey, (project) => ({
      ...project,
      projectPageSections: syncProjectPageSections(project).map((item, order) => item.key === fieldKey ? { ...item, visible: !normalizeBoolean(item?.visible, true), order } : { ...item, order }),
    }));
  }

  function toggleProjectCardField(projectKey, displayKey) {
    updateProject(projectKey, (project) => ({
      ...project,
      cardDisplay: {
        ...normalizeProjectCardDisplay(project?.cardDisplay),
        [displayKey]: !normalizeProjectCardDisplay(project?.cardDisplay)?.[displayKey],
      },
    }));
  }

  function renderFieldControls(section) {
    if (isProjectLayoutKey(section.key)) {
      const project = findProjectByLayoutKey(data.projects, section.key);
      if (!project) return '';
      const cardDisplay = normalizeProjectCardDisplay(project?.cardDisplay);
      const pageSections = syncProjectPageSections(project);
      return `
        <div class="portfolio-field-manager card">
          <div class="portfolio-field-group">
            <p class="project-settings-title"><strong>Quick-link card fields</strong></p>
            <div class="portfolio-inline-toggle-list">
              ${PROJECT_CARD_DISPLAY_OPTIONS.map((option) => `<button class="button-secondary career-inline-button career-inline-button-mini" type="button" data-project-card-field="${escapeHtml(section.key)}:${escapeHtml(option.key)}">${cardDisplay[option.key] ? 'Hide' : 'Show'} ${escapeHtml(option.label)}</button>`).join('')}
            </div>
          </div>
          <div class="portfolio-field-group">
            <p class="project-settings-title"><strong>Project page fields</strong></p>
            <div class="project-page-section-list">
              ${pageSections.map((field, index) => `<div class="project-page-section-row"><div><p class="project-page-section-title">${escapeHtml(field.title || projectSectionLabelFromKey(field.key))}</p><p class="project-page-section-value">${escapeHtml(projectSectionPreviewValue(field))}</p></div><div class="project-page-section-actions"><button class="button-secondary career-inline-button career-inline-button-mini" type="button" data-project-field-move="up:${escapeHtml(section.key)}:${escapeHtml(field.key)}" ${index === 0 ? 'disabled' : ''}>Up</button><button class="button-secondary career-inline-button career-inline-button-mini" type="button" data-project-field-move="down:${escapeHtml(section.key)}:${escapeHtml(field.key)}" ${index === pageSections.length - 1 ? 'disabled' : ''}>Down</button><button class="button-secondary career-inline-button career-inline-button-mini" type="button" data-project-field-toggle="${escapeHtml(section.key)}:${escapeHtml(field.key)}">${field.visible !== false ? 'Hide' : 'Show'}</button></div></div>`).join('')}
            </div>
          </div>
        </div>
      `;
    }
    const fields = syncFieldLayout(section.key, data.portfolioFieldLayout?.[section.key]);
    if (!fields.length) return '';
    return `
      <div class="portfolio-field-manager card">
        <p class="project-settings-title"><strong>Fields inside this section</strong></p>
        <div class="project-page-section-list">
          ${fields.map((field, index) => `<div class="project-page-section-row"><div><p class="project-page-section-title">${escapeHtml(field.label)}</p><p class="project-page-section-value">${field.visible !== false ? 'Shown on public page' : 'Hidden on public page'}</p></div><div class="project-page-section-actions"><button class="button-secondary career-inline-button career-inline-button-mini" type="button" data-section-field-move="up:${escapeHtml(section.key)}:${escapeHtml(field.key)}" ${index === 0 ? 'disabled' : ''}>Up</button><button class="button-secondary career-inline-button career-inline-button-mini" type="button" data-section-field-move="down:${escapeHtml(section.key)}:${escapeHtml(field.key)}" ${index === fields.length - 1 ? 'disabled' : ''}>Down</button><button class="button-secondary career-inline-button career-inline-button-mini" type="button" data-section-field-toggle="${escapeHtml(section.key)}:${escapeHtml(field.key)}">${field.visible !== false ? 'Hide' : 'Show'}</button></div></div>`).join('')}
        </div>
      </div>
    `;
  }

  function renderSectionManager() {
    const root = document.getElementById("portfolio-section-manager");
    if (!root) return;

    refreshDynamicSections();
    const ordered = [...data.portfolioSectionLayout].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    root.innerHTML = ordered
      .map((section, index) => `
        <details class="dropdown-card expandable-section surface-dropdown portfolio-layout-card" ${section.collapsed ? "" : "open"}>
          <summary class="portfolio-layout-summary">
            <div>
              <p class="kicker">${isProjectLayoutKey(section.key) ? `Project link ${index + 1}` : `Section ${index + 1}`}</p>
              <h2 class="section-title">${escapeHtml(section.title || titleFor(section.key))}</h2>
              <p class="section-subtitle">${escapeHtml(sectionHint(section))}</p>
            </div>
            <div class="portfolio-layout-summary-right">
              <span class="section-chip ${section.enabled ? "on" : "off"}">${section.enabled ? "Shown" : "Hidden"}</span>
              <span class="dropdown-arrow">⌄</span>
            </div>
          </summary>
          <div class="dropdown-content portfolio-layout-body">
            <div class="portfolio-layout-controls">
              <label class="edu-label">
                <span>Add section to menu item</span>
                <select class="form-input" data-section-page="${escapeHtml(section.id)}">
                  ${data.portfolioMenuItems
                    .map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === section.pageId ? "selected" : ""}>${escapeHtml(item.label)}</option>`)
                    .join("")}
                </select>
              </label>
              <div class="portfolio-layout-buttons">
                <button class="button-secondary" type="button" data-section-move="up:${escapeHtml(section.id)}" ${index === 0 ? "disabled" : ""}>Move up</button>
                <button class="button-secondary" type="button" data-section-move="down:${escapeHtml(section.id)}" ${index === ordered.length - 1 ? "disabled" : ""}>Move down</button>
                <button class="button-secondary" type="button" data-section-toggle="${escapeHtml(section.id)}">${section.enabled ? "Hide section" : "Show section"}</button>
              </div>
            </div>
            <div class="portfolio-section-meta card">
              ${sectionMetaRows(section)}
            </div>
            ${renderFieldControls(section)}
          </div>
        </details>
      `)
      .join("");

    root.querySelectorAll("[data-section-page]").forEach((select) => {
      select.addEventListener("change", async (event) => {
        const id = event.currentTarget.getAttribute("data-section-page");
        const pageId = String(event.currentTarget.value || "");
        data.portfolioSectionLayout = data.portfolioSectionLayout.map((item) => item.id === id ? { ...item, pageId } : item);
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-section-toggle]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const id = event.currentTarget.getAttribute("data-section-toggle");
        data.portfolioSectionLayout = data.portfolioSectionLayout.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item);
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-section-move]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const value = event.currentTarget.getAttribute("data-section-move") || "";
        const [direction, id] = value.split(":");
        moveSection(id, direction === "up" ? -1 : 1);
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-section-field-move]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const value = event.currentTarget.getAttribute("data-section-field-move") || "";
        const [direction, sectionKey, fieldKey] = value.split(":");
        moveSectionField(sectionKey, fieldKey, direction === "up" ? -1 : 1);
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-section-field-toggle]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const value = event.currentTarget.getAttribute("data-section-field-toggle") || "";
        const [sectionKey, fieldKey] = value.split(":");
        toggleSectionField(sectionKey, fieldKey);
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-project-field-move]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const value = event.currentTarget.getAttribute("data-project-field-move") || "";
        const [direction, projectKey, fieldKey] = value.split(":");
        moveProjectField(projectKey, fieldKey, direction === "up" ? -1 : 1);
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-project-field-toggle]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const value = event.currentTarget.getAttribute("data-project-field-toggle") || "";
        const [projectKey, fieldKey] = value.split(":");
        toggleProjectField(projectKey, fieldKey);
        renderAll();
        await saveState();
      });
    });

    root.querySelectorAll("[data-project-card-field]").forEach((button) => {
      button.addEventListener("click", async (event) => {
        const value = event.currentTarget.getAttribute("data-project-card-field") || "";
        const [projectKey, displayKey] = value.split(":");
        toggleProjectCardField(projectKey, displayKey);
        renderAll();
        await saveState();
      });
    });
  }

  function renderOverview() {
    const root = document.getElementById("portfolio-layout-overview");
    if (!root) return;

    refreshDynamicSections();
    const shown = data.portfolioSectionLayout.filter((item) => item.enabled).length;
    const hidden = data.portfolioSectionLayout.length - shown;
    const projectLinks = data.portfolioSectionLayout.filter((item) => isProjectLayoutKey(item.key)).length;

    root.innerHTML = `
      <div class="metric-grid portfolio-overview-grid">
        <article class="stat-card surface-section portfolio-stat-card">
          <div class="stat-card-top"><p class="stat-card-label">Menu items</p><h3 class="stat-card-value">${data.portfolioMenuItems.length}</h3></div>
          <p class="stat-card-description">Top navigation pages available in preview.</p>
        </article>
        <article class="stat-card surface-section portfolio-stat-card">
          <div class="stat-card-top"><p class="stat-card-label">Project quick links</p><h3 class="stat-card-value">${projectLinks}</h3></div>
          <p class="stat-card-description">Each saved project becomes its own reorderable section card.</p>
        </article>
        <article class="stat-card surface-section portfolio-stat-card">
          <div class="stat-card-top"><p class="stat-card-label">Shown sections</p><h3 class="stat-card-value">${shown}</h3></div>
          <p class="stat-card-description">Sections currently enabled in the portfolio layout.</p>
        </article>
        <article class="stat-card surface-section portfolio-stat-card">
          <div class="stat-card-top"><p class="stat-card-label">Hidden sections</p><h3 class="stat-card-value">${hidden}</h3></div>
          <p class="stat-card-description">Suggestion sections you can re-enable later.</p>
        </article>
      </div>
    `;
  }

  function renderAll() {
    renderOverview();
    renderMenuManager();
    renderSectionManager();
  }

  async function init() {
    saveStatus("Loading...", "neutral");
    const saved = await loadState();
    data = normalizeState(saved || {});
    ready = true;
    renderAll();
    saveStatus("Ready", "success");
  }

  init();
}
