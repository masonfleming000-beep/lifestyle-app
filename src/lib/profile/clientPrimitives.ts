// @ts-nocheck
export function escapeProfileHtml(value: unknown) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function resolveProfileAvatarSource(profile: any) {
  return String(profile?.avatarFileDataUrl || profile?.avatarUrl || "");
}

export function getProfileAvatarInitial(profile: any) {
  return (
    String(
      profile?.displayName ||
      profile?.username ||
      profile?.handle?.replace(/^@/, "") ||
      "U"
    )
      .trim()
      .slice(0, 1)
      .toUpperCase() || "U"
  );
}

export function renderProfileAvatarMarkup(profile: any, options: {
  wrapClassName: string;
  frameClassName: string;
  imageClassName: string;
  fallbackClassName: string;
  includeAriaLabel?: boolean;
  alignmentClassPrefix?: string;
}) {
  const source = resolveProfileAvatarSource(profile);
  const initial = getProfileAvatarInitial(profile);
  const displayName = profile?.displayName || profile?.username || "Profile";
  const alignment = profile?.avatarAlignment || "left";
  const shape = profile?.avatarShape === "square" ? "square" : "circle";
  const size = Number(profile?.avatarSize || 148);
  const normalizedSize = Number.isFinite(size) ? Math.max(96, Math.min(260, size)) : 148;
  const wrapAlignmentClass = options.alignmentClassPrefix
    ? `${options.alignmentClassPrefix}${alignment}`
    : alignment;

  return `
    <div class="${escapeProfileHtml(options.wrapClassName)} ${escapeProfileHtml(wrapAlignmentClass)}">
      <div class="${escapeProfileHtml(options.frameClassName)} ui-picture-frame ui-picture-frame--${escapeProfileHtml(shape)}" style="--picture-frame-size:${normalizedSize}px;">
        ${source
          ? `
            <img
              class="${escapeProfileHtml(options.imageClassName)}"
              src="${escapeProfileHtml(source)}"
              alt="${escapeProfileHtml(displayName)}"
              loading="lazy"
              decoding="async"
              draggable="false"
              ${options.includeAriaLabel ? `aria-label="${escapeProfileHtml(displayName)}" role="img"` : ""}
              onerror="this.hidden=true; this.nextElementSibling && (this.nextElementSibling.style.display='grid');"
            />
          `
          : ""}
        <div class="${escapeProfileHtml(options.fallbackClassName)}"${source ? ' style="display:none;"' : ""}>${escapeProfileHtml(initial)}</div>
      </div>
    </div>
  `;
}

export function renderProfileHeroPreview(profile: any, options: {
  shellClassName?: string;
  bannerClassName: string;
  bodyClassName: string;
  copyClassName: string;
  avatarWrapClassName: string;
  avatarFrameClassName: string;
  avatarImageClassName: string;
  avatarFallbackClassName: string;
  avatarAlignmentClassPrefix?: string;
}) {
  const avatarVisible = profile?.avatarVisible !== false && profile?.visibility?.avatar !== false;

  return `
    <article class="${escapeProfileHtml(options.shellClassName || "preview-card preview-profile-hero-card")}">
      <div
        class="${escapeProfileHtml(options.bannerClassName)}"
        ${profile?.bannerUrl ? `style="background-image:url('${escapeProfileHtml(profile.bannerUrl)}')"` : ""}
      ></div>

      <div class="${escapeProfileHtml(options.bodyClassName)}">
        ${avatarVisible
          ? renderProfileAvatarMarkup(profile, {
              wrapClassName: options.avatarWrapClassName,
              frameClassName: options.avatarFrameClassName,
              imageClassName: options.avatarImageClassName,
              fallbackClassName: options.avatarFallbackClassName,
              alignmentClassPrefix: options.avatarAlignmentClassPrefix,
            })
          : ""}

        <div class="${escapeProfileHtml(options.copyClassName)}">
          <h3>${escapeProfileHtml(profile?.displayName || "Profile")}</h3>
          ${profile?.handle ? `<p class="meta">${escapeProfileHtml(profile.handle)}</p>` : ""}
          ${profile?.headline ? `<p>${escapeProfileHtml(profile.headline)}</p>` : ""}
          ${profile?.location ? `<p class="meta">${escapeProfileHtml(profile.location)}</p>` : ""}
          ${profile?.visibility?.bio !== false && profile?.bio ? `<p>${escapeProfileHtml(profile.bio)}</p>` : ""}
        </div>
      </div>
    </article>
  `;
}
