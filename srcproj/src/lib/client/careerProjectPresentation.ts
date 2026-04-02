// @ts-nocheck
export const PROJECT_CARD_DISPLAY_KEYS = ["cover", "subtitle", "description", "skills", "link"];

export function slugifyProjectValue(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "project";
}

export function normalizeBoolean(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function makeProjectSlug(project, index = 0) {
  const base = slugifyProjectValue(project?.slug || project?.title || `project-${index + 1}`);
  return base || `project-${index + 1}`;
}

export function normalizeProjectCardDisplay(raw) {
  const parsed = raw && typeof raw === "object" ? raw : {};
  return {
    cover: normalizeBoolean(parsed.cover, true),
    subtitle: normalizeBoolean(parsed.subtitle, true),
    description: normalizeBoolean(parsed.description, true),
    skills: normalizeBoolean(parsed.skills, true),
    link: normalizeBoolean(parsed.link, true),
  };
}

function customFieldSectionId(field, index) {
  return `custom-${slugifyProjectValue(field?.key || field?.label || `field-${index + 1}`)}`;
}

export function buildDefaultProjectPageSections(project) {
  const sections = [];
  const push = (key, title, enabled = true) => {
    sections.push({ id: `project-section-${key}`, key, title, enabled, order: sections.length });
  };

  push("description", "Description", Boolean(String(project?.description || "").trim()));
  push("skills", "Skills / Stack", Boolean(String(project?.skills || "").trim()));
  push("link", "Project Link", Boolean(String(project?.link || "").trim()));
  push("subtitle", "Subtitle / Stage", Boolean(String(project?.subtitle || "").trim()));

  normalizeArray(project?.customFields)
    .filter((field) => String(field?.label || field?.value || "").trim())
    .forEach((field, index) => {
      push(customFieldSectionId(field, index), field?.label || `Field ${index + 1}`, true);
    });

  return sections;
}

export function mergeProjectPageSections(project) {
  const defaults = buildDefaultProjectPageSections(project);
  const provided = normalizeArray(project?.projectPageSections)
    .map((item, index) => ({
      id: item?.id || `project-section-${item?.key || index}`,
      key: item?.key || "",
      title: item?.title || item?.key || `Section ${index + 1}`,
      enabled: normalizeBoolean(item?.enabled, true),
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
    }))
    .filter((item) => item.key);

  const merged = [...provided];
  defaults.forEach((item) => {
    if (merged.some((existing) => existing.key === item.key)) return;
    merged.push(item);
  });

  return merged
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((item, index) => ({ ...item, order: index }));
}

export function normalizeProject(project, index = 0) {
  const next = project && typeof project === "object" ? project : {};
  const normalized = {
    ...next,
    id: next?.id || `project-${index + 1}`,
    title: next?.title || "",
    subtitle: next?.subtitle || next?.stage || "",
    description: next?.description || "",
    skills: next?.skills || next?.parts || "",
    link: next?.link || "",
    coverImage: next?.coverImage || next?.coverImageUrl || next?.projectPhoto || next?.photoUrl || "",
    visible: normalizeBoolean(next?.visible, true),
    cardDisplay: normalizeProjectCardDisplay(next?.cardDisplay),
    customFields: normalizeArray(next?.customFields || next?.extraFields),
  };
  normalized.slug = makeProjectSlug(next, index);
  normalized.projectPageSections = mergeProjectPageSections(normalized);
  return normalized;
}

export function buildProjectPath(basePath, username, project) {
  const safeBase = String(basePath || "/portfolio").replace(/\/$/, "");
  const safeUser = encodeURIComponent(String(username || "").trim());
  const slug = encodeURIComponent(project?.slug || makeProjectSlug(project));
  if (!safeUser) return "#";
  return `${safeBase}/${safeUser}/${slug}`;
}
