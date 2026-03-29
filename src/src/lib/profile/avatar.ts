export function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function slugifyProfileValue(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._-]+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

export function getProfileAvatarSource(profile: Record<string, any> | null | undefined) {
  return String(profile?.avatarFileDataUrl || profile?.avatarUrl || "");
}

export function getProfileAvatarInitial(profile: Record<string, any> | null | undefined) {
  return (
    String(
      profile?.displayName ||
      profile?.username ||
      String(profile?.handle || "").replace(/^@/, "") ||
      "U"
    )
      .trim()
      .slice(0, 1)
      .toUpperCase() || "U"
  );
}

export function getProfileAvatarShapeClass(profile: Record<string, any> | null | undefined) {
  return profile?.avatarShape === "square" ? "square" : "circle";
}

export function getProfileAvatarTransformStyle(profile: Record<string, any> | null | undefined) {
  const zoom = Number(profile?.avatarZoom || 1);
  const posX = Number(profile?.avatarPositionX ?? 50);
  const posY = Number(profile?.avatarPositionY ?? 50);
  return `background-size:${Number.isFinite(zoom) ? zoom * 100 : 100}%;background-position:${Number.isFinite(posX) ? posX : 50}% ${Number.isFinite(posY) ? posY : 50}%;`;
}
