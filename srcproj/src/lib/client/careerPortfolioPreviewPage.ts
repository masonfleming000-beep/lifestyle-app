// @ts-nocheck
import { buildProjectPath, mergeProjectPageSections, normalizeProject } from "./careerProjectPresentation";

interface CareerPortfolioPreviewConfig {
  pageKey?: string;
  sectionTitles?: Record<string, string>;
  publicUsername?: string;
  shareBasePath?: string;
  publicAppUrl?: string;
  publicProjectSlug?: string;
}

export function initCareerPortfolioPreviewPage(config: CareerPortfolioPreviewConfig) {
  const pageKey = config.pageKey || "career-information";
  const publicUsername = String(config.publicUsername || "").trim();
  const shareBasePath = config.shareBasePath || "/portfolio";
  const publicAppUrl = String(config.publicAppUrl || "").trim();
  const staticProjectSlug = String(config.publicProjectSlug || "").trim();

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
    if (!publicAppUrl) return window.location.origin;
    try {
      return new URL(publicAppUrl).origin;
    } catch {
      return window.location.origin;
    }
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

    return {
      ...parsed,
      profile: normalizeArray(parsed.profile).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      externalLinks: normalizeArray(parsed.externalLinks).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      experience: normalizeArray(parsed.experience).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      leadership: normalizeArray(parsed.leadership).map((item) => ({ ...item, visible: normalizeBoolean(item?.visible, true) })),
      projects: normalizeArray(parsed.projects).map((item, index) => normalizeProject({ ...item, visible: normalizeBoolean(item?.visible, true) }, index)),
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
      portfolioSectionLayout: layout,
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

  function renderCustomFieldValue(field) {
    const type = normalizeFieldType(field?.type, "text");
    const values = splitCustomFieldValue(field?.value);
    if (type === "image") {
      const media = values.length ? values : [field?.value || ""];
      return `<div class="preview-link-row">${media.filter(Boolean).map((value) => isProbablyUrl(value)
        ? `<img src="${escapeHtml(value)}" alt="${escapeHtml(field?.label || "Image")}" style="width:100%;max-width:18rem;border-radius:0.9rem;border:1px solid rgba(15,23,42,0.08);object-fit:cover;" />`
        : `<p>${escapeHtml(value)}</p>`).join("")}</div>`;
    }
    if (["link", "video", "file"].includes(type)) {
      const links = values.length ? values : [field?.value || ""];
      return `<div class="preview-link-row">${links.filter(Boolean).map((value, index) => isProbablyUrl(value)
        ? `<a class="preview-pill-link" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(field?.label || type)} ${links.length > 1 ? index + 1 : ""}</a>`
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
    return `<div class="preview-custom-fields">${items.map((field) => `
      <div class="preview-custom-field-item">
        <p><strong>${escapeHtml(field?.label || "Field")}:</strong></p>
        ${renderCustomFieldValue(field)}
      </div>
    `).join("")}</div>`;
  }

  function emptySuggestion(text) {
    return `<article class="preview-empty-card"><p>${escapeHtml(text)}</p></article>`;
  }

  function renderSectionShell(title, body, open = true, countText = "") {
    return `<section class="preview-section"><details class="preview-details" ${open ? "open" : ""}><summary><span>${escapeHtml(title)}</span><span class="preview-summary-chip">${escapeHtml(countText || "Open")}</span></summary><div class="preview-section-body">${body}</div></details></section>`;
  }

  function renderCardsSection(title, items, renderer, emptyText) {
    const visible = visibleItems(items);
    const cards = visible.length ? visible.map(renderer).join("") : emptySuggestion(emptyText);
    return renderSectionShell(title, `<div class="preview-grid">${cards}</div>`, true, `${visible.length} item${visible.length === 1 ? "" : "s"}`);
  }

  function renderProfileSection(state, user) {
    const profile = visibleItems(state.profile)[0] || {};
    const links = visibleItems(state.externalLinks);
    const name = profile.fullName || user?.displayName || user?.username || "Your name";
    const headline = profile.headline || "Add a short professional headline in Information Builder.";
    const description = profile.description || "This section is blank for now. Add your name, intro, and links on the Information page or hide this section from Portfolio Layout.";
    const avatar = profile.photoUrl || user?.avatarUrl || user?.avatarFileDataUrl || "";
    const initials = String(name || "Y").split(" ").map((item) => item[0]).join("").slice(0, 2).toUpperCase();
    const linkButtons = links.length
      ? `<div class="preview-link-row">${links.map((item) => {
          const value = item.type === "email" && !String(item.url).startsWith("mailto:") ? `mailto:${item.url}` : item.url;
          return `<a class="preview-pill-link" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(item.label || item.type)}</a>`;
        }).join("")}</div>`
      : `<p class="preview-muted">No public links yet. Add GitHub, LinkedIn, email, or other common career links on the Information page.</p>`;

    return `<section class="preview-section preview-profile-section"><div class="preview-profile-card"><div class="preview-avatar-frame">${avatar ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(name)}" class="preview-avatar-image" />` : `<span class="preview-avatar-fallback">${escapeHtml(initials)}</span>`}</div><div class="preview-profile-copy"><p class="preview-kicker">Public portfolio</p><h1>${escapeHtml(name)}</h1><p class="preview-profile-headline">${escapeHtml(headline)}</p><p class="preview-profile-description">${escapeHtml(description)}</p>${linkButtons}${renderCustomFields(profile.customFields)}</div></div></section>`;
  }

  function renderResumeSection(state) {
    const resume = visibleItems(state.resume)[0];
    const body = resume ? `<article class="preview-card preview-resume-card"><div class="preview-card-head"><div><p class="preview-kicker">Resume</p><h3>${escapeHtml(resume.title || "Resume")}</h3><p class="preview-muted">${escapeHtml(resume.fileName || "Uploaded file")}</p></div><div class="preview-link-row">${isPdf(resume) ? `<a class="preview-pill-link" href="${escapeHtml(resume.fileUrl)}#toolbar=1" target="_blank" rel="noreferrer">View</a>` : ""}${resume.fileUrl ? `<a class="preview-pill-link" href="${escapeHtml(resume.fileUrl)}" target="_blank" rel="noreferrer">Open</a>` : ""}${resume.fileUrl ? `<a class="preview-pill-link" href="${escapeHtml(resume.fileUrl)}" download>Download</a>` : ""}</div></div>${resume.note ? `<p>${escapeHtml(resume.note)}</p>` : ""}${renderCustomFields(resume.customFields)}${isPdf(resume) && resume.fileUrl ? `<div class="preview-resume-frame-wrap"><iframe class="preview-resume-frame" src="${escapeHtml(resume.fileUrl)}" title="Resume Preview"></iframe></div>` : ""}</article>` : emptySuggestion("Resume section is empty. Upload a resume on the Information page or hide this section.");
    return renderSectionShell("Resume", body, true);
  }

  function projectHref(user, project) {
    if (!publicUsername) return `?project=${encodeURIComponent(project.slug)}`;
    const username = user?.username || publicUsername;
    if (!username) return `?project=${encodeURIComponent(project.slug)}`;
    return buildProjectPath(shareBasePath, username, project);
  }

  function renderProjectCard(item, user) {
    const href = projectHref(user, item);
    const display = item.cardDisplay || {};
    return `<a class="preview-card preview-project-link-card" href="${escapeHtml(href)}">${display.cover && item.coverImage ? `<div class="preview-project-cover-wrap"><img src="${escapeHtml(item.coverImage)}" alt="${escapeHtml(item.title || 'Project cover')}" class="preview-project-cover" /></div>` : ""}<div class="preview-project-copy"><h3>${escapeHtml(item.title || "Project")}</h3>${display.subtitle && item.subtitle ? `<p class="preview-muted">${escapeHtml(item.subtitle)}</p>` : ""}${display.description && item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${display.skills && item.skills ? `<p><strong>Skills:</strong> ${escapeHtml(item.skills)}</p>` : ""}${display.link && item.link ? `<div class="preview-link-row"><span class="preview-pill-link">Has external link</span></div>` : ""}<span class="preview-inline-link">Open project page →</span></div></a>`;
  }

  function renderSectionByKey(key, state, user) {
    if (key === "profile") return renderProfileSection(state, user);
    if (key === "resume") return renderResumeSection(state);
    if (key === "experience") return renderCardsSection("Work Experience", state.experience, (item) => `<article class="preview-card"><div class="preview-card-headline-row"><h3>${escapeHtml(item.role || "Role")}</h3></div><p class="preview-muted">${escapeHtml(item.company || "")}${item.location ? ` · ${escapeHtml(item.location)}` : ""}</p>${formatRange(item.startDate, item.endDate) ? `<p class="preview-muted">${escapeHtml(formatRange(item.startDate, item.endDate))}</p>` : ""}${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}${item.bullets?.length ? `<ul class="preview-bullet-list">${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}${renderCustomFields(item.customFields)}</article>`, "Add work experience on the Information page or hide this section.");
    if (key === "leadership") return renderCardsSection("Leadership Experience", state.leadership, (item) => `<article class="preview-card"><h3>${escapeHtml(item.title || "Leadership")}</h3><p class="preview-muted">${escapeHtml(item.organization || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>${item.summary ? `<p>${escapeHtml(item.summary)}</p>` : ""}${item.bullets?.length ? `<ul class="preview-bullet-list">${item.bullets.map((bullet) => `<li>${escapeHtml(bullet)}</li>`).join("")}</ul>` : ""}${renderCustomFields(item.customFields)}</article>`, "Add leadership experience on the Information page or hide this section.");
    if (key === "projects") return renderCardsSection("Projects", state.projects, (item) => renderProjectCard(item, user), "Add projects on the Information page or hide this section.");
    if (key === "organizations") return renderCardsSection("Organizations", state.organizations, (item) => `<article class="preview-card"><h3>${escapeHtml(item.name || "Organization")}</h3><p class="preview-muted">${escapeHtml(item.role || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${renderCustomFields(item.customFields)}</article>`, "Add organizations on the Information page or hide this section.");
    if (key === "honors") return renderCardsSection("Honors and Awards", state.honors, (item) => `<article class="preview-card preview-stat-card"><p class="preview-stat-label">${escapeHtml(item.title || "Highlight")}</p><h3 class="preview-stat-value">${escapeHtml(item.value || "—")}</h3>${item.issuer || item.date ? `<p class="preview-muted">${escapeHtml(item.issuer || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>` : ""}${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}${renderCustomFields(item.customFields)}</article>`, "Add honors or awards on the Information page or hide this section.");
    if (key === "licenses") return renderCardsSection("Licenses and Certificates", state.licenses, (item) => `<article class="preview-card"><h3>${escapeHtml(item.title || "Credential")}</h3><p class="preview-muted">${escapeHtml(item.issuer || "")}${item.date ? ` · ${escapeHtml(item.date)}` : ""}</p>${item.credentialId ? `<p><strong>Credential ID:</strong> ${escapeHtml(item.credentialId)}</p>` : ""}${item.link ? `<a class="preview-inline-link" href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">View credential</a>` : ""}${renderCustomFields(item.customFields)}</article>`, "Add licenses or certificates on the Information page or hide this section.");
    if (key === "contact") return renderCardsSection("Contact", state.contact, (item) => `<article class="preview-contact-card"><h3>${escapeHtml(item.label || "Contact")}</h3><p>${escapeHtml(item.note || "Reach out using the preferred method below.")}</p>${item.value ? `<a class="preview-contact-button" href="${escapeHtml(item.preferredMethod === 'email' && !String(item.value).startsWith('mailto:') ? `mailto:${item.value}` : item.value)}">${escapeHtml(item.value)}</a>` : ""}${renderCustomFields(item.customFields)}</article>`, "Add a contact call-to-action on the Information page or hide this section.");
    return "";
  }

  function currentPageSlug(state) {
    const params = new URLSearchParams(window.location.search);
    return params.get("page") || state.portfolioMenuItems[0]?.slug || "home";
  }

  function currentProjectSlug() {
    if (staticProjectSlug) return staticProjectSlug;
    const params = new URLSearchParams(window.location.search);
    return params.get("project") || "";
  }

  async function copyShareLink(href) {
    try {
      await navigator.clipboard.writeText(href);
      window.alert("Share link copied.");
    } catch {
      window.prompt("Copy this public portfolio link:", href);
    }
  }

  function renderProjectDetailSection(section, project) {
    if (section.key === "description") return project.description ? `<article class="preview-card"><p>${escapeHtml(project.description)}</p></article>` : "";
    if (section.key === "skills") return project.skills ? `<article class="preview-card"><p>${escapeHtml(project.skills)}</p></article>` : "";
    if (section.key === "link") return project.link ? `<article class="preview-card"><a class="preview-pill-link" href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer">Open live project</a></article>` : "";
    if (section.key === "subtitle") return project.subtitle ? `<article class="preview-card"><p>${escapeHtml(project.subtitle)}</p></article>` : "";
    const customField = normalizeArray(project.customFields).find((field, index) => `custom-${slugify(field?.key || field?.label || `field-${index + 1}`)}` === section.key);
    return customField ? `<article class="preview-card">${renderCustomFieldValue(customField)}</article>` : "";
  }

  function renderProjectPage(state, user, project) {
    const homeHref = `${shareBasePath}/${encodeURIComponent(user?.username || publicUsername)}?page=${encodeURIComponent(currentPageSlug(state))}`;
    const sections = mergeProjectPageSections(project).filter((item) => item.enabled !== false).map((section) => ({
      ...section,
      body: renderProjectDetailSection(section, project),
    })).filter((item) => item.body);

    const nav = `<header class="preview-site-header"><div class="preview-site-header-inner"><div class="preview-site-brand"><p class="preview-kicker">Project page</p><h1 class="preview-site-title">${escapeHtml(project.title || 'Project')}</h1><p class="preview-muted">${escapeHtml(project.subtitle || 'Project details')}</p></div><div class="preview-header-actions"><a class="button-secondary" href="${escapeHtml(homeHref)}">Back to portfolio</a></div></div></header>`;
    const hero = `<section class="preview-section preview-profile-section"> <div class="preview-profile-card preview-project-hero">${project.coverImage ? `<div class="preview-project-hero-media"><img src="${escapeHtml(project.coverImage)}" alt="${escapeHtml(project.title || 'Project cover')}" class="preview-project-cover" /></div>` : ''}<div class="preview-profile-copy"><p class="preview-kicker">Project</p><h1>${escapeHtml(project.title || 'Project')}</h1>${project.description ? `<p class="preview-profile-description">${escapeHtml(project.description)}</p>` : ''}${project.skills ? `<p><strong>Skills:</strong> ${escapeHtml(project.skills)}</p>` : ''}${project.link ? `<div class="preview-link-row"><a class="preview-pill-link" href="${escapeHtml(project.link)}" target="_blank" rel="noreferrer">Visit project</a></div>` : ''}</div></div></section>`;
    const body = sections.length ? sections.map((section) => renderSectionShell(section.title, section.body, true, section.key)).join('') : emptySuggestion('No visible project info cards yet. Configure them on the Portfolio Layout page.');
    return `${nav}<main class="preview-main-shell">${hero}${body}</main>`;
  }

  function renderPortfolioPage(state, user) {
    const root = document.getElementById("career-portfolio-preview-root");
    if (!root) return;
    const selectedSlug = currentPageSlug(state);
    const selectedPage = state.portfolioMenuItems.find((item) => item.slug === selectedSlug) || state.portfolioMenuItems[0] || defaultMenuItems()[0];
    const canShare = Boolean(user?.username || publicUsername);
    const publicHref = canShare ? `${publicOrigin()}${shareBasePath}/${encodeURIComponent(user?.username || publicUsername)}?page=${encodeURIComponent(selectedPage.slug)}` : "";

    const nav = `<header class="preview-site-header"><div class="preview-site-header-inner"><div class="preview-site-brand"><p class="preview-kicker">Shared portfolio</p><h1 class="preview-site-title">${escapeHtml(user?.displayName || user?.username || publicUsername || 'Portfolio')}</h1><p class="preview-muted">Public preview powered by your saved layout.</p></div><div class="preview-header-actions">${canShare ? `<button id="preview-share-link-button" class="button-secondary" type="button">Copy link</button>` : ''}</div></div><div class="preview-site-nav-wrap"><nav class="preview-nav">${state.portfolioMenuItems.map((item) => `<a class="preview-nav-link ${item.id === selectedPage.id ? 'active' : ''}" href="?page=${encodeURIComponent(item.slug)}">${escapeHtml(item.label)}</a>`).join('')}</nav></div></header>`;

    const sections = [...state.portfolioSectionLayout].filter((item) => item.enabled && item.pageId === selectedPage.id).sort((a,b) => Number(a.order || 0) - Number(b.order || 0)).map((item) => renderSectionByKey(item.key, state, user)).join("");
    root.innerHTML = `${nav}<main class="preview-main-shell">${sections || emptySuggestion('No sections are assigned to this menu page yet. Go back to Portfolio Layout to move sections here.')}</main>`;
    if (canShare) root.querySelector('#preview-share-link-button')?.addEventListener('click', () => copyShareLink(publicHref));
  }

  function renderPage(state, user) {
    const root = document.getElementById("career-portfolio-preview-root");
    if (!root) return;
    const projectSlug = currentProjectSlug();
    if (projectSlug) {
      const project = visibleItems(state.projects).find((item) => item.slug === projectSlug);
      root.innerHTML = project ? renderProjectPage(state, user, project) : `<main class="preview-main-shell">${emptySuggestion('That project page could not be found.')}</main>`;
      return;
    }
    renderPortfolioPage(state, user);
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
