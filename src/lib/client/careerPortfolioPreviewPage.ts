// @ts-nocheck
import { findProjectByLayoutKey, isProjectLayoutKey, normalizeProjectIdentity, syncPortfolioSectionLayout } from "../careerPortfolioSections";
interface CareerPortfolioPreviewConfig {
  pageKey?: string;
  sectionTitles?: Record<string, string>;
  publicUsername?: string;
  shareBasePath?: string;
  shareLinkBaseUrl?: string;
  assetBaseUrl?: string;
  projectSlug?: string;
}

export function initCareerPortfolioPreviewPage(config: CareerPortfolioPreviewConfig) {
  const pageKey = config.pageKey || "career-information";
  const publicUsername = String(config.publicUsername || "").trim();
  const shareBasePath = config.shareBasePath || "/portfolio";
  const shareLinkBaseUrl = String(config.shareLinkBaseUrl || "").trim();
  const assetBaseUrl = String(config.assetBaseUrl || "").trim();
  const initialProjectSlug = String(config.projectSlug || "").trim();

  const SECTION_FIELD_TEMPLATES = {
    profile: ["headline", "description", "links"],
    resume: ["file-name", "actions", "note", "preview"],
    experience: ["company-location", "dates", "summary", "bullets"],
    leadership: ["organization-date", "summary", "bullets"],
    organizations: ["role-date", "description"],
    honors: ["value", "issuer-date", "description"],
    licenses: ["issuer-date", "credential-id", "link"],
    contact: ["note", "action", "value"],
    school: ["prof-stage", "helped", "relevance", "notes"],
    about: ["body"],
    looking: ["body"],
    pitch: ["body"],
    timelineItems: ["date", "description"],
    recommendations: ["owner", "body"],
    star: ["situation", "task", "action", "result"],
  };

  function syncFieldLayout(key, existing) {
    const template = Array.isArray(SECTION_FIELD_TEMPLATES[key]) ? SECTION_FIELD_TEMPLATES[key] : [];
    const existingMap = new Map(normalizeArray(existing).map((item) => [String(item?.key || ''), item]));
    return template.map((fieldKey, index) => {
      const prev = existingMap.get(fieldKey) || {};
      return { key: fieldKey, visible: normalizeBoolean(prev?.visible, true), order: Number.isFinite(Number(prev?.order)) ? Number(prev.order) : index };
    }).sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map((item, index) => ({ ...item, order: index }));
  }

  function renderOrderedBlocks(sectionKey, blocks, extras = "") {
    const layout = syncFieldLayout(sectionKey, state?.portfolioFieldLayout?.[sectionKey]);
    const seen = new Set();
    const html = [];
    layout.forEach((item) => {
      seen.add(item.key);
      if (item.visible === false) return;
      if (blocks[item.key]) html.push(blocks[item.key]);
    });
    Object.keys(blocks).forEach((key) => {
      if (!seen.has(key) && blocks[key]) html.push(blocks[key]);
    });
    if (extras) html.push(extras);
    return html.join("");
  }

  const PROJECT_CARD_DISPLAY_DEFAULTS = {
    showCoverPhoto: true,
    showSubtitle: true,
    showDescription: true,
    showSkills: true,
    showLink: true,
  };

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

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "page";
  }

  function publicOrigin() {
    if (!shareLinkBaseUrl) return window.location.origin;
    try {
      return new URL(shareLinkBaseUrl).origin;
    } catch {
      return window.location.origin;
    }
  }

  function resolveAssetUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^(data:|blob:|mailto:)/i.test(text)) return text;

  try {
    const parsed = new URL(text);
    if (/^\/(uploads|api\/uploads)\//i.test(parsed.pathname)) {
      return `${window.location.origin}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return text;
  } catch {}

  if (text.startsWith("/")) {
    try {
      return new URL(text, `${window.location.origin.replace(/\/$/, "")}/`).toString();
    } catch {
      return text;
    }
  }

  return text;
}

  function defaultMenuItems() {
    return [{ id: "main", label: "Home", slug: "home" }];
  }

  function titleFor(key) {
    return config.sectionTitles?.[key] || key;
  }

  function defaultSectionLayout() {
    const order = ["profile", "resume", "experience", "leadership", "projects", "organizations", "honors", "licenses", "contact"];
    return order.map((key, index) => ({
      id: `layout-${key}`,
      key,
      title: titleFor(key),
      pageId: "main",
      enabled: true,
      collapsed: false,
      order: index,
    }));
  }

  function normalizeFieldType(value, fallback = "text") {
    const next = String(value || "").trim().toLowerCase();
    return ["text", "textarea", "number", "date", "list", "link", "image", "video", "file"].includes(next) ? next : fallback;
  }

  function splitCustomFieldValue(value) {
    return String(value || "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function isProbablyUrl(value) {
    const text = String(value || "").trim();
    return /^https?:\/\//i.test(text) || text.startsWith("/") || text.startsWith("mailto:");
  }

  function formatMultilineHtml(value) {
    return escapeHtml(value || "—").replaceAll("\n", "<br />");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatRange(startDate, endDate) {
    const start = formatDate(startDate);
    const end = formatDate(endDate);
    if (!start && !end) return "";
    if (start && end) return `${start} - ${end}`;
    return start || end;
  }

  function visibleItems(items) {
    return normalizeArray(items).filter((item) => item?.visible !== false);
  }

  function normalizeProjectCardDisplay(value) {
    const raw = value && typeof value === "object" ? value : {};
    return {
      showCoverPhoto: normalizeBoolean(raw?.showCoverPhoto, PROJECT_CARD_DISPLAY_DEFAULTS.showCoverPhoto),
      showSubtitle: normalizeBoolean(raw?.showSubtitle, PROJECT_CARD_DISPLAY_DEFAULTS.showSubtitle),
      showDescription: normalizeBoolean(raw?.showDescription, PROJECT_CARD_DISPLAY_DEFAULTS.showDescription),
      showSkills: normalizeBoolean(raw?.showSkills, PROJECT_CARD_DISPLAY_DEFAULTS.showSkills),
      showLink: normalizeBoolean(raw?.showLink, PROJECT_CARD_DISPLAY_DEFAULTS.showLink),
    };
  }

  function buildProjectPageSectionCandidates(project) {
    const candidates = [];
    const addSection = (key, title, type, value) => {
      const textValue = Array.isArray(value) ? value.filter(Boolean).join("\n") : String(value || "").trim();
      if (!textValue) return;
      candidates.push({ key, title, type: normalizeFieldType(type, type), value: textValue });
    };

    addSection("cover-photo", "Cover Photo", "image", project?.coverPhotoUrl || "");
    addSection("subtitle", "Subtitle", "text", project?.subtitle || "");
    addSection("description", "Description", "textarea", project?.description || "");
    addSection("skills", "Skills", "list", String(project?.skills || "").replace(/,\s*/g, "\n"));
    addSection("project-link", "Project Link", "link", project?.link || "");

    normalizeArray(project?.customFields).forEach((field, index) => {
      const key = `field:${field?.key || index}`;
      const rawValue = Array.isArray(field?.value) ? field.value.filter(Boolean).join("\n") : String(field?.value || "");
      if (!rawValue.trim()) return;
      candidates.push({
        key,
        title: field?.label || `Field ${index + 1}`,
        type: normalizeFieldType(field?.type, "text"),
        value: rawValue,
      });
    });

    return candidates;
  }

  function syncProjectPageSections(project) {
    const candidates = buildProjectPageSectionCandidates(project);
    const existingSections = normalizeArray(project?.projectPageSections || project?.pageSections);
    const existingMap = new Map(existingSections.map((section) => [String(section?.key || ""), section]));

    return candidates
      .map((candidate, index) => {
        const existing = existingMap.get(candidate.key) || {};
        return {
          id: existing?.id || `project-section-${candidate.key || index}`,
          key: candidate.key,
          title: candidate.title,
          type: candidate.type,
          value: candidate.value,
          visible: normalizeBoolean(existing?.visible, true),
          order: Number.isFinite(Number(existing?.order)) ? Number(existing.order) : index,
        };
      })
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((section, index) => ({ ...section, order: index }));
  }

  function normalizeProject(item, index = 0) {
    const projectIdentity = normalizeProjectIdentity(item, index);
    const project = {
      ...projectIdentity,
      visible: normalizeBoolean(item?.visible, true),
      coverPhotoUrl: resolveAssetUrl(item?.coverPhotoUrl || item?.image || item?.photoUrl || projectIdentity?.coverPhotoUrl || ""),
      cardDisplay: normalizeProjectCardDisplay(item?.cardDisplay),
      customFields: normalizeArray(item?.customFields).filter((field) => field?.label || field?.value),
    };

    return {
      ...project,
      projectPageSections: syncProjectPageSections(project),
    };
  }

  function normalizeState(raw) {
    const parsed = raw && typeof raw === "object" ? raw : {};
    const menuItems = normalizeArray(parsed.portfolioMenuItems).length
      ? normalizeArray(parsed.portfolioMenuItems).map((item, index) => ({
          id: item?.id || `menu-${index}`,
          label: item?.label || `Page ${index + 1}`,
          slug: slugify(item?.slug || item?.label || `page-${index + 1}`),
        }))
      : defaultMenuItems();

    const menuIds = new Set(menuItems.map((item) => item.id));
    const layoutSource = normalizeArray(parsed.portfolioSectionLayout).length
      ? normalizeArray(parsed.portfolioSectionLayout)
      : defaultSectionLayout();

    const layout = layoutSource.map((item, index) => ({
      id: item?.id || `layout-${item?.key || index}`,
      key: item?.key || "",
      title: item?.title || titleFor(item?.key || "") || `Section ${index + 1}`,
      pageId: menuIds.has(item?.pageId) ? item.pageId : menuItems[0]?.id || "main",
      enabled: normalizeBoolean(item?.enabled, true),
      collapsed: normalizeBoolean(item?.collapsed, false),
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    }));

    const projects = normalizeArray(parsed.projects).map((item, index) => normalizeProject(item, index));
    const syncedLayout = syncPortfolioSectionLayout(layout, projects, {
      titleFor,
      defaultMenuId: menuItems[0]?.id || "main",
    }).map((item, index) => ({
      ...item,
      pageId: menuIds.has(item?.pageId) ? item.pageId : menuItems[0]?.id || "main",
      enabled: normalizeBoolean(item?.enabled, true),
      collapsed: normalizeBoolean(item?.collapsed, false),
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    }));

    return {
      ...parsed,
      portfolioFieldLayout: Object.fromEntries(Object.keys(SECTION_FIELD_TEMPLATES).map((key) => [key, syncFieldLayout(key, parsed?.portfolioFieldLayout?.[key])])),
      profile: normalizeArray(parsed.profile).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      externalLinks: normalizeArray(parsed.externalLinks).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      experience: normalizeArray(parsed.experience).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      leadership: normalizeArray(parsed.leadership).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      projects,
      organizations: normalizeArray(parsed.organizations).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      honors: normalizeArray(parsed.honors || parsed.stats).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      licenses: normalizeArray(parsed.licenses).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      contact: normalizeArray(parsed.contact).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      resume: normalizeArray(parsed.resume).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      school: normalizeArray(parsed.school).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      about: normalizeArray(parsed.about).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      looking: normalizeArray(parsed.looking).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      pitch: normalizeArray(parsed.pitch).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      timelineItems: normalizeArray(parsed.timelineItems || parsed.timeline).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      recommendations: normalizeArray(parsed.recommendations).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      star: normalizeArray(parsed.star).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      portfolioMenuItems: menuItems,
      portfolioSectionLayout: syncedLayout,
    };
  }

  async function loadPrivateState() {
    const res = await fetch(`/api/state?pageKey=${encodeURIComponent(pageKey)}`, {
      credentials: "include",
      cache: "no-store",
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const payload = await res.json().catch(() => null);
    return payload?.state ?? null;
  }

  async function loadPublicState(username) {
    const res = await fetch(`/api/career/portfolio-public?username=${encodeURIComponent(username)}`, {
      cache: "no-store",
    }).catch(() => null);
    if (!res || !res.ok) return { state: null, user: null };
    const payload = await res.json().catch(() => null);
    return { state: payload?.state ?? null, user: payload?.user ?? null };
  }

  async function loadMe() {
    const res = await fetch("/api/me", {
      credentials: "include",
      cache: "no-store",
    }).catch(() => null);
    if (!res || !res.ok) return null;
    const payload = await res.json().catch(() => null);
    return payload?.user || null;
  }

  function isPdf(item) {
    return String(item?.fileType || "").toLowerCase().includes("pdf") || String(item?.fileName || "").toLowerCase().endsWith(".pdf");
  }

  function renderCustomFieldValue(field) {
    const type = normalizeFieldType(field?.type, "text");
    const values = splitCustomFieldValue(field?.value);
    if (type === "image") {
      const media = values.length ? values : [field?.value || ""];
      return `
        <div class="preview-link-row">
          ${media.filter(Boolean).map((value) => isProbablyUrl(value)
            ? `<img src="${escapeHtml(resolveAssetUrl(value))}" alt="${escapeHtml(field?.label || "Image")}" style="width:100%;max-width:22rem;border-radius:1rem;border:1px solid rgba(15,23,42,0.08);object-fit:cover;" />`
            : `<p>${escapeHtml(value)}</p>`).join("")}
        </div>
      `;
    }
    if (["link", "video", "file"].includes(type)) {
      const links = values.length ? values : [field?.value || ""];
      return `<div class="preview-link-row">${links.filter(Boolean).map((value, index) => isProbablyUrl(value)
        ? `<a class="preview-pill-link" href="${escapeHtml(resolveAssetUrl(value))}" target="_blank" rel="noreferrer">${escapeHtml(field?.label || type)} ${links.length > 1 ? index + 1 : ""}</a>`
        : `<span class="preview-muted">${escapeHtml(value)}</span>`).join("")}</div>`;
    }
    if (type === "list") {
      return values.length ? `<ul class="preview-bullet-list">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>` : "";
    }
    if (type === "date") {
      return `<p>${escapeHtml(formatDate(field?.value || "") || field?.value || "—")}</p>`;
    }
    return `<p>${formatMultilineHtml(field?.value || "—")}</p>`;
  }

  function renderCustomFields(fields) {
    const items = normalizeArray(fields).filter((field) => field?.label || field?.value);
    if (!items.length) return "";
    return `
      <div class="preview-custom-fields">
        ${items.map((field) => `
          <div class="preview-custom-field-item">
            <p><strong>${escapeHtml(field?.label || "Field")}:</strong></p>
            ${renderCustomFieldValue(field)}
          </div>
        `).join("")}
      </div>
    `;
  }

  function emptySuggestion(text) {
    return `<article class="preview-empty-card"><p>${escapeHtml(text)}</p></article>`;
  }

  function renderSectionShell(title, body, open = true, countText = "") {
    return `
      <section class="preview-section">
        <details class="preview-details" ${open ? "open" : ""}>
          <summary>
            <span>${escapeHtml(title)}</span>
            <span class="preview-summary-chip">${escapeHtml(countText || "Open")}</span>
          </summary>
          <div class="preview-section-body">${body}</div>
        </details>
      </section>
    `;
  }

  function renderCardsSection(title, items, renderer, emptyText) {
    const visible = visibleItems(items);
    const cards = visible.length ? visible.map(renderer).join("") : emptySuggestion(emptyText);
    return renderSectionShell(title, `<div class="preview-grid">${cards}</div>`, true, `${visible.length} item${visible.length === 1 ? "" : "s"}`);
  }

  function renderTextSection(sectionKey, title, items, emptyText) {
    return renderCardsSection(
      title,
      items,
      (item) => `<article class="preview-card"><h3>${escapeHtml(item.title || title)}</h3>${renderOrderedBlocks(sectionKey, { body: `<p>${escapeHtml(item.body || "")}</p>` }, renderCustomFields(item.customFields))}</article>`,
      emptyText
    );
  }

  let state;

  function renderProfileSection(state, user) {
    const profile = visibleItems(state.profile)[0] || {};
    const links = visibleItems(state.externalLinks);
    const name = profile.fullName || user?.displayName || user?.username || "Your name";
    const headline = profile.headline || "Add a short professional headline in Information Builder.";
    const description = profile.description || "This section is blank for now. Add your name, intro, and links on the Information page or hide this section from Portfolio Layout.";
    const avatar = resolveAssetUrl(profile.photoUrl || user?.avatarUrl || user?.avatarFileDataUrl || "");
    const initials = String(name || "Y").split(" ").map((item) => item[0]).join("").slice(0, 2).toUpperCase();

    const linkButtons = links.length
      ? `<div class="preview-link-row">${links.map((item) => {
          const value = item.type === "email" && !String(item.url).startsWith("mailto:") ? `mailto:${item.url}` : item.url;
          const label = item.label || item.type;
          return `<a class="preview-pill-link" href="${escapeHtml(resolveAssetUrl(value))}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`;
        }).join("")}</div>`
      : `<p class="preview-muted">No public links yet. Add GitHub, LinkedIn, email, or other common career links on the Information page.</p>`;

    return `
      <section class="preview-section preview-profile-section">
        <div class="preview-profile-card">
          <div class="preview-avatar-frame">
            ${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="preview-avatar-image" />` : `<span class="preview-avatar-fallback">${escapeHtml(initials)}</span>`}
          </div>
          <div class="preview-profile-copy">
            <p class="preview-kicker">Public portfolio</p>
            <h1>${escapeHtml(name)}</h1>
            ${renderOrderedBlocks("profile", {
              "headline": `<p class="preview-profile-headline">${escapeHtml(headline)}</p>`,
              "description": `<p class="preview-profile-description">${escapeHtml(description)}</p>`,
              "links": linkButtons,
            }, renderCustomFields(profile.customFields))}
          </div>
        </div>
      </section>
    `;
  }

  function renderResumeSection(state) {
    const resume = visibleItems(state.resume)[0];
    const body = resume
      ? `
        <article class="preview-card preview-resume-card">
          <div class="preview-card-head">
            <div>
              <p class="preview-kicker">Resume</p>
              <h3>${escapeHtml(resume.title || "Resume")}</h3>
              </div>
          </div>
          ${renderOrderedBlocks("resume", {
            "file-name": `<p class="preview-muted">${escapeHtml(resume.fileName || "Uploaded file")}</p>`,
            "actions": `<div class="preview-link-row">${isPdf(resume) ? `<a class="preview-pill-link" href="${escapeHtml(resolveAssetUrl(resume.fileUrl))}#toolbar=1" target="_blank" rel="noreferrer">View</a>` : ""}${resume.fileUrl ? `<a class="preview-pill-link" href="${escapeHtml(resolveAssetUrl(resume.fileUrl))}" target="_blank" rel="noreferrer">Open</a>` : ""}${resume.fileUrl ? `<a class="preview-pill-link" href="${escapeHtml(resolveAssetUrl(resume.fileUrl))}" download>Download</a>` : ""}</div>`,
            "note": resume.note ? `<p>${escapeHtml(resume.note)}</p>` : "",
            "preview": isPdf(resume) && resume.fileUrl ? `<div class="preview-resume-frame-wrap"><iframe class="preview-resume-frame" src="${escapeHtml(resume.fileUrl)}" title="Resume Preview"></iframe></div>` : "",
          }, renderCustomFields(resume.customFields))}
        </article>
      `
      : emptySuggestion("Resume section is empty. Upload a resume on the Information page or hide this section.");

    return renderSectionShell("Resume", body, true);
  }

  function absolutePublicPageHref(username, pageSlug) {
    const base = `${publicOrigin()}${shareBasePath}/${encodeURIComponent(username)}`;
    return pageSlug ? `${base}?page=${encodeURIComponent(pageSlug)}` : base;
  }

  function absoluteProjectPageHref(username, projectSlug, pageSlug = "") {
    const params = new URLSearchParams();
    if (pageSlug) params.set("page", pageSlug);
    const query = params.toString();
    return `${publicOrigin()}${shareBasePath}/${encodeURIComponent(username)}/project/${encodeURIComponent(projectSlug)}${query ? `?${query}` : ""}`;
  }

  function relativePreviewProjectHref(pageSlug, projectSlug) {
    const params = new URLSearchParams();
    if (pageSlug) params.set("page", pageSlug);
    if (projectSlug) params.set("project", projectSlug);
    const query = params.toString();
    return query ? `?${query}` : "?project=";
  }

  function renderProjectCard(project, user, pageSlug) {
    const display = normalizeProjectCardDisplay(project?.cardDisplay);
    const href = publicUsername
      ? absoluteProjectPageHref(publicUsername, project.projectSlug, pageSlug)
      : relativePreviewProjectHref(pageSlug, project.projectSlug);

    return `
      <article class="preview-card preview-project-card preview-project-card-link-shell">
        <a class="preview-stretched-link" href="${escapeHtml(href)}" aria-label="Open ${escapeHtml(project.title || "Project")} project page"></a>
        ${display.showCoverPhoto && project.coverPhotoUrl ? `<div class="preview-project-cover-link"><img class="preview-project-cover" src="${escapeHtml(resolveAssetUrl(project.coverPhotoUrl))}" alt="${escapeHtml(project.title || "Project cover")}" /></div>` : ""}
        <div class="preview-card-head">
          <div>
            <p class="preview-kicker">Project quick link</p>
            <h3>${escapeHtml(project.title || "Project")}</h3>
          </div>
          <div class="preview-link-row preview-project-card-actions">
            <span class="preview-summary-chip preview-project-card-chip">Opens full page</span>
            ${display.showLink && project.link ? `<a class="preview-pill-link preview-project-live-link" href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer">Live link</a>` : ""}
          </div>
        </div>
        ${display.showSubtitle && project.subtitle ? `<p class="preview-muted">${escapeHtml(project.subtitle)}</p>` : ""}
        ${display.showDescription && project.description ? `<p>${escapeHtml(project.description)}</p>` : ""}
        ${display.showSkills && project.skills ? `<p><strong>Skills:</strong> ${escapeHtml(project.skills)}</p>` : ""}
      </article>
    `;
  }

  function renderProjectsAsSeparateSections(state, user, pageSlug) {
    const projects = visibleItems(state.projects);
    if (!projects.length) {
      return renderSectionShell(
        "Projects",
        emptySuggestion("Add projects on the Information page or hide this section."),
        true,
        "0 items"
      );
    }

    return projects.map((project) => renderSectionShell(
      project.title || "Project",
      renderProjectCard(project, user, pageSlug),
      true,
      "Quick link"
    )).join("");
  }

  function renderProjectLayoutSection(section, state, user, pageSlug) {
    const project = findProjectByLayoutKey(state.projects, section?.key);
    if (!project || project.visible === false) {
      return renderSectionShell(
        section?.title || "Project",
        emptySuggestion("This project is hidden in Information Builder. Show it there or move another project into this spot."),
        true,
        "Hidden"
      );
    }

    return renderSectionShell(
      project.title || section?.title || "Project",
      renderProjectCard(project, user, pageSlug),
      true,
      "Quick link"
    );
  }

  function renderProjectPageSection(section) {
    const type = normalizeFieldType(section?.type, "text");
    const values = splitCustomFieldValue(section?.value || "");

    if (type === "image") {
      const media = values.length ? values : [section?.value || ""];
      return renderSectionShell(
        section?.title || "Media",
        `<div class="preview-project-media-grid">${media.filter(Boolean).map((value) => isProbablyUrl(value)
          ? `<img class="preview-project-detail-image" src="${escapeHtml(value)}" alt="${escapeHtml(section?.title || "Project image")}" />`
          : `<p>${escapeHtml(value)}</p>`).join("")}</div>`,
        true,
        "Media"
      );
    }

    if (["link", "video", "file"].includes(type)) {
      const links = values.length ? values : [section?.value || ""];
      return renderSectionShell(
        section?.title || "Links",
        `<div class="preview-link-row">${links.filter(Boolean).map((value, index) => isProbablyUrl(value)
          ? `<a class="preview-pill-link" href="${escapeHtml(resolveAssetUrl(value))}" target="_blank" rel="noreferrer">${escapeHtml(section?.title || "Link")} ${links.length > 1 ? index + 1 : ""}</a>`
          : `<span>${escapeHtml(value)}</span>`).join("")}</div>`,
        true,
        `${links.filter(Boolean).length} link${links.filter(Boolean).length === 1 ? "" : "s"}`
      );
    }

    if (type === "list") {
      return renderSectionShell(
        section?.title || "List",
        values.length ? `<ul class="preview-bullet-list">${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>` : `<p class="preview-muted">No items added.</p>`,
        true,
        `${values.length} item${values.length === 1 ? "" : "s"}`
      );
    }

    if (type === "date") {
      return renderSectionShell(section?.title || "Date", `<p>${escapeHtml(formatDate(section?.value || "") || section?.value || "—")}</p>`, true, "Date");
    }

    return renderSectionShell(section?.title || "Details", `<p>${formatMultilineHtml(section?.value || "—")}</p>`, true, "Open");
  }

  function renderProjectPage(project, state, user, selectedMenu) {
    const visibleSections = normalizeArray(project?.projectPageSections)
      .filter((section) => section?.visible !== false)
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const backHref = publicUsername
      ? absolutePublicPageHref(publicUsername, selectedMenu?.slug || state.portfolioMenuItems[0]?.slug || "home")
      : `?page=${encodeURIComponent(selectedMenu?.slug || state.portfolioMenuItems[0]?.slug || "home")}`;

    return `
      <main class="preview-main-shell">
        <section class="preview-project-hero-wrap">
          <article class="preview-project-hero-card preview-project-hero-card-minimal">
            <div class="preview-project-hero-copy">
              <a class="preview-inline-link preview-back-link" href="${escapeHtml(backHref)}">Back to portfolio</a>
              <p class="preview-kicker">Project page</p>
              <h1 class="preview-project-page-title">${escapeHtml(project?.title || "Project")}</h1>
              <p class="preview-project-page-subtitle">Every visible piece of project information appears below as its own dropdown card. Reorder or hide them from Information Builder.</p>
              <div class="preview-link-row">
                <span class="preview-project-skill-summary">${visibleSections.length} visible section${visibleSections.length === 1 ? "" : "s"}</span>
              </div>
            </div>
          </article>
        </section>
        ${visibleSections.length ? visibleSections.map((section) => renderProjectPageSection(section)).join("") : emptySuggestion("This project has no visible sections yet. Go back to Information Builder to turn some on.")}
      </main>
    `;
  }

  function renderSectionByKey(key, state, user, pageSlug) {
    if (key === "profile") return renderProfileSection(state, user);
    if (key === "resume") return renderResumeSection(state);
    if (key === "experience") {
      return renderCardsSection(
        "Work Experience",
        state.experience,
        (item) => `
          <article class="preview-card">
            <div class="preview-card-headline-row"><h3>${escapeHtml(item.role || "Role")}</h3></div>
            <p class="preview-muted">${escapeHtml(item.company || "")}${item.location ? ` · ${escapeHtml(item.location)}` : ""}</p>
            ${formatRange(item.startDate, item.endDate) ? `<p class="preview-muted">${escapeHtml(formatRange(item.startDate, item.endDate))}</p>` : ""}
            ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
            ${item.bullets?.length ? `<ul class="preview-bullet-list">${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
            ${renderCustomFields(item.customFields)}
          </article>
        `,
        "Add work experience on the Information page or hide this section."
      );
    }
    if (key === "leadership") {
      return renderCardsSection(
        "Leadership Experience",
        state.leadership,
        (item) => `
          <article class="preview-card">
            <h3>${escapeHtml(item.title || "Leadership")}</h3>
            <p class="preview-muted">${escapeHtml(item.organization || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>
            ${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}
            ${item.bullets?.length ? `<ul class="preview-bullet-list">${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}
            ${renderCustomFields(item.customFields)}
          </article>
        `,
        "Add leadership experience on the Information page or hide this section."
      );
    }
    if (isProjectLayoutKey(key)) return renderProjectLayoutSection({ key, title: findProjectByLayoutKey(state.projects, key)?.title || "Project" }, state, user, pageSlug);
    if (key === "projects") return renderProjectsAsSeparateSections(state, user, pageSlug);
    if (key === "organizations") {
      return renderCardsSection(
        "Organizations",
        state.organizations,
        (item) => `
          <article class="preview-card">
            <h3>${escapeHtml(item.name || "Organization")}</h3>
            <p class="preview-muted">${escapeHtml(item.role || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
            ${renderCustomFields(item.customFields)}
          </article>
        `,
        "Add organizations on the Information page or hide this section."
      );
    }
    if (key === "honors") {
      return renderCardsSection(
        "Honors and Awards",
        state.honors,
        (item) => `
          <article class="preview-card preview-stat-card">
            <p class="preview-stat-label">${escapeHtml(item.title || "Highlight")}</p>
            <h3 class="preview-stat-value">${escapeHtml(item.value || "—")}</h3>
            ${item.issuer || item.date ? `<p class="preview-muted">${escapeHtml(item.issuer || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>` : ""}
            ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
            ${renderCustomFields(item.customFields)}
          </article>
        `,
        "Add honors or awards on the Information page or hide this section."
      );
    }
    if (key === "licenses") {
      return renderCardsSection(
        "Licenses and Certificates",
        state.licenses,
        (item) => `
          <article class="preview-card">
            <h3>${escapeHtml(item.title || "Credential")}</h3>
            <p class="preview-muted">${escapeHtml(item.issuer || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>
            ${item.credentialId ? `<p><strong>Credential ID:</strong> ${escapeHtml(item.credentialId)}</p>` : ""}
            ${item.link ? `<a class="preview-inline-link" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">View credential</a>` : ""}
            ${renderCustomFields(item.customFields)}
          </article>
        `,
        "Add licenses or certificates on the Information page or hide this section."
      );
    }
    if (key === "contact") {
      const contact = visibleItems(state.contact)[0];
      const links = visibleItems(state.externalLinks);
      const fallbackLink = links.find((item) => item.type === "linkedin" || item.type === "email" || item.type === "github") || links[0];
      const method = contact?.preferredMethod || fallbackLink?.type || "email";
      const value = contact?.value || fallbackLink?.url || "";
      const href = method === "email" && value && !String(value).startsWith("mailto:") ? `mailto:${value}` : value;
      const body = value
        ? `
          <article class="preview-contact-card">
            <p class="preview-kicker">Preferred contact</p>
            <h3>Want to get in contact?</h3>
            ${renderOrderedBlocks("contact", {
              "note": `<p>${escapeHtml(contact?.note || "Reach out using the preferred method below.")}</p>`,
              "action": `<div class="preview-link-row"><a class="preview-contact-button" href="${escapeHtml(href)}" target="_blank" rel="noreferrer">${escapeHtml(contact?.label || `Contact via ${method}`)}</a></div>`,
              "value": `<p class="preview-muted">${escapeHtml(value)}</p>`,
            }, renderCustomFields(contact?.customFields))}
          </article>
        `
        : emptySuggestion("Choose a preferred contact method on the Information page or hide this section.");
      return renderSectionShell("Get in touch", body, true, value ? method : "Open");
    }
    if (key === "school") return renderCardsSection("School Development", state.school, (item) => `<article class="preview-card"><h3>${escapeHtml(item.title || "School Development")}</h3>${renderOrderedBlocks("school", {"prof-stage": `<p class="preview-muted">${escapeHtml(item.prof || "")}${item.stage ? ` · ${escapeHtml(item.stage)}` : ""}</p>`, "helped": item.helped ? `<p><strong>Helped with:</strong> ${escapeHtml(item.helped)}</p>` : "", "relevance": item.relevance ? `<p><strong>Relevance:</strong> ${escapeHtml(item.relevance)}</p>` : "", "notes": item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}, renderCustomFields(item.customFields))}</article>`, "Add school development content on the Information page or hide this section.");
    if (key === "about") return renderTextSection("about", "About / Story", state.about, "Add about content on the Information page or hide this section.");
    if (key === "looking") return renderTextSection("looking", "What I'm Looking For", state.looking, "Add looking-for content on the Information page or hide this section.");
    if (key === "pitch") return renderTextSection("pitch", "Pitch", state.pitch, "Add pitch content on the Information page or hide this section.");
    if (key === "timelineItems") {
      const items = [...visibleItems(state.timelineItems)].sort((a, b) => String(a.date || "9999-12-31").localeCompare(String(b.date || "9999-12-31")));
      return renderCardsSection("Timeline", items, (item) => `<article class="preview-card"><h3>${escapeHtml(item.title || "Timeline item")}</h3>${renderOrderedBlocks("timelineItems", {"date": `<p class="preview-muted">${escapeHtml(formatDate(item.date) || "")}</p>`, "description": item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}, renderCustomFields(item.customFields))}</article>`, "Add timeline entries on the Information page or hide this section.");
    }
    if (key === "recommendations") return renderCardsSection("Recommendations", state.recommendations, (item) => `<article class="preview-card"><h3>${escapeHtml(item.title || item.owner || "Recommendation")}</h3>${renderOrderedBlocks("recommendations", {"owner": item.owner ? `<p class="preview-muted">${escapeHtml(item.owner)}</p>` : "", "body": item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}, renderCustomFields(item.customFields))}</article>`, "Add recommendations on the Information page or hide this section.");
    if (key === "star") return renderCardsSection("STAR Moments", state.star, (item) => `<article class="preview-card"><h3>${escapeHtml(item.title || "STAR Example")}</h3>${renderOrderedBlocks("star", {"situation": `<p><strong>Situation:</strong> ${escapeHtml(item.situation || "—")}</p>`, "task": `<p><strong>Task:</strong> ${escapeHtml(item.task || "—")}</p>`, "action": `<p><strong>Action:</strong> ${escapeHtml(item.action || "—")}</p>`, "result": `<p><strong>Result:</strong> ${escapeHtml(item.result || "—")}</p>`}, renderCustomFields(item.customFields))}</article>`, "Add STAR moments on the Information page or hide this section.");
    return "";
  }

  async function copyShareLink(href) {
    const button = document.getElementById("preview-share-link-button");
    if (!button) return;
    try {
      await navigator.clipboard.writeText(href);
      const original = button.textContent;
      button.textContent = "Link copied";
      setTimeout(() => {
        button.textContent = original || "Share link";
      }, 1800);
    } catch {
      window.prompt("Copy this public portfolio link:", href);
    }
  }

  function renderPage(nextState, user) {
    state = nextState;
    const root = document.getElementById("career-portfolio-preview-root");
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const selectedSlug = params.get("page") || state.portfolioMenuItems[0]?.slug || "home";
    const selectedMenu = state.portfolioMenuItems.find((item) => item.slug === selectedSlug) || state.portfolioMenuItems[0];
    const selectedPageId = selectedMenu?.id || state.portfolioMenuItems[0]?.id || "main";
    const activeProjectSlug = initialProjectSlug || params.get("project") || "";
    const activeProject = visibleItems(state.projects).find((item) => item.projectSlug === activeProjectSlug);
    const canShare = Boolean(user?.username);
    const shareHref = canShare
      ? (activeProject
          ? absoluteProjectPageHref(user.username, activeProject.projectSlug, selectedMenu?.slug || "home")
          : absolutePublicPageHref(user.username, selectedMenu?.slug || "home"))
      : "";
    const displayName = visibleItems(state.profile)[0]?.fullName || user?.displayName || user?.username || "Portfolio";

    const nav = `
      <header class="preview-site-header">
        <div class="preview-site-header-inner">
          <div class="preview-site-brand">
            <p class="preview-kicker">${publicUsername ? (activeProject ? "Shared project page" : "Shared portfolio") : (activeProject ? "Project preview" : "Portfolio preview")}</p>
            <h1 class="preview-site-title">${escapeHtml(displayName)}</h1>
            <p class="preview-muted">A clean, public-facing portfolio view.</p>
          </div>
          <div class="preview-header-actions">
            ${canShare ? `<button id="preview-share-link-button" class="button-secondary" type="button">Copy share link</button>` : ""}
          </div>
        </div>
        <div class="preview-site-nav-wrap">
          <nav class="preview-nav">
            ${state.portfolioMenuItems.map((item) => {
              const href = publicUsername
                ? absolutePublicPageHref(publicUsername, item.slug)
                : `?page=${encodeURIComponent(item.slug)}`;
              return `<a class="preview-nav-link ${item.id === selectedPageId ? "active" : ""}" href="${escapeHtml(href)}">${escapeHtml(item.label)}</a>`;
            }).join("")}
          </nav>
        </div>
      </header>
    `;

    const content = activeProject
      ? renderProjectPage(activeProject, state, user, selectedMenu)
      : `
        <main class="preview-main-shell">
          ${[...state.portfolioSectionLayout]
            .filter((item) => item.enabled && item.pageId === selectedPageId)
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
            .map((item) => isProjectLayoutKey(item.key)
              ? renderProjectLayoutSection(item, state, user, selectedMenu?.slug || "home")
              : renderSectionByKey(item.key, state, user, selectedMenu?.slug || "home"))
            .join("") || emptySuggestion("No sections are assigned to this menu page yet. Go back to Portfolio Layout to move sections here.")}
        </main>
      `;

    root.innerHTML = `${nav}${content}`;

    if (canShare) {
      root.querySelector("#preview-share-link-button")?.addEventListener("click", () => copyShareLink(shareHref));
    }
  }

  async function init() {
    if (publicUsername) {
      const payload = await loadPublicState(publicUsername);
      renderPage(normalizeState(payload.state || {}), payload.user || { username: publicUsername, displayName: publicUsername });
      return;
    }

    const [savedState, user] = await Promise.all([loadPrivateState(), loadMe()]);
    renderPage(normalizeState(savedState || {}), user);
  }

  init();
}
