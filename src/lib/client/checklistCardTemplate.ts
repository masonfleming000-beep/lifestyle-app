export type EscapeHtml = (value: unknown) => string;

export interface ChecklistCardBadge {
  label: string;
  className?: string;
}

export interface ChecklistCardOptions {
  title: string;
  done?: boolean;
  cardClassName?: string;
  titleClassName?: string;
  contentClassName?: string;
  toplineClassName?: string;
  metaClassName?: string;
  checkboxWrapClassName?: string;
  checkboxClassName?: string;
  checkboxAttrs?: Record<string, string | number | boolean | null | undefined>;
  badges?: ChecklistCardBadge[];
  meta?: string[];
  emptyMetaLabel?: string;
  actionsHtml?: string;
  hideMeta?: boolean;
}

function renderDataAttrs(
  attrs: Record<string, string | number | boolean | null | undefined> | undefined,
  escapeHtml: EscapeHtml,
) {
  if (!attrs) return "";

  return Object.entries(attrs)
    .filter(([, value]) => value !== false && value !== null && value !== undefined)
    .map(([key, value]) => {
      if (value === true) return ` ${key}`;
      return ` ${key}="${escapeHtml(value)}"`;
    })
    .join("");
}

export function renderChecklistCard(options: ChecklistCardOptions, escapeHtml: EscapeHtml) {
  const badgesHtml = (options.badges || [])
    .map((badge) => `<span class="${escapeHtml(badge.className || "today-pill")}">${escapeHtml(badge.label)}</span>`)
    .join("");

  const metaItems = options.meta && options.meta.length
    ? options.meta
    : [options.emptyMetaLabel || "Today item"];

  const metaHtml = options.hideMeta
    ? ""
    : `<div class="assignment-meta ${escapeHtml(options.metaClassName || "").trim()}">${metaItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>`;

  return `
    <article class="assignment-card ${escapeHtml(options.cardClassName || "").trim()}${options.done ? " is-done" : ""}">
      <label class="assignment-check-wrap ${escapeHtml(options.checkboxWrapClassName || "").trim()}">
        <input
          type="checkbox"
          class="assignment-check ${escapeHtml(options.checkboxClassName || "").trim()}"
          ${renderDataAttrs(options.checkboxAttrs, escapeHtml)}
          ${options.done ? "checked" : ""}
        />
        <span></span>
      </label>

      <div class="assignment-main ${escapeHtml(options.contentClassName || "").trim()}">
        <div class="assignment-topline ${escapeHtml(options.toplineClassName || "").trim()}">
          <h3 class="assignment-title ${escapeHtml(options.titleClassName || "").trim()}">${escapeHtml(options.title)}</h3>
          ${badgesHtml}
        </div>
        ${metaHtml}
      </div>

      ${options.actionsHtml || ""}
    </article>
  `;
}
