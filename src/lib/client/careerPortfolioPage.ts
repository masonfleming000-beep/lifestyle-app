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
      projects,
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
    data.projects = normalizeArray(data.projects).map((item, index) => normalizeProjectIdentity(item, index));
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
