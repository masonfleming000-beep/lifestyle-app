// @ts-nocheck
interface CareerPortfolioClientConfig {
  sourcePageKey: string;
  sectionOrder?: string[];
  sectionTitles?: Record<string, string>;
}

export function initCareerPortfolioPage(config: CareerPortfolioClientConfig) {
  const sourcePageKey = config.sourcePageKey || "career-information";

  const defaultData = {
    projects: [],
    school: [],
    experience: [],
    about: [],
    looking: [],
    pitch: [],
    stats: [],
    contact: [],
    resume: [],
    timelineItems: [],
    recommendations: [],
    star: [],
  };

  function cloneDefaults() {
    return JSON.parse(JSON.stringify(defaultData));
  }

  function normalizeBoolean(value, fallback = true) {
    return typeof value === "boolean" ? value : fallback;
  }

  function normalizeData(raw) {
    const parsed = raw && typeof raw === "object" ? raw : {};
    const timelineSource = Array.isArray(parsed.timelineItems)
      ? parsed.timelineItems
      : Array.isArray(parsed.timeline)
      ? parsed.timeline
      : [];

    return {
      ...cloneDefaults(),
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      school: Array.isArray(parsed.school) ? parsed.school : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      about: Array.isArray(parsed.about) ? parsed.about : [],
      looking: Array.isArray(parsed.looking) ? parsed.looking : [],
      pitch: Array.isArray(parsed.pitch) ? parsed.pitch : [],
      stats: Array.isArray(parsed.stats) ? parsed.stats : [],
      contact: Array.isArray(parsed.contact) ? parsed.contact : [],
      resume: Array.isArray(parsed.resume)
        ? parsed.resume.map((item) => ({
            id: item?.id || "",
            title: item?.title || "Resume",
            fileName: item?.fileName || "",
            fileType: item?.fileType || "",
            fileSize: Number(item?.fileSize || 0),
            fileUrl: item?.fileUrl || "",
            note: item?.note || "",
            visible: normalizeBoolean(item?.visible, true),
          }))
        : [],
      timelineItems: Array.isArray(timelineSource) ? timelineSource : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      star: Array.isArray(parsed.star) ? parsed.star : [],
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
      console.error("Failed to load portfolio source state:", error);
      return null;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function titleMap(section) {
    return config.sectionTitles?.[section] || section;
  }

  function visibleItems(data, section) {
    return (data[section] || []).filter((item) => item.visible);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr + "T00:00:00");
    if (Number.isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function isPdfResume(item) {
    return String(item?.fileType || "").toLowerCase().includes("pdf") ||
      String(item?.fileName || "").toLowerCase().endsWith(".pdf");
  }

  function renderSectionShell(title, subtitle, innerHtml, options = {}) {
    const kicker = options.kicker ? `<p class="kicker">${escapeHtml(options.kicker)}</p>` : "";
    const count = subtitle ? `<p class="section-subtitle">${escapeHtml(subtitle)}</p>` : "";

    return `
      <section class="section">
        <details class="dropdown-card expandable-section surface-dropdown portfolio-dropdown" open>
          <summary class="portfolio-summary">
            <div>
              ${kicker}
              <h2 class="section-title">${escapeHtml(title)}</h2>
              ${count}
            </div>
            <span class="dropdown-arrow">⌄</span>
          </summary>
          <div class="dropdown-content portfolio-body">
            ${innerHtml}
          </div>
        </details>
      </section>
    `;
  }

  function renderTextSection(title, items) {
    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="grid one">
          ${items
            .map(
              (item) => `
              <article class="card portfolio-entry-card">
                <h3 class="card-title">${escapeHtml(item.title || "")}</h3>
                ${item.subtitle ? `<p class="meta">${escapeHtml(item.subtitle)}</p>` : ""}
                ${item.body ? `<p>${escapeHtml(item.body)}</p>` : ""}
              </article>
            `
            )
            .join("")}
        </div>
      `
    );
  }

  function renderProjectLikeSection(title, items, type) {
    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="grid two portfolio-card-grid">
          ${items
            .map((item) => {
              if (type === "projects") {
                return `
                  <article class="card portfolio-entry-card">
                    <h3 class="card-title">${escapeHtml(item.title || "Untitled")}</h3>
                    <p class="meta">
                      ${escapeHtml(item.stage || "")}
                      ${item.timeline ? ` · ${escapeHtml(item.timeline)}` : ""}
                      ${item.completed ? ` · ${escapeHtml(item.completed)}` : ""}
                    </p>

                    ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}

                    <div class="entry-meta-grid">
                      ${item.impact ? `<div><strong>Impact:</strong> ${escapeHtml(item.impact)}</div>` : ""}
                      ${item.members ? `<div><strong>Members:</strong> ${escapeHtml(item.members)}</div>` : ""}
                      ${item.parts ? `<div><strong>Parts / Tools:</strong> ${escapeHtml(item.parts)}</div>` : ""}
                      ${item.specifications ? `<div><strong>Specs:</strong> ${escapeHtml(item.specifications)}</div>` : ""}
                    </div>

                    ${item.depth ? `<p><strong>Technical depth:</strong> ${escapeHtml(item.depth)}</p>` : ""}
                    ${item.issues ? `<p><strong>Issues:</strong> ${escapeHtml(item.issues)}</p>` : ""}
                    ${item.visuals ? `<p><strong>Visuals:</strong> ${escapeHtml(item.visuals)}</p>` : ""}
                    ${item.diagrams ? `<p><strong>Diagrams:</strong> ${escapeHtml(item.diagrams)}</p>` : ""}

                    ${item.link ? `<p><a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">Open link</a></p>` : ""}
                  </article>
                `;
              }

              if (type === "school") {
                return `
                  <article class="card portfolio-entry-card">
                    <h3 class="card-title">${escapeHtml(item.title || "School Item")}</h3>
                    <p class="meta">
                      ${escapeHtml(item.prof || "")}
                      ${item.stage ? ` · ${escapeHtml(item.stage)}` : ""}
                    </p>
                    ${item.helped ? `<p><strong>Helped with:</strong> ${escapeHtml(item.helped)}</p>` : ""}
                    ${item.relevance ? `<p><strong>Relevance:</strong> ${escapeHtml(item.relevance)}</p>` : ""}
                    ${item.notes ? `<p><strong>Notes:</strong> ${escapeHtml(item.notes)}</p>` : ""}
                  </article>
                `;
              }

              return `
                <article class="card portfolio-entry-card">
                  <h3 class="card-title">${escapeHtml(item.title || "Experience")}</h3>
                  <p class="meta">
                    ${escapeHtml(item.boss || "")}
                    ${item.date ? ` · ${escapeHtml(item.date)}` : ""}
                  </p>

                  ${item.impact ? `<p><strong>Impact:</strong> ${escapeHtml(item.impact)}</p>` : ""}
                  ${item.pictures ? `<p><strong>Pictures / visuals:</strong> ${escapeHtml(item.pictures)}</p>` : ""}

                  ${
                    Array.isArray(item.responsibilities) && item.responsibilities.length
                      ? `<ul class="list-clean">${item.responsibilities
                          .map((bullet) => `<li>${escapeHtml(bullet)}</li>`)
                          .join("")}</ul>`
                      : ""
                  }
                </article>
              `;
            })
            .join("")}
        </div>
      `,
      { kicker: type === "projects" ? "Showcase" : type === "experience" ? "Experience" : "Background" }
    );
  }

  function renderStatsSection(title, items) {
    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="metric-grid">
          ${items
            .map(
              (item) => `
              <article class="stat-card surface-section portfolio-stat-card">
                <div class="stat-card-top">
                  <p class="stat-card-label">${escapeHtml(item.title || "Stat")}</p>
                  <h3 class="stat-card-value">${escapeHtml(item.impact || "--")}</h3>
                </div>
                ${item.description ? `<p class="stat-card-description">${escapeHtml(item.description)}</p>` : ""}
              </article>
            `
            )
            .join("")}
        </div>
      `,
      { kicker: "Highlights" }
    );
  }

  function renderContactSection(title, items) {
    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="grid one">
          ${items
            .map(
              (item) => `
              <article class="card portfolio-entry-card">
                <h3 class="card-title">${escapeHtml(item.title || "Contact Info")}</h3>
                ${item.github ? `<p><strong>GitHub:</strong> ${escapeHtml(item.github)}</p>` : ""}
                ${item.email ? `<p><strong>Email:</strong> ${escapeHtml(item.email)}</p>` : ""}
                ${item.phone ? `<p><strong>Phone:</strong> ${escapeHtml(item.phone)}</p>` : ""}
                ${item.link ? `<p><strong>Link:</strong> <a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${escapeHtml(item.link)}</a></p>` : ""}
              </article>
            `
            )
            .join("")}
        </div>
      `,
      { kicker: "Connect" }
    );
  }

  function renderResumeSection(title, items) {
    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="grid one">
          ${items
            .map((item) => {
              const isPdf = isPdfResume(item);

              const actionRow = item.fileUrl
                ? `
                  <div class="resume-actions">
                    ${isPdf ? `<a href="${escapeHtml(item.fileUrl)}#toolbar=1" target="_blank" rel="noreferrer" class="button-secondary">View PDF</a>` : ""}
                    <a href="${escapeHtml(item.fileUrl)}" target="_blank" rel="noreferrer" class="button-primary">Open</a>
                    <a href="${escapeHtml(item.fileUrl)}" download="${escapeHtml(item.fileName || "resume")}" class="button-secondary">Download</a>
                  </div>
                `
                : "";

              const preview = isPdf && item.fileUrl
                ? `
                  <div class="resume-preview-wrap">
                    <iframe
                      src="${escapeHtml(item.fileUrl)}"
                      title="${escapeHtml(item.title || "Resume Preview")}"
                      class="resume-preview-frame"
                    ></iframe>
                  </div>
                `
                : item.fileUrl
                ? `<p class="section-subtitle">Inline preview is available for PDF resumes. Use Open or Download for this file.</p>`
                : `<p class="section-subtitle">No resume file available.</p>`;

              return `
                <article class="card portfolio-entry-card">
                  <h3 class="card-title">${escapeHtml(item.title || "Resume")}</h3>
                  ${item.fileName ? `<p><strong>File:</strong> ${escapeHtml(item.fileName)}</p>` : ""}
                  ${item.note ? `<p><strong>Note:</strong> ${escapeHtml(item.note)}</p>` : ""}
                  ${preview}
                  ${actionRow}
                </article>
              `;
            })
            .join("")}
        </div>
      `,
      { kicker: "Documents" }
    );
  }

  function renderTimelineSection(title, items) {
    const sorted = [...items].sort((a, b) => {
      const aDate = a.date || "9999-12-31";
      const bDate = b.date || "9999-12-31";
      return aDate.localeCompare(bDate);
    });

    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="timeline-list">
          ${sorted
            .map(
              (item) => `
              <article class="timeline-item">
                <div class="timeline-dot"></div>
                <div class="timeline-content card portfolio-entry-card">
                  <p class="timeline-date">${escapeHtml(formatDate(item.date))}</p>
                  <h3 class="card-title">${escapeHtml(item.title || "")}</h3>
                  ${item.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                </div>
              </article>
            `
            )
            .join("")}
        </div>
      `,
      { kicker: "Timeline" }
    );
  }

  function renderRecommendationsSection(title, items) {
    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="grid one">
          ${items
            .map(
              (item) => `
              <article class="quote-card surface-section portfolio-quote-card">
                <p class="quote-text">“${escapeHtml(item.body || item.title || "")}”</p>
                <span class="quote-author">${escapeHtml(item.owner || "Recommendation")}</span>
              </article>
            `
            )
            .join("")}
        </div>
      `,
      { kicker: "Recommendations" }
    );
  }

  function renderStarSection(title, items) {
    return renderSectionShell(
      title,
      `${items.length} selected item(s)`,
      `
        <div class="grid one">
          ${items
            .map(
              (item) => `
              <article class="card portfolio-entry-card">
                <h3 class="card-title">${escapeHtml(item.title || "STAR Entry")}</h3>
                <div class="star-grid">
                  <div><strong>Situation</strong><p>${escapeHtml(item.situation || "-")}</p></div>
                  <div><strong>Task</strong><p>${escapeHtml(item.task || "-")}</p></div>
                  <div><strong>Action</strong><p>${escapeHtml(item.action || "-")}</p></div>
                  <div><strong>Result</strong><p>${escapeHtml(item.result || "-")}</p></div>
                </div>
              </article>
            `
            )
            .join("")}
        </div>
      `,
      { kicker: "STAR" }
    );
  }

  function hasVisibleItems(data) {
    return Object.values(data).some(
      (arr) => Array.isArray(arr) && arr.some((item) => item.visible)
    );
  }

  function renderPortfolio(data) {
    const root = document.getElementById("portfolio-root");
    if (!root) return;

    let html = "";

    const renderers = {
      about: (items) => renderTextSection(titleMap("about"), items),
      looking: (items) => renderTextSection(titleMap("looking"), items),
      pitch: (items) => renderTextSection(titleMap("pitch"), items),
      projects: (items) => renderProjectLikeSection(titleMap("projects"), items, "projects"),
      school: (items) => renderProjectLikeSection(titleMap("school"), items, "school"),
      experience: (items) => renderProjectLikeSection(titleMap("experience"), items, "experience"),
      stats: (items) => renderStatsSection(titleMap("stats"), items),
      timelineItems: (items) => renderTimelineSection(titleMap("timelineItems"), items),
      recommendations: (items) => renderRecommendationsSection(titleMap("recommendations"), items),
      star: (items) => renderStarSection(titleMap("star"), items),
      contact: (items) => renderContactSection(titleMap("contact"), items),
      resume: (items) => renderResumeSection(titleMap("resume"), items),
    };

    const sections = config.sectionOrder || [
      "about",
      "looking",
      "pitch",
      "projects",
      "school",
      "experience",
      "stats",
      "timelineItems",
      "recommendations",
      "star",
      "contact",
      "resume",
    ];

    if (!hasVisibleItems(data)) {
      html = `
        <section class="section">
          <article class="empty-state-card portfolio-empty-card">
            <p class="kicker">Portfolio</p>
            <h2 class="section-title">Nothing selected yet</h2>
            <p>
              Go to <a href="/career/information">Career Information</a> and mark entries
              as visible in portfolio.
            </p>
          </article>
        </section>
      `;
      root.innerHTML = html;
      return;
    }

    sections.forEach((sectionKey) => {
      const items = visibleItems(data, sectionKey);
      if (!items.length) return;
      const renderer = renderers[sectionKey];
      if (!renderer) return;
      html += renderer(items);
    });

    root.innerHTML = html;
  }

  async function init() {
    const saved = await loadState();
    const data = normalizeData(saved);
    renderPortfolio(data);
  }

  init();
}
