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
  const size = Number(profile?.avatarSize || 116);
  const zoom = Number(profile?.avatarZoom || 1);
  const positionX = Number(profile?.avatarPositionX ?? 50);
  const positionY = Number(profile?.avatarPositionY ?? 50);
  const alignment = profile?.avatarAlignment === "center" || profile?.avatarAlignment === "right" ? profile.avatarAlignment : "left";
  const wrapAlignmentClass = options.alignmentClassPrefix
    ? `${options.alignmentClassPrefix}${alignment}`
    : alignment;
  const avatarShape = profile?.avatarShape === "square" ? "square" : "circle";
  const useCircle = avatarShape === "circle";

  return `
    <div class="${escapeProfileHtml(options.wrapClassName)} ${escapeProfileHtml(wrapAlignmentClass)}">
      <div
        class="${escapeProfileHtml(options.frameClassName)} ${useCircle ? "circle" : "square"}"
        style="width:${size}px;height:${size}px;"
      >
        ${source
          ? `
            <img
              class="${escapeProfileHtml(options.imageClassName)}"
              src="${escapeProfileHtml(source)}"
              alt="${escapeProfileHtml(displayName)}"
              loading="lazy"
              decoding="async"
              draggable="false"
              style="
                object-position:${positionX}% ${positionY}%;
                transform:scale(${zoom});
                transform-origin:${positionX}% ${positionY}%;
              "
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
