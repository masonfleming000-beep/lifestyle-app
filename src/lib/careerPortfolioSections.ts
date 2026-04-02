// @ts-nocheck

export const PROJECT_LAYOUT_KEY_PREFIX = "project:";

export function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeBoolean(value, fallback = true) {
  return typeof value === "boolean" ? value : fallback;
}

export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "page";
}

export function normalizeProjectIdentity(project, index = 0) {
  const next = project && typeof project === "object" ? { ...project } : {};
  const projectSlug = slugify(next?.projectSlug || next?.slug || next?.title || next?.id || `project-${index + 1}`);
  const layoutIdentity = slugify(next?.id || next?.projectSlug || next?.slug || next?.title || `project-${index + 1}`);

  return {
    ...next,
    projectSlug,
    portfolioSectionKey: `${PROJECT_LAYOUT_KEY_PREFIX}${layoutIdentity}`,
    title: next?.title || `Project ${index + 1}`,
  };
}

export function buildProjectLayoutKey(project, index = 0) {
  return normalizeProjectIdentity(project, index).portfolioSectionKey;
}

export function isProjectLayoutKey(key) {
  return String(key || "").startsWith(PROJECT_LAYOUT_KEY_PREFIX);
}

export function findProjectByLayoutKey(projects, key) {
  const normalizedKey = String(key || "").trim();
  return normalizeArray(projects).find((project, index) => buildProjectLayoutKey(project, index) === normalizedKey) || null;
}

export function countItemsForSectionKey(state, key) {
  if (isProjectLayoutKey(key)) {
    const project = findProjectByLayoutKey(state?.projects, key);
    if (!project) return { saved: 0, visible: 0 };
    return {
      saved: 1,
      visible: project?.visible !== false ? 1 : 0,
    };
  }

  const items = normalizeArray(state?.[key]);
  return {
    saved: items.length,
    visible: items.filter((item) => item?.visible !== false).length,
  };
}

export function syncPortfolioSectionLayout(layoutInput, projectsInput, options = {}) {
  const {
    titleFor = (key) => key,
    defaultMenuId = "main",
  } = options;

  const layout = normalizeArray(layoutInput).map((item, index) => ({
    ...item,
    key: String(item?.key || "").trim(),
    order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
  }));
  const projects = normalizeArray(projectsInput).map((project, index) => normalizeProjectIdentity(project, index));
  const projectKeys = new Set(projects.map((project) => project.portfolioSectionKey));
  const projectRelatedItems = layout.filter((item) => item.key === "projects" || isProjectLayoutKey(item.key));
  const genericProjectsItem = projectRelatedItems.find((item) => item.key === "projects") || null;
  const dynamicProjectMap = new Map(
    projectRelatedItems
      .filter((item) => isProjectLayoutKey(item.key))
      .map((item) => [item.key, item])
  );
  const anchorOrder = projectRelatedItems.length
    ? Math.min(...projectRelatedItems.map((item) => Number(item.order || 0)))
    : layout.length;
  const maxProjectOrder = projectRelatedItems.length
    ? Math.max(...projectRelatedItems.map((item) => Number(item.order || 0)))
    : anchorOrder;
  const template = {
    id: genericProjectsItem?.id || "layout-projects",
    key: "projects",
    title: genericProjectsItem?.title || titleFor("projects") || "Projects",
    pageId: genericProjectsItem?.pageId || defaultMenuId,
    enabled: normalizeBoolean(genericProjectsItem?.enabled, true),
    collapsed: normalizeBoolean(genericProjectsItem?.collapsed, false),
    order: Number.isFinite(Number(genericProjectsItem?.order)) ? Number(genericProjectsItem.order) : anchorOrder,
  };

  const stableNonProjectItems = layout.filter((item) => {
    if (item.key === "projects") return false;
    if (isProjectLayoutKey(item.key)) return false;
    return true;
  });

  if (!projects.length) {
    return [...stableNonProjectItems, template]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((item, index) => ({
        ...item,
        title: item.title || titleFor(item.key) || item.key || `Section ${index + 1}`,
        order: index,
      }));
  }

  const dynamicProjectItems = projects.map((project, index) => {
    const existing = dynamicProjectMap.get(project.portfolioSectionKey) || {};
    const fallbackOrder = dynamicProjectMap.size
      ? maxProjectOrder + ((index + 1) / 1000)
      : anchorOrder + (index / 1000);

    return {
      id: existing?.id || `layout-${project.portfolioSectionKey}`,
      key: project.portfolioSectionKey,
      title: project.title || template.title || `Project ${index + 1}`,
      pageId: existing?.pageId || template.pageId || defaultMenuId,
      enabled: normalizeBoolean(existing?.enabled, template.enabled),
      collapsed: normalizeBoolean(existing?.collapsed, template.collapsed),
      order: Number.isFinite(Number(existing?.order)) ? Number(existing.order) : fallbackOrder,
      projectSlug: project.projectSlug,
    };
  });

  return [...stableNonProjectItems, ...dynamicProjectItems]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((item, index) => ({
      ...item,
      title: isProjectLayoutKey(item.key)
        ? (findProjectByLayoutKey(projects, item.key)?.title || item.title || `Project ${index + 1}`)
        : (item.title || titleFor(item.key) || item.key || `Section ${index + 1}`),
      order: index,
    }));
}
