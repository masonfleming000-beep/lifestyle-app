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

  const CUSTOM_FIELD_TYPES = [
    { value: "text", label: "Text" },
    { value: "textarea", label: "Long text" },
    { value: "number", label: "Number" },
    { value: "date", label: "Date" },
    { value: "list", label: "List" },
    { value: "link", label: "Link" },
    { value: "image", label: "Image" },
    { value: "video", label: "Video" },
    { value: "file", label: "File" },
  ];
  const CUSTOM_FIELD_TYPE_SET = new Set(CUSTOM_FIELD_TYPES.map((item) => item.value));
  const PROJECT_EXTRA_FIELD_OPTIONS = [
    { key: "date", label: "Date", type: "date" },
    { key: "status", label: "Status", type: "text" },
    { key: "type", label: "Type", type: "text" },
    { key: "team-members", label: "Team / Members", type: "list" },
    { key: "goal", label: "Goal", type: "textarea" },
    { key: "problem", label: "Problem", type: "textarea" },
    { key: "approach", label: "Approach", type: "textarea" },
    { key: "diagrams", label: "Diagrams", type: "image" },
    { key: "components", label: "Components", type: "list" },
    { key: "process", label: "Process", type: "textarea" },
    { key: "challenges", label: "Challenges", type: "textarea" },
    { key: "results", label: "Results", type: "textarea" },
    { key: "impact", label: "Impact", type: "textarea" },
    { key: "limitations", label: "Limitations", type: "textarea" },
    { key: "next-steps", label: "Next Steps", type: "textarea" },
    { key: "images", label: "Images", type: "image" },
    { key: "videos", label: "Videos", type: "video" },
    { key: "files", label: "Files", type: "file" },
  ];
  const PROJECT_EXTRA_FIELD_MAP = Object.fromEntries(PROJECT_EXTRA_FIELD_OPTIONS.map((item) => [item.key, item]));
  const PROJECT_CARD_DISPLAY_OPTIONS = [
    { key: "showCoverPhoto", label: "Cover photo" },
    { key: "showSubtitle", label: "Subtitle" },
    { key: "showDescription", label: "Description" },
    { key: "showSkills", label: "Skills" },
    { key: "showLink", label: "Link" },
  ];

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

  function projectSectionLabelFromKey(key) {
    const normalizedKey = String(key || "").trim();
    if (normalizedKey === "cover-photo") return "Cover Photo";
    if (normalizedKey === "subtitle") return "Subtitle";
    if (normalizedKey === "description") return "Description";
    if (normalizedKey === "skills") return "Skills";
    if (normalizedKey === "project-link") return "Project Link";
    if (normalizedKey.startsWith("field:")) {
      const projectField = PROJECT_EXTRA_FIELD_MAP[normalizedKey.replace(/^field:/, "")];
      return projectField?.label || normalizedKey.replace(/^field:/, "").replace(/-/g, " ");
    }
    return normalizedKey.replace(/-/g, " ");
  }

  function buildProjectPageSectionCandidates(project) {
    const fields = normalizeCustomFields(project?.customFields || project?.extraFields);
    const candidates = [];

    const addSection = (key, title, type, value) => {
      const textValue = type === "image" ? String(value || "").trim() : String(value || "").trim();
      if (!textValue) return;
      candidates.push({
        key,
        title,
        type: normalizeFieldType(type, type === "image" ? "image" : "text"),
        value: textValue,
      });
    };

    addSection("cover-photo", "Cover Photo", "image", project?.coverPhotoUrl || project?.image || project?.photoUrl || "");
    addSection("subtitle", "Subtitle", "text", project?.subtitle || "");
    addSection("description", "Description", "textarea", project?.description || "");
    addSection("skills", "Skills", "list", Array.isArray(project?.skills) ? project.skills.join("\n") : String(project?.skills || "").replace(/,\s*/g, "\n"));
    addSection("project-link", "Project Link", "link", project?.link || "");

    fields.forEach((field, index) => {
      const key = `field:${field?.key || index}`;
      if (!String(field?.value || "").trim()) return;
      candidates.push({
        key,
        title: field?.label || projectSectionLabelFromKey(key),
        type: normalizeFieldType(field?.type, "text"),
        value: Array.isArray(field?.value) ? field.value.filter(Boolean).join("\n") : String(field?.value || ""),
        fieldId: field?.id || `field-${index}`,
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
          id: existing?.id || makeId(`project-section-${candidate.key || index}`),
          key: candidate.key,
          title: candidate.title,
          type: candidate.type,
          value: candidate.value,
          fieldId: candidate.fieldId || existing?.fieldId || "",
          visible: normalizeBoolean(existing?.visible, true),
          order: Number.isFinite(Number(existing?.order)) ? Number(existing.order) : index,
        };
      })
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((section, index) => ({ ...section, order: index }));
  }

  function projectSectionPreviewValue(section) {
    const type = normalizeFieldType(section?.type, "text");
    if (type === "image") return String(section?.value || "").trim() ? "Image set" : "Empty";
    if (type === "list") return splitCustomFieldValue(section?.value || "").slice(0, 2).join(", ") || "Empty";
    return String(section?.value || "").trim().slice(0, 60) || "Empty";
  }

  function normalizeFieldType(value, fallback = "text") {
    const next = String(value || "").trim().toLowerCase();
    return CUSTOM_FIELD_TYPE_SET.has(next) ? next : fallback;
  }

  function normalizeCustomFields(fields) {
    return normalizeArray(fields).map((field, index) => {
      const rawLabel = String(field?.label || field?.name || field?.title || "").trim();
      const rawKey = String(field?.key || "").trim();
      const key = slugify(rawKey || rawLabel || `field-${index + 1}`);
      const preset = PROJECT_EXTRA_FIELD_MAP[key];
      const value = Array.isArray(field?.value)
        ? field.value.filter(Boolean).join("\n")
        : String(field?.value || "");
      return {
        id: field?.id || makeId(`field-${key || index}`),
        key: key || `field-${index + 1}`,
        label: rawLabel || preset?.label || `Field ${index + 1}`,
        type: normalizeFieldType(field?.type, preset?.type || "text"),
        value,
      };
    }).filter((field) => field.label || field.value);
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

  function customFieldTypeOptions(selectedType) {
    const type = normalizeFieldType(selectedType, "text");
    return CUSTOM_FIELD_TYPES.map((item) => `<option value="${item.value}" ${item.value === type ? "selected" : ""}>${item.label}</option>`).join("\n");
  }

  function customFieldPlaceholder(type) {
    if (type === "date") return "Select a date";
    if (type === "number") return "Enter a number";
    if (type === "list") return "One item per line";
    if (type === "link") return "Paste one link per line";
    if (type === "image") return "Upload image files";
    if (type === "video") return "Upload video files";
    if (type === "file") return "Upload files";
    if (type === "textarea") return "Enter details";
    return "Enter value";
  }

  function customFieldUploadAccept(type) {
    if (type === "image") return "image/png,image/jpeg,image/webp,image/gif";
    if (type === "video") return "video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogg,.mov";
    if (type === "file") return ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.rtf,.odt,.zip,.rar,.7z,.json,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/rtf,application/vnd.oasis.opendocument.text,application/zip,application/x-zip-compressed,application/json,text/markdown";
    return "";
  }

  function customFieldUploadButtonLabel(type) {
    if (type === "image") return "Upload image";
    if (type === "video") return "Upload video";
    if (type === "file") return "Upload file";
    return "Upload";
  }

  function fileNameFromValue(value) {
    const text = String(value || "").trim();
    if (!text) return "File";
    if (!isProbablyUrl(text)) return text;
    try {
      const url = new URL(text, window.location.origin);
      const last = url.pathname.split("/").filter(Boolean).pop() || "file";
      return decodeURIComponent(last);
    } catch (_error) {
      const cleaned = text.split("?")[0].split("#")[0];
      return cleaned.split("/").filter(Boolean).pop() || "file";
    }
  }

  function buildCustomFieldUploadItems(type, rawValue, label) {
    const values = splitCustomFieldValue(rawValue || "");
    if (!values.length) {
      return '<p class="field-hint custom-field-upload-empty">No uploads added yet.</p>';
    }

    return `
      <div class="custom-field-upload-list custom-field-upload-list-${escapeHtml(type)}">
        ${values.map((value, index) => {
          const safeValue = escapeHtml(value);
          const safeLabel = escapeHtml(label || customFieldUploadButtonLabel(type));
          if (type === "image") {
            return `
              <div class="custom-field-upload-item custom-field-upload-item-image">
                ${isProbablyUrl(value)
                  ? `<img class="custom-field-upload-preview custom-field-upload-preview-image" src="${safeValue}" alt="${safeLabel}" />`
                  : `<p>${safeValue}</p>`}
                <button type="button" class="button-secondary career-inline-button career-inline-button-mini" data-action="remove-custom-field-asset" data-asset-index="${index}">Remove</button>
              </div>
            `;
          }
          if (type === "video") {
            return `
              <div class="custom-field-upload-item custom-field-upload-item-video">
                ${isProbablyUrl(value)
                  ? `<video class="custom-field-upload-preview custom-field-upload-preview-video" src="${safeValue}" controls preload="metadata"></video>`
                  : `<p>${safeValue}</p>`}
                <div class="custom-field-upload-meta-row">
                  <span class="field-hint">${escapeHtml(fileNameFromValue(value))}</span>
                  <button type="button" class="button-secondary career-inline-button career-inline-button-mini" data-action="remove-custom-field-asset" data-asset-index="${index}">Remove</button>
                </div>
              </div>
            `;
          }
          return `
            <div class="custom-field-upload-item custom-field-upload-item-file">
              <div>
                <p class="custom-field-upload-file-name">${escapeHtml(fileNameFromValue(value))}</p>
                ${isProbablyUrl(value) ? `<a class="button-secondary career-inline-button career-inline-button-mini" href="${safeValue}" target="_blank" rel="noreferrer">Open</a>` : ""}
              </div>
              <button type="button" class="button-secondary career-inline-button career-inline-button-mini" data-action="remove-custom-field-asset" data-asset-index="${index}">Remove</button>
            </div>
          `;
        }).join("\n")}
      </div>
    `;
  }

  function buildCustomFieldValueControl(field) {
    const type = normalizeFieldType(field?.type, "text");
    const rawValue = String(field?.value || "");
    const value = escapeHtml(rawValue);
    const label = type === "link" || type === "image" || type === "video" || type === "file" ? "Value" : "Value";

    if (type === "image" || type === "video" || type === "file") {
      return `
        <div class="custom-field-upload-wrap dynamic-form-full">
          <label class="edu-label dynamic-form-full">
            <span>${escapeHtml(customFieldUploadButtonLabel(type))} (one or more)</span>
            <input data-role="field-upload-input" type="file" class="form-input" accept="${escapeHtml(customFieldUploadAccept(type))}" multiple />
          </label>
          <div class="custom-field-upload-toolbar">
            <button type="button" class="button-secondary career-inline-button career-inline-button-mini" data-action="upload-custom-field-files">${escapeHtml(customFieldUploadButtonLabel(type))}</button>
            <span class="field-hint">Uploaded ${escapeHtml(type)} assets will be saved into this field and shown in portfolio preview.</span>
          </div>
          <textarea data-role="field-value" class="custom-field-hidden-value" aria-hidden="true" tabindex="-1">${value}</textarea>
          ${buildCustomFieldUploadItems(type, rawValue, field?.label || type)}
        </div>
      `;
    }

    if (type === "textarea" || type === "list" || type === "link") {
      return `
        <label class="edu-label dynamic-form-full">
          <span>${label}</span>
          <textarea data-role="field-value" class="form-textarea" placeholder="${escapeHtml(customFieldPlaceholder(type))}">${value}</textarea>
        </label>
      `;
    }
    return `
      <label class="edu-label dynamic-form-full">
        <span>${label}</span>
        <input data-role="field-value" type="${type === "date" || type === "number" ? type : "text"}" class="form-input" value="${value}" placeholder="${escapeHtml(customFieldPlaceholder(type))}" />
      </label>
    `;
  }

  function buildCustomFieldCard(field) {
    const normalized = normalizeCustomFields([field])[0] || {
      id: makeId("field"),
      key: slugify(field?.key || field?.label || "field"),
      label: field?.label || "",
      type: normalizeFieldType(field?.type, "text"),
      value: String(field?.value || ""),
    };
    return `
      <div class="custom-field-card" data-custom-field-id="${escapeHtml(normalized.id)}" data-field-key="${escapeHtml(normalized.key)}">
        <div class="custom-field-card-top">
          <label class="edu-label">
            <span>Field name</span>
            <input data-role="field-label" class="form-input" value="${escapeHtml(normalized.label)}" placeholder="Field label" />
          </label>
          <label class="edu-label">
            <span>Data type</span>
            <select data-role="field-type" class="form-input">${customFieldTypeOptions(normalized.type)}</select>
          </label>
          <div class="custom-field-remove-wrap">
            <button type="button" class="button-secondary career-inline-button career-inline-button-mini" data-action="remove-custom-field">Remove</button>
          </div>
        </div>
        <div data-role="field-value-wrap">
          ${buildCustomFieldValueControl(normalized)}
        </div>
      </div>
    `;
  }

  function availableProjectExtraFields(selectedKeys = []) {
    const selected = new Set(selectedKeys);
    return PROJECT_EXTRA_FIELD_OPTIONS.filter((item) => !selected.has(item.key));
  }

  function buildCustomFieldsManager(group, fields = []) {
    const normalizedFields = normalizeCustomFields(fields);
    const availableOptions = group === "projects"
      ? availableProjectExtraFields(normalizedFields.map((field) => field.key))
      : [];
    return `
      <div class="custom-field-manager" data-custom-field-group="${escapeHtml(group)}">
        <div class="custom-field-toolbar">
          <div>
            <p class="field-hint custom-field-helper">${escapeHtml(group === "projects"
              ? "Default project inputs stay the same. Add any extra project field or a fully custom field below, and it will carry into the portfolio preview."
              : "Add a custom field if you want to save extra information like links, files, images, videos, lists, or notes for this section.")}</p>
          </div>
          <div class="custom-field-toolbar-actions">
            ${group === "projects" ? `
              <select class="form-input custom-field-picker" data-role="project-field-picker">
                ${availableOptions.length
                  ? availableOptions.map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`).join("\n")
                  : `<option value="">All extra project fields already added</option>`}
              </select>
              <button type="button" class="button-secondary career-inline-button" data-action="add-project-field">Add field</button>
            ` : ""}
            <button type="button" class="button-secondary career-inline-button" data-action="add-custom-field">${group === "projects" ? "Add custom field" : "Add field"}</button>
          </div>
        </div>
        <div class="custom-field-list" data-custom-field-list>
          ${normalizedFields.length ? normalizedFields.map((field) => buildCustomFieldCard(field)).join("\n") : `<p class="field-hint custom-field-empty">No extra fields added yet.</p>`}
        </div>
      </div>
    `;
  }

  function renderCustomFieldValue(field) {
    const type = normalizeFieldType(field?.type, "text");
    const values = splitCustomFieldValue(field?.value);
    if (type === "image") {
      const media = values.length ? values : [field?.value || ""];
      return `
        <div class="custom-field-media-grid">
          ${media.filter(Boolean).map((value) => isProbablyUrl(value)
            ? `<img class="custom-field-media" src="${escapeHtml(value)}" alt="${escapeHtml(field?.label || "Image")}" />`
            : `<p>${escapeHtml(value)}</p>`).join("\n")}
        </div>
      `;
    }
    if (type === "video") {
      const media = values.length ? values : [field?.value || ""];
      return `
        <div class="custom-field-media-grid">
          ${media.filter(Boolean).map((value) => isProbablyUrl(value)
            ? `<video class="custom-field-media custom-field-video" src="${escapeHtml(value)}" controls preload="metadata"></video>`
            : `<p>${escapeHtml(value)}</p>`).join("\n")}
        </div>
      `;
    }
    if (type === "file") {
      const links = values.length ? values : [field?.value || ""];
      return `
        <div class="custom-field-media-grid custom-field-file-grid">
          ${links.filter(Boolean).map((value, index) => isProbablyUrl(value)
            ? `<div class="custom-field-file-card"><p class="custom-field-upload-file-name">${escapeHtml(fileNameFromValue(value))}</p><a class="button-secondary career-inline-button career-inline-button-mini" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(field?.label || type)} ${links.length > 1 ? index + 1 : ""}</a></div>`
            : `<span>${escapeHtml(value)}</span>`).join("\n")}
        </div>
      `;
    }
    if (type === "link") {
      const links = values.length ? values : [field?.value || ""];
      return `
        <div class="resume-link-row">
          ${links.filter(Boolean).map((value, index) => isProbablyUrl(value)
            ? `<a class="button-secondary career-inline-button career-inline-button-mini" href="${escapeHtml(value)}" target="_blank" rel="noreferrer">${escapeHtml(field?.label || type)} ${links.length > 1 ? index + 1 : ""}</a>`
            : `<span>${escapeHtml(value)}</span>`).join("\n")}
        </div>
      `;
    }
    if (type === "list") {
      return buildBullets(values);
    }
    if (type === "date") {
      return `<p>${escapeHtml(formatDate(field?.value || "") || field?.value || "—")}</p>`;
    }
    if (type === "textarea") {
      return `<p>${formatMultilineHtml(field?.value || "—")}</p>`;
    }
    return `<p>${formatMultilineHtml(field?.value || "—")}</p>`;
  }

  function buildCustomFieldsBlock(fields) {
    const normalized = normalizeCustomFields(fields);
    if (!normalized.length) return "";
    return `
      <div class="custom-field-output">
        ${normalized.map((field) => `
          <div class="custom-field-output-item">
            <p><strong>${escapeHtml(field.label || "Field")}:</strong></p>
            ${renderCustomFieldValue(field)}
          </div>
        `).join("\n")}
      </div>
    `;
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
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      externalLinks: normalizeArray(parsed.externalLinks).map((item) => ({
        id: item?.id || makeId("link"),
        type: item?.type || "website",
        label: item?.label || "",
        url: item?.url || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
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
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      leadership: normalizeArray(parsed.leadership).map((item) => ({
        id: item?.id || makeId("leadership"),
        title: item?.title || "",
        organization: item?.organization || "",
        date: item?.date || "",
        summary: item?.summary || "",
        bullets: Array.isArray(item?.bullets) ? item.bullets.filter(Boolean) : splitLines(item?.bullets),
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      projects: normalizeArray(parsed.projects).map((item) => {
        const customFields = normalizeCustomFields(item?.customFields || item?.extraFields);
        const project = {
          id: item?.id || makeId("project"),
          title: item?.title || "",
          subtitle: item?.subtitle || item?.stage || "",
          description: item?.description || "",
          skills: Array.isArray(item?.skills) ? item.skills.filter(Boolean).join(", ") : item?.skills || item?.parts || "",
          link: item?.link || "",
          coverPhotoUrl: item?.coverPhotoUrl || item?.image || item?.photoUrl || "",
          projectSlug: slugify(item?.projectSlug || item?.slug || item?.title || item?.id || "project"),
          visible: normalizeBoolean(item?.visible, true),
          cardDisplay: normalizeProjectCardDisplay(item?.cardDisplay),
          customFields,
        };
        return {
          ...project,
          projectPageSections: syncProjectPageSections({ ...project, projectPageSections: item?.projectPageSections || item?.pageSections }),
        };
      }),
      organizations: normalizeArray(parsed.organizations).map((item) => ({
        id: item?.id || makeId("organization"),
        name: item?.name || item?.title || "",
        role: item?.role || "",
        date: item?.date || "",
        description: item?.description || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      honors: normalizeArray(parsed.honors || parsed.stats).map((item) => ({
        id: item?.id || makeId("honor"),
        title: item?.title || "",
        value: item?.value || item?.impact || "",
        issuer: item?.issuer || "",
        date: item?.date || "",
        description: item?.description || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      licenses: normalizeArray(parsed.licenses).map((item) => ({
        id: item?.id || makeId("license"),
        title: item?.title || "",
        issuer: item?.issuer || "",
        date: item?.date || "",
        credentialId: item?.credentialId || "",
        link: item?.link || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      contact: normalizeArray(parsed.contact).slice(0, 1).map((item) => ({
        id: item?.id || makeId("contact"),
        preferredMethod: item?.preferredMethod || item?.title || "email",
        value: item?.value || item?.email || item?.link || item?.phone || "",
        label: item?.label || "",
        note: item?.note || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
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
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
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
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      about: normalizeArray(parsed.about).map((item) => ({
        id: item?.id || makeId("about"),
        title: item?.title || "About Me",
        body: item?.body || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      looking: normalizeArray(parsed.looking).map((item) => ({
        id: item?.id || makeId("looking"),
        title: item?.title || "What I'm Looking For",
        body: item?.body || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      pitch: normalizeArray(parsed.pitch).map((item) => ({
        id: item?.id || makeId("pitch"),
        title: item?.title || "Pitch",
        body: item?.body || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      timelineItems: normalizeArray(parsed.timelineItems || parsed.timeline).map((item) => ({
        id: item?.id || makeId("timeline"),
        title: item?.title || "",
        date: item?.date || "",
        description: item?.description || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      recommendations: normalizeArray(parsed.recommendations).map((item) => ({
        id: item?.id || makeId("recommendation"),
        title: item?.title || "",
        body: item?.body || "",
        owner: item?.owner || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
      })),
      star: normalizeArray(parsed.star).map((item) => ({
        id: item?.id || makeId("star"),
        title: item?.title || "",
        situation: item?.situation || "",
        task: item?.task || "",
        action: item?.action || "",
        result: item?.result || "",
        visible: normalizeBoolean(item?.visible, true),
        customFields: normalizeCustomFields(item?.customFields || item?.extraFields),
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

  async function uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/upload-avatar", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new Error(payload?.error || `Upload failed (${res.status})`);
    return payload;
  }

  async function uploadCareerAsset(file, kind = "file") {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("kind", kind);
    const res = await fetch("/api/upload-career-asset", {
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
      "Shown at the top of the portfolio preview. Upload a dedicated professional photo here to override the account avatar in portfolio preview.",
      `
        <div class="dynamic-form-grid one">
          <label class="edu-label"><span>Full name</span><input id="dynamic-profile-fullName" class="form-input" value="${escapeHtml(item.fullName || "")}" placeholder="Your public name" /></label>
          <label class="edu-label"><span>Headline</span><input id="dynamic-profile-headline" class="form-input" value="${escapeHtml(item.headline || "")}" placeholder="Product Designer · CS Student · Software Engineer" /></label>
          <label class="edu-label"><span>Professional photo upload (optional)</span><input id="dynamic-profile-photoFile" class="form-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
          <label class="edu-label"><span>Professional photo URL (optional)</span><input id="dynamic-profile-photoUrl" class="form-input" value="${escapeHtml(item.photoUrl || "")}" placeholder="https://... or leave blank if uploading" /></label>
          ${item.photoUrl ? `<div class="portfolio-inline-preview"><span class="field-hint">Current professional photo</span><div class="portfolio-inline-photo-frame"><img src="${escapeHtml(item.photoUrl)}" alt="Professional portfolio photo" class="portfolio-inline-photo" /></div></div>` : `<p class="field-hint">No professional portfolio photo uploaded yet. If left blank, preview falls back to your account avatar.</p>`}
          <label class="edu-label"><span>Description</span><textarea id="dynamic-profile-description" class="form-textarea" placeholder="Short intro for your portfolio">${escapeHtml(item.description || "")}</textarea></label>
          <label class="check-row"><input id="dynamic-profile-visible" type="checkbox" ${item.visible !== false ? "checked" : ""} /><span>Show in portfolio</span></label>
        </div>
        ${buildCustomFieldsManager("profile", item.customFields)}
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
        ${buildCustomFieldsManager("externalLinks")}
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
        ${buildCustomFieldsManager("experience")}
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
        ${buildCustomFieldsManager("leadership")}
      `,
      "dynamic-save-leadership-btn",
      "Save Leadership Experience"
    );
  }

  function buildProjectsForm() {
    return formShell(
      "Use this for featured portfolio projects. The project card can show a subset of the content, while the project page can reveal each section in its own dropdown.",
      `
        <div class="dynamic-form-grid">
          <label class="edu-label"><span>Project title</span><input id="dynamic-project-title" class="form-input" placeholder="Project name" /></label>
          <label class="edu-label"><span>Subtitle / stage</span><input id="dynamic-project-subtitle" class="form-input" placeholder="Capstone · Shipped · Ongoing" /></label>
          <label class="edu-label dynamic-form-full"><span>Description</span><textarea id="dynamic-project-description" class="form-textarea" placeholder="What the project is and what it achieved"></textarea></label>
          <label class="edu-label"><span>Skills / stack</span><input id="dynamic-project-skills" class="form-input" placeholder="Astro, React, Figma, Python" /></label>
          <label class="edu-label"><span>Project link</span><input id="dynamic-project-link" class="form-input" placeholder="https://..." /></label>
          <label class="edu-label dynamic-form-full"><span>Cover photo upload</span><input id="dynamic-project-cover-file" class="form-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" /></label>
          <p class="field-hint dynamic-form-full">Upload a cover image here so the project quick link and project page can frame it automatically.</p>
          <fieldset class="project-card-toggle-group dynamic-form-full">
            <legend>Show on portfolio project card</legend>
            <div class="project-card-toggle-grid">
              ${PROJECT_CARD_DISPLAY_OPTIONS.map((option) => `
                <label class="check-row compact">
                  <input id="dynamic-project-card-${option.key}" type="checkbox" checked />
                  <span>${option.label}</span>
                </label>
              `).join("\n")}
            </div>
          </fieldset>
          <label class="check-row dynamic-form-full"><input id="dynamic-project-visible" type="checkbox" checked /><span>Show in portfolio</span></label>
        </div>
        ${buildCustomFieldsManager("projects")}
        <div class="project-form-note">
          <p><strong>After saving:</strong> each project gets its own portfolio section, a dedicated project page, and a saved section manager below where you can move project-page sections up or down or hide them.</p>
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
        ${buildCustomFieldsManager("organizations")}
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
        ${buildCustomFieldsManager("honors")}
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
        ${buildCustomFieldsManager("licenses")}
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
        ${buildCustomFieldsManager("contact", item.customFields)}
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
        ${buildCustomFieldsManager("resume", item.customFields)}
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
        ${buildCustomFieldsManager("school")}
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
        ${buildCustomFieldsManager(prefix)}
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
        ${buildCustomFieldsManager("timelineItems")}
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
        ${buildCustomFieldsManager("recommendations")}
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
        ${buildCustomFieldsManager("star")}
      `,
      "dynamic-save-star-btn",
      "Save STAR Example"
    );
  }


  function createPresetProjectField(key) {
    const preset = PROJECT_EXTRA_FIELD_MAP[key];
    if (!preset) return null;
    return {
      id: makeId(`field-${preset.key}`),
      key: preset.key,
      label: preset.label,
      type: preset.type,
      value: "",
    };
  }

  function createCustomField(group) {
    const defaultType = group === "about" || group === "looking" || group === "pitch" ? "textarea" : "text";
    return {
      id: makeId("field"),
      key: makeId(`field-${group}`),
      label: "",
      type: defaultType,
      value: "",
    };
  }

  function refreshCustomFieldEmptyState(manager) {
    const list = manager?.querySelector("[data-custom-field-list]");
    if (!list) return;
    const hasCards = !!list.querySelector(".custom-field-card");
    const empty = list.querySelector(".custom-field-empty");
    if (!hasCards && !empty) {
      list.innerHTML = '<p class="field-hint custom-field-empty">No extra fields added yet.</p>';
    }
    if (hasCards && empty) {
      empty.remove();
    }
  }

  function refreshProjectFieldPicker(manager) {
    const picker = manager?.querySelector('[data-role="project-field-picker"]');
    if (!picker) return;
    const selectedKeys = [...manager.querySelectorAll('.custom-field-card')].map((card) => String(card.getAttribute('data-field-key') || '').trim()).filter(Boolean);
    const options = availableProjectExtraFields(selectedKeys);
    picker.innerHTML = options.length
      ? options.map((item) => `<option value="${escapeHtml(item.key)}">${escapeHtml(item.label)}</option>`).join("\n")
      : '<option value="">All extra project fields already added</option>';
    picker.disabled = !options.length;
  }

  function updateCustomFieldValueWrap(card, type, nextValue) {
    const wrap = card?.querySelector('[data-role="field-value-wrap"]');
    if (!wrap) return;
    const previousValue = card.querySelector('[data-role="field-value"]')?.value || "";
    const label = card.querySelector('[data-role="field-label"]')?.value || "";
    wrap.innerHTML = buildCustomFieldValueControl({
      type,
      value: typeof nextValue === "string" ? nextValue : previousValue,
      label,
    });
    bindCustomFieldActions(card);
  }

  function appendCustomFieldCard(manager, field) {
    const list = manager?.querySelector('[data-custom-field-list]');
    if (!list || !field) return;
    list.insertAdjacentHTML('beforeend', buildCustomFieldCard(field));
    refreshCustomFieldEmptyState(manager);
    refreshProjectFieldPicker(manager);
    bindCustomFieldActions(manager);
    const cards = list.querySelectorAll('.custom-field-card');
    cards[cards.length - 1]?.querySelector('[data-role="field-label"]')?.focus();
  }

  function collectCustomFields(group) {
    const manager = document.querySelector(`[data-custom-field-group="${group}"]`);
    if (!manager) return [];
    return [...manager.querySelectorAll('.custom-field-card')].map((card, index) => {
      const label = String(card.querySelector('[data-role="field-label"]')?.value || '').trim();
      const type = normalizeFieldType(card.querySelector('[data-role="field-type"]')?.value, "text");
      const value = String(card.querySelector('[data-role="field-value"]')?.value || '').trim();
      const rawKey = String(card.getAttribute('data-field-key') || '').trim();
      const key = slugify(rawKey || label || `field-${index + 1}`);
      return {
        id: card.getAttribute('data-custom-field-id') || makeId(`field-${key}`),
        key,
        label: label || PROJECT_EXTRA_FIELD_MAP[key]?.label || `Field ${index + 1}`,
        type,
        value,
      };
    }).filter((field) => field.label || field.value);
  }

  function bindCustomFieldActions(scope = document) {
    scope.querySelectorAll('[data-action="add-project-field"]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const manager = button.closest('[data-custom-field-group]');
        const picker = manager?.querySelector('[data-role="project-field-picker"]');
        const field = createPresetProjectField(picker?.value || '');
        if (!field) return;
        appendCustomFieldCard(manager, field);
      });
    });

    scope.querySelectorAll('[data-action="add-custom-field"]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const manager = button.closest('[data-custom-field-group]');
        const group = manager?.getAttribute('data-custom-field-group') || 'custom';
        appendCustomFieldCard(manager, createCustomField(group));
      });
    });

    scope.querySelectorAll('[data-action="remove-custom-field"]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const manager = button.closest('[data-custom-field-group]');
        button.closest('.custom-field-card')?.remove();
        refreshCustomFieldEmptyState(manager);
        refreshProjectFieldPicker(manager);
      });
    });

    scope.querySelectorAll('[data-action="upload-custom-field-files"]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', async () => {
        const card = button.closest('.custom-field-card');
        const type = normalizeFieldType(card?.querySelector('[data-role="field-type"]')?.value, 'file');
        const input = card?.querySelector('[data-role="field-upload-input"]');
        const files = Array.from(input?.files || []);
        if (!files.length) {
          setSaveStatus(`Choose a ${type} file first.`, 'error');
          return;
        }

        try {
          setSaveStatus(`Uploading ${files.length} ${type}${files.length === 1 ? '' : ' files'}...`, 'neutral');
          const existing = splitCustomFieldValue(card?.querySelector('[data-role="field-value"]')?.value || '');
          const uploadedUrls = [];
          for (const file of files) {
            const uploaded = await uploadCareerAsset(file, type);
            if (uploaded?.fileUrl) uploadedUrls.push(uploaded.fileUrl);
          }
          updateCustomFieldValueWrap(card, type, [...existing, ...uploadedUrls].filter(Boolean).join('\n'));
          setSaveStatus(`${uploadedUrls.length} ${type}${uploadedUrls.length === 1 ? '' : ' files'} uploaded`, 'success');
        } catch (error) {
          console.error(`Custom ${type} upload failed:`, error);
          setSaveStatus(error?.message || `Failed to upload ${type}`, 'error');
        }
      });
    });

    scope.querySelectorAll('[data-action="remove-custom-field-asset"]').forEach((button) => {
      if (button.dataset.bound === 'true') return;
      button.dataset.bound = 'true';
      button.addEventListener('click', () => {
        const card = button.closest('.custom-field-card');
        const type = normalizeFieldType(card?.querySelector('[data-role="field-type"]')?.value, 'file');
        const index = Number(button.getAttribute('data-asset-index') || -1);
        const current = splitCustomFieldValue(card?.querySelector('[data-role="field-value"]')?.value || '');
        if (index < 0 || index >= current.length) return;
        current.splice(index, 1);
        updateCustomFieldValueWrap(card, type, current.join('\n'));
      });
    });

    scope.querySelectorAll('[data-role="field-type"]').forEach((select) => {
      if (select.dataset.bound === 'true') return;
      select.dataset.bound = 'true';
      select.addEventListener('change', () => {
        updateCustomFieldValueWrap(select.closest('.custom-field-card'), select.value);
      });
    });

    scope.querySelectorAll('[data-custom-field-group]').forEach((manager) => {
      refreshCustomFieldEmptyState(manager);
      refreshProjectFieldPicker(manager);
    });
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
    bindCustomFieldActions(area);
    bindDynamicFormActions();
  }

  function bindDynamicFormActions() {
    document.getElementById("dynamic-save-profile-btn")?.addEventListener("click", async () => {
      try {
        const fileInput = document.getElementById("dynamic-profile-photoFile");
        const file = fileInput?.files?.[0];
        const existingPhotoUrl = data.profile?.[0]?.photoUrl || "";
        let photoUrl = getValue("dynamic-profile-photoUrl") || existingPhotoUrl;
        if (file) {
          setSaveStatus("Uploading professional photo...", "neutral");
          const uploaded = await uploadProfilePhoto(file);
          photoUrl = uploaded.fileUrl || photoUrl;
        }
        data.profile = [{
          id: data.profile?.[0]?.id || makeId("profile"),
          fullName: getValue("dynamic-profile-fullName"),
          headline: getValue("dynamic-profile-headline"),
          description: getValue("dynamic-profile-description"),
          photoUrl,
          visible: getChecked("dynamic-profile-visible"),
          customFields: collectCustomFields("profile"),
        }];
        await persistAndRefresh();
        renderDynamicForm();
      } catch (error) {
        console.error("Profile photo upload failed:", error);
        setSaveStatus(error?.message || "Professional photo upload failed", "error");
      }
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
        customFields: collectCustomFields("externalLinks"),
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
        customFields: collectCustomFields("experience"),
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
        customFields: collectCustomFields("leadership"),
      });
      await persistAndRefresh();
      renderDynamicForm();
    });

    document.getElementById("dynamic-save-project-btn")?.addEventListener("click", async () => {
      const title = getValue("dynamic-project-title");
      if (!title) return;
      const customFields = collectCustomFields("projects");
      const coverFileInput = document.getElementById("dynamic-project-cover-file");
      const coverFile = coverFileInput?.files?.[0];
      let coverPhotoUrl = "";

      try {
        if (coverFile) {
          setSaveStatus("Uploading project cover...", "neutral");
          const uploadedCover = await uploadCareerAsset(coverFile, "image");
          coverPhotoUrl = uploadedCover?.fileUrl || "";
        }

        const project = {
          id: makeId("project"),
          title,
          subtitle: getValue("dynamic-project-subtitle"),
          description: getValue("dynamic-project-description"),
          skills: getValue("dynamic-project-skills"),
          link: getValue("dynamic-project-link"),
          coverPhotoUrl,
          projectSlug: slugify(title),
          visible: getChecked("dynamic-project-visible"),
          cardDisplay: normalizeProjectCardDisplay({
            showCoverPhoto: getChecked("dynamic-project-card-showCoverPhoto"),
            showSubtitle: getChecked("dynamic-project-card-showSubtitle"),
            showDescription: getChecked("dynamic-project-card-showDescription"),
            showSkills: getChecked("dynamic-project-card-showSkills"),
            showLink: getChecked("dynamic-project-card-showLink"),
          }),
          customFields,
        };
        data.projects.unshift({
          ...project,
          projectPageSections: syncProjectPageSections(project),
        });
        await persistAndRefresh();
        renderDynamicForm();
      } catch (error) {
        console.error("Project cover upload failed:", error);
        setSaveStatus(error?.message || "Project cover upload failed", "error");
      }
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
        customFields: collectCustomFields("organizations"),
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
        customFields: collectCustomFields("honors"),
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
        customFields: collectCustomFields("licenses"),
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
        customFields: collectCustomFields("contact"),
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
            customFields: collectCustomFields("resume"),
          };
        } else {
          nextResume = { ...nextResume, title, note, visible, customFields: collectCustomFields("resume") };
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
        customFields: collectCustomFields("school"),
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
          customFields: collectCustomFields(key),
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
        customFields: collectCustomFields("timelineItems"),
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
        customFields: collectCustomFields("recommendations"),
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
        customFields: collectCustomFields("star"),
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
      ? `<ul class="list-clean">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n")}</ul>`
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
    const extra = buildCustomFieldsBlock(item?.customFields);
    if (group === "profile") {
      return `${top}<h3 class="card-title">${escapeHtml(item.fullName || "Profile basics")}</h3><p><strong>Headline:</strong> ${escapeHtml(item.headline || "—")}</p><p>${escapeHtml(item.description || "—")}</p><p><strong>Professional photo:</strong> ${escapeHtml(item.photoUrl || "Using account avatar fallback")}</p>${extra}`;
    }
    if (group === "externalLinks") {
      return `${top}<h3 class="card-title">${escapeHtml(item.label || item.type || "Link")}</h3><p><strong>Type:</strong> ${escapeHtml(item.type || "—")}</p><p><strong>URL / value:</strong> ${escapeHtml(item.url || "—")}</p>${extra}`;
    }
    if (group === "experience") {
      return `${top}<h3 class="card-title">${escapeHtml(item.role || "Experience")}</h3><p><strong>Company:</strong> ${escapeHtml(item.company || "—")}</p><p><strong>Location:</strong> ${escapeHtml(item.location || "—")}</p><p><strong>Dates:</strong> ${escapeHtml(item.startDate || "—")}${item.endDate ? ` → ${escapeHtml(item.endDate)}` : ""}</p><p>${escapeHtml(item.summary || "—")}</p><div><strong>Bullets:</strong>${buildBullets(item.bullets)}</div>${extra}`;
    }
    if (group === "leadership") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Leadership")}</h3><p><strong>Organization:</strong> ${escapeHtml(item.organization || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p>${escapeHtml(item.summary || "—")}</p><div><strong>Bullets:</strong>${buildBullets(item.bullets)}</div>${extra}`;
    }
    if (group === "projects") {
      const cardDisplay = normalizeProjectCardDisplay(item?.cardDisplay);
      const pageSections = syncProjectPageSections(item);
      return `
        ${top}
        <h3 class="card-title">${escapeHtml(item.title || "Project")}</h3>
        ${item.coverPhotoUrl ? `<div class="project-cover-preview-wrap"><img class="project-cover-preview" src="${escapeHtml(item.coverPhotoUrl)}" alt="${escapeHtml(item.title || "Project cover")}" /></div>` : ""}
        <p><strong>Slug:</strong> ${escapeHtml(item.projectSlug || slugify(item.title || "project"))}</p>
        <p><strong>Subtitle:</strong> ${escapeHtml(item.subtitle || "—")}</p>
        <p>${escapeHtml(item.description || "—")}</p>
        <p><strong>Skills:</strong> ${escapeHtml(item.skills || "—")}</p>
        ${item.link ? `<p><strong>Link:</strong> <a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${escapeHtml(item.link)}</a></p>` : ""}
        <div class="project-settings-block">
          <div>
            <p class="project-settings-title"><strong>Project card visibility</strong></p>
            <div class="project-card-display-list">
              ${PROJECT_CARD_DISPLAY_OPTIONS.map((option) => `
                <button class="button-secondary career-inline-button career-inline-button-mini project-inline-toggle-btn" type="button" data-action="toggle-project-card-display" data-display-key="${escapeHtml(option.key)}">
                  ${cardDisplay[option.key] ? "Hide" : "Show"} ${escapeHtml(option.label)}
                </button>
              `).join("\n")}
            </div>
          </div>
        </div>
        ${extra}
      `;
    }
    if (group === "organizations") {
      return `${top}<h3 class="card-title">${escapeHtml(item.name || "Organization")}</h3><p><strong>Role:</strong> ${escapeHtml(item.role || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p>${escapeHtml(item.description || "—")}</p>${extra}`;
    }
    if (group === "honors") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Honor")}</h3><p><strong>Value:</strong> ${escapeHtml(item.value || "—")}</p><p><strong>Issuer:</strong> ${escapeHtml(item.issuer || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p>${escapeHtml(item.description || "—")}</p>${extra}`;
    }
    if (group === "licenses") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "License")}</h3><p><strong>Issuer:</strong> ${escapeHtml(item.issuer || "—")}</p><p><strong>Date:</strong> ${escapeHtml(item.date || "—")}</p><p><strong>Credential ID:</strong> ${escapeHtml(item.credentialId || "—")}</p>${item.link ? `<p><strong>Link:</strong> <a href="${escapeHtml(item.link)}" target="_blank" rel="noreferrer">${escapeHtml(item.link)}</a></p>` : ""}${extra}`;
    }
    if (group === "contact") {
      return `${top}<h3 class="card-title">${escapeHtml(item.label || "Preferred contact")}</h3><p><strong>Method:</strong> ${escapeHtml(item.preferredMethod || "—")}</p><p><strong>Value:</strong> ${escapeHtml(item.value || "—")}</p><p>${escapeHtml(item.note || "—")}</p>${extra}`;
    }
    if (group === "resume") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Resume")}</h3><p><strong>File name:</strong> ${escapeHtml(item.fileName || "—")}</p><p><strong>File type:</strong> ${escapeHtml(item.fileType || "—")}</p><p><strong>File size:</strong> ${item.fileSize ? `${Math.round(item.fileSize / 1024)} KB` : "—"}</p><p><strong>Note:</strong> ${escapeHtml(item.note || "—")}</p>${buildResumeActions(item)}${buildResumePreview(item)}${extra}`;
    }
    if (group === "school") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "School Development")}</h3><p><strong>Professor:</strong> ${escapeHtml(item.prof || "—")}</p><p><strong>Helped with:</strong> ${escapeHtml(item.helped || "—")}</p><p><strong>Relevance:</strong> ${escapeHtml(item.relevance || "—")}</p><p><strong>Stage:</strong> ${escapeHtml(item.stage || "—")}</p><p><strong>Notes:</strong> ${escapeHtml(item.notes || "—")}</p>${extra}`;
    }
    if (group === "about" || group === "looking" || group === "pitch") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || group)}</h3><p>${escapeHtml(item.body || "—")}</p>${extra}`;
    }
    if (group === "timelineItems") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Timeline item")}</h3><p><strong>Date:</strong> ${escapeHtml(formatDate(item.date))}</p><p>${escapeHtml(item.description || "—")}</p>${extra}`;
    }
    if (group === "recommendations") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "Recommendation")}</h3><p><strong>Source:</strong> ${escapeHtml(item.owner || "—")}</p><p>${escapeHtml(item.body || "—")}</p>${extra}`;
    }
    if (group === "star") {
      return `${top}<h3 class="card-title">${escapeHtml(item.title || "STAR Example")}</h3><p><strong>Situation:</strong> ${escapeHtml(item.situation || "—")}</p><p><strong>Task:</strong> ${escapeHtml(item.task || "—")}</p><p><strong>Action:</strong> ${escapeHtml(item.action || "—")}</p><p><strong>Result:</strong> ${escapeHtml(item.result || "—")}</p>${extra}`;
    }
    return `${top}<h3 class="card-title">${escapeHtml(item.title || "Entry")}</h3>${extra}`;
  }

  async function toggleVisible(group, id) {
    data[group] = normalizeArray(data[group]).map((item) => item.id === id ? { ...item, visible: !normalizeBoolean(item.visible, true) } : item);
    await persistAndRefresh();
  }

  async function deleteItem(group, id) {
    data[group] = normalizeArray(data[group]).filter((item) => item.id !== id);
    await persistAndRefresh();
  }

  async function updateProject(id, updater) {
    data.projects = normalizeArray(data.projects).map((item) => {
      if (item.id !== id) return item;
      const updated = typeof updater === "function" ? updater(item) : { ...item, ...(updater || {}) };
      const synced = syncProjectPageSections({ ...updated, customFields: normalizeCustomFields(updated?.customFields) });
      return {
        ...updated,
        projectSlug: slugify(updated?.projectSlug || updated?.title || updated?.id || "project"),
        cardDisplay: normalizeProjectCardDisplay(updated?.cardDisplay),
        projectPageSections: synced,
      };
    });
    await persistAndRefresh();
  }

  async function toggleProjectCardDisplay(id, key) {
    await updateProject(id, (item) => ({
      ...item,
      cardDisplay: {
        ...normalizeProjectCardDisplay(item?.cardDisplay),
        [key]: !normalizeProjectCardDisplay(item?.cardDisplay)?.[key],
      },
    }));
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
      if (group === "projects") {
        card.querySelectorAll('[data-action="toggle-project-card-display"]').forEach((button) => {
          button.addEventListener("click", async () => {
            await toggleProjectCardDisplay(item.id, button.getAttribute("data-display-key") || "");
          });
        });
      }
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
