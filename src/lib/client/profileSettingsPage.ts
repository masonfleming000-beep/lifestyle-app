// @ts-nocheck
import { resolveProfileAvatarSource, getProfileAvatarInitial, renderProfileHeroPreview } from "../profile/clientPrimitives";

interface ProfileSettingsClientConfig {
  pageKey: string;
  defaultProfileSettingsJson: string;
}

export function initProfileSettingsPage(config: ProfileSettingsClientConfig) {
  const pageKey = config.pageKey;
  const defaultProfileSettings = config.defaultProfileSettingsJson;
  const statusEl = document.getElementById("profile-settings-status");
  const previewRoot = document.getElementById("profile-preview-root");

  let state = null;
  let hasLoadedInitialState = false;
  let isSaving = false;
  let pendingSave = false;
  let previewRefreshTimer = null;
  let avatarImageNaturalWidth = 0;
  let avatarImageNaturalHeight = 0;
  let cropDragState = null;

  function setStatus(text, mode = "neutral") {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = `save-status ${mode}`;
  }

  function cloneDefaults() {
    return JSON.parse(defaultProfileSettings);
  }

  function slugifyProfileValue(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/[^a-z0-9._-]+/g, ".")
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+|\.+$/g, "");
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function setValue(id, value) {
    const el = byId(id);
    if (!el) return;

    const normalizedValue = value ?? "";

    if (el.tagName === "SELECT") {
      const hasOption = Array.from(el.options).some((option) => option.value === normalizedValue);
      el.value = hasOption ? normalizedValue : el.options[0]?.value || "";
      return;
    }

    el.value = normalizedValue;
  }

  function setChecked(id, value) {
    const el = byId(id);
    if (!el) return;
    el.checked = !!value;
  }

  function getValue(id) {
    return String(byId(id)?.value || "").trim();
  }

  function getChecked(id) {
    return !!byId(id)?.checked;
  }

  function formatPreviewValue(value) {
    const num = Number(value);
    if (Number.isFinite(num)) {
      return num.toFixed(2);
    }
    return String(value || "—");
  }

  function deriveUsernameCandidate() {
    const explicitUsername = slugifyProfileValue(getValue("username"));
    if (explicitUsername) return explicitUsername;

    const explicitHandle = slugifyProfileValue(getValue("handle"));
    if (explicitHandle) return explicitUsername || explicitHandle;

    const email = getValue("email");
    const emailLocal = slugifyProfileValue((email.split("@")[0] || ""));
    if (emailLocal) return emailLocal;

    const displayName = slugifyProfileValue(getValue("displayName"));
    if (displayName) return displayName;

    return "";
  }

  function deriveHandleCandidate(username) {
    const explicitHandle = slugifyProfileValue(getValue("handle"));
    if (explicitHandle) return `@${explicitHandle}`;
    return username ? `@${username}` : "";
  }

  const THEME_COLOR_FIELD_IDS = [
    "ui-header-color",
    "ui-section-color",
    "ui-background-color",
    "ui-dropdown-color",
  ];

  function normalizeThemeMode(mode) {
    if (mode === "dark" || mode === "light" || mode === "custom") return mode;
    return "custom";
  }

  function getEffectiveThemeColors(mode, surfaces, defaultSurfaces) {
    if (mode === "light") {
      return defaultSurfaces;
    }

    return surfaces;
  }

  function updateThemeModeUi(mode) {
    const disableColorInputs = normalizeThemeMode(mode) === "light";

    THEME_COLOR_FIELD_IDS.forEach((id) => {
      const input = byId(id);
      if (!input) return;
      input.disabled = disableColorInputs;
      input.title = disableColorInputs ? "Light mode uses fixed default colors." : "";
    });
  }

  function getDefaultTheme() {
    const defaults = cloneDefaults();
    const fallbackTheme = {
      scope: "global",
      mode: "custom",
      textSize: "md",
      surfaces: {
        header: { color: "#ffffff", texture: "solid" },
        section: { color: "#ffffff", texture: "matte" },
        background: { color: "#f8fafc", texture: "smoothed" },
        dropdown: { color: "#ffffff", texture: "solid" },
      },
      components: {
        navbar: { surface: "header" },
        hero: { surface: "header" },
        sectionCard: { surface: "section" },
        quickLinkCard: { surface: "section" },
        quoteCard: { surface: "section" },
        statCard: { surface: "section" },
        card: { surface: "section" },
        dropdownCard: { surface: "dropdown" },
        embed: { surface: "section" },
        metric: { surface: "section" },
        input: { surface: "section" },
      },
    };

    return {
      ...fallbackTheme,
      ...(defaults.theme || {}),
      surfaces: {
        ...fallbackTheme.surfaces,
        ...(defaults.theme?.surfaces || {}),
        header: {
          ...fallbackTheme.surfaces.header,
          ...(defaults.theme?.surfaces?.header || {}),
        },
        section: {
          ...fallbackTheme.surfaces.section,
          ...(defaults.theme?.surfaces?.section || {}),
        },
        background: {
          ...fallbackTheme.surfaces.background,
          ...(defaults.theme?.surfaces?.background || {}),
        },
        dropdown: {
          ...fallbackTheme.surfaces.dropdown,
          ...(defaults.theme?.surfaces?.dropdown || {}),
        },
      },
      components: {
        ...fallbackTheme.components,
        ...(defaults.theme?.components || {}),
        navbar: {
          ...fallbackTheme.components.navbar,
          ...(defaults.theme?.components?.navbar || {}),
        },
        hero: {
          ...fallbackTheme.components.hero,
          ...(defaults.theme?.components?.hero || {}),
        },
        sectionCard: {
          ...fallbackTheme.components.sectionCard,
          ...(defaults.theme?.components?.sectionCard || {}),
        },
        quickLinkCard: {
          ...fallbackTheme.components.quickLinkCard,
          ...(defaults.theme?.components?.quickLinkCard || {}),
        },
        quoteCard: {
          ...fallbackTheme.components.quoteCard,
          ...(defaults.theme?.components?.quoteCard || {}),
        },
        statCard: {
          ...fallbackTheme.components.statCard,
          ...(defaults.theme?.components?.statCard || {}),
        },
        card: {
          ...fallbackTheme.components.card,
          ...(defaults.theme?.components?.card || {}),
        },
        dropdownCard: {
          ...fallbackTheme.components.dropdownCard,
          ...(defaults.theme?.components?.dropdownCard || {}),
        },
        embed: {
          ...fallbackTheme.components.embed,
          ...(defaults.theme?.components?.embed || {}),
        },
        metric: {
          ...fallbackTheme.components.metric,
          ...(defaults.theme?.components?.metric || {}),
        },
        input: {
          ...fallbackTheme.components.input,
          ...(defaults.theme?.components?.input || {}),
        },
      },
    };
  }

  function getAvatarSource(nextState) {
    return resolveProfileAvatarSource(nextState);
  }

  function getAvatarInitial(nextState) {
    return getProfileAvatarInitial(nextState);
  }

  function updateRangeLabel(id, text) {
    const el = byId(id);
    if (el) el.textContent = text;
  }


  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function setAvatarCropValue(id, value) {
    const el = byId(id);
    if (!el) return;
    el.value = String(Math.round(clamp(Number(value) || 50, 0, 100)));
  }

  function getAvatarCropValue(id, fallback = 50) {
    const el = byId(id);
    const value = Number(el?.value ?? fallback);
    return Number.isFinite(value) ? clamp(value, 0, 100) : fallback;
  }

  function getAvatarRenderMetrics(frameRect, zoom = 1) {
    const naturalWidth = avatarImageNaturalWidth || frameRect.width || 1;
    const naturalHeight = avatarImageNaturalHeight || frameRect.height || 1;
    const coverScale = Math.max(
      (frameRect.width || 1) / naturalWidth,
      (frameRect.height || 1) / naturalHeight
    );

    return {
      width: naturalWidth * coverScale * zoom,
      height: naturalHeight * coverScale * zoom,
    };
  }

  function updateAvatarEditorPreview(nextState) {
    const shell = byId("avatar-stage-shell");
    const preview = byId("avatar-editor-preview");
    const image = byId("avatar-editor-preview-image");
    const fallback = byId("avatar-editor-preview-fallback");
    const nameEl = byId("avatar-stage-display-name");
    const handleEl = byId("avatar-stage-handle");

    if (!shell || !preview || !image || !fallback) return;

    shell.classList.remove("avatar-align-left", "avatar-align-center", "avatar-align-right");
    shell.classList.add(`avatar-align-${nextState.avatarAlignment || "left"}`);

    preview.classList.remove("circle", "square");
    const useCircle = nextState.avatarUseCircularCrop !== false || nextState.avatarShape === "circle";
    preview.classList.add(useCircle ? "circle" : "square");

    preview.style.width = `${Number(nextState.avatarSize || 116)}px`;
    preview.style.height = `${Number(nextState.avatarSize || 116)}px`;
    preview.style.display = nextState.avatarVisible === false || nextState.visibility?.avatar === false ? "none" : "grid";

    const source = getAvatarSource(nextState);
    const zoom = Number(nextState.avatarZoom || 1);
    const x = Number(nextState.avatarPositionX ?? 50);
    const y = Number(nextState.avatarPositionY ?? 50);

    setAvatarCropValue("avatar-position-x", x);
    setAvatarCropValue("avatar-position-y", y);

    if (source) {
      if (image.getAttribute("src") !== source) {
        image.setAttribute("src", source);
      }
      image.alt = `${nextState.displayName || nextState.username || "Profile"} avatar`;
      image.style.objectPosition = `${x}% ${y}%`;
      image.style.transform = `scale(${zoom})`;
      image.style.transformOrigin = `${x}% ${y}%`;
      image.hidden = false;
      fallback.style.display = "none";
    } else {
      image.hidden = true;
      image.removeAttribute("src");
      fallback.style.display = "grid";
    }

    fallback.textContent = getAvatarInitial(nextState);

    if (nameEl) {
      nameEl.textContent = nextState.displayName || "Your profile";
    }

    if (handleEl) {
      handleEl.textContent = nextState.handle || `@${nextState.username || "username"}`;
    }

    updateRangeLabel("avatar-size-value", `${Number(nextState.avatarSize || 116)}px`);
    updateRangeLabel("avatar-zoom-value", `${Number(zoom).toFixed(2)}x`);
    updateRangeLabel("avatar-position-x-value", `X ${Math.round(x)}%`);
    updateRangeLabel("avatar-position-y-value", `Y ${Math.round(y)}%`);
  }

  function refreshSnapshot(nextState) {
    const set = (id, value) => {
      const el = byId(id);
      if (el) el.textContent = value || "—";
    };

    set("snapshot-display-name", nextState.displayName);
    set("snapshot-headline", nextState.headline);
    set("snapshot-location", nextState.location);
    set("snapshot-theme", `${nextState.theme.mode} / ${nextState.theme.textSize}`);
    set("snapshot-avatar-visible", nextState.avatarVisible === false ? "Hidden" : "Visible");
    set("snapshot-avatar-align", nextState.avatarAlignment || "left");

    updateAvatarEditorPreview(nextState);
  }

  function normalizeState(source, defaults = cloneDefaults()) {
    const safeSource = source ?? {};
    const defaultTheme = getDefaultTheme();
    const safeTheme = safeSource.theme ?? {};

    return {
      ...defaults,
      ...safeSource,
      avatarFileDataUrl: safeSource.avatarFileDataUrl || defaults.avatarFileDataUrl || "",
      avatarUrl: safeSource.avatarUrl || defaults.avatarUrl || "",
      avatarSize: Number(safeSource.avatarSize ?? defaults.avatarSize ?? 116),
      avatarZoom: Number(safeSource.avatarZoom ?? defaults.avatarZoom ?? 1),
      avatarPositionX: Number(safeSource.avatarPositionX ?? defaults.avatarPositionX ?? 50),
      avatarPositionY: Number(safeSource.avatarPositionY ?? defaults.avatarPositionY ?? 50),
      avatarVisible: typeof safeSource.avatarVisible === "boolean" ? safeSource.avatarVisible : defaults.avatarVisible,
      avatarAlignment: safeSource.avatarAlignment || defaults.avatarAlignment || "left",
      avatarShape: safeSource.avatarShape || defaults.avatarShape || "circle",
      avatarUseCircularCrop:
        typeof safeSource.avatarUseCircularCrop === "boolean"
          ? safeSource.avatarUseCircularCrop
          : (defaults.avatarUseCircularCrop ?? true),
      visibility: {
        ...defaults.visibility,
        ...(safeSource.visibility || {}),
        avatar:
          typeof safeSource?.visibility?.avatar === "boolean"
            ? safeSource.visibility.avatar
            : defaults.visibility.avatar,
      },
      theme: {
        ...defaultTheme,
        ...safeTheme,
        surfaces: {
          ...defaultTheme.surfaces,
          ...(safeTheme.surfaces || {}),
          header: {
            ...defaultTheme.surfaces.header,
            ...(safeTheme.surfaces?.header || {}),
          },
          section: {
            ...defaultTheme.surfaces.section,
            ...(safeTheme.surfaces?.section || {}),
          },
          background: {
            ...defaultTheme.surfaces.background,
            ...(safeTheme.surfaces?.background || {}),
          },
          dropdown: {
            ...defaultTheme.surfaces.dropdown,
            ...(safeTheme.surfaces?.dropdown || {}),
          },
        },
        components: {
          ...defaultTheme.components,
          ...(safeTheme.components || {}),
          navbar: {
            ...defaultTheme.components.navbar,
            ...(safeTheme.components?.navbar || {}),
          },
          hero: {
            ...defaultTheme.components.hero,
            ...(safeTheme.components?.hero || {}),
          },
          sectionCard: {
            ...defaultTheme.components.sectionCard,
            ...(safeTheme.components?.sectionCard || {}),
          },
          quickLinkCard: {
            ...defaultTheme.components.quickLinkCard,
            ...(safeTheme.components?.quickLinkCard || {}),
          },
          quoteCard: {
            ...defaultTheme.components.quoteCard,
            ...(safeTheme.components?.quoteCard || {}),
          },
          statCard: {
            ...defaultTheme.components.statCard,
            ...(safeTheme.components?.statCard || {}),
          },
          card: {
            ...defaultTheme.components.card,
            ...(safeTheme.components?.card || {}),
          },
          dropdownCard: {
            ...defaultTheme.components.dropdownCard,
            ...(safeTheme.components?.dropdownCard || {}),
          },
          embed: {
            ...defaultTheme.components.embed,
            ...(safeTheme.components?.embed || {}),
          },
          metric: {
            ...defaultTheme.components.metric,
            ...(safeTheme.components?.metric || {}),
          },
          input: {
            ...defaultTheme.components.input,
            ...(safeTheme.components?.input || {}),
          },
        },
      },
    };
  }

  function applyState(nextState) {
    setValue("email", nextState?.account?.email || "");
    setValue("username", nextState.username || "");
    setValue("handle", nextState.handle || "");
    setValue("displayName", nextState.displayName);
    setValue("headline", nextState.headline);
    setValue("location", nextState.location);
    setValue("bio", nextState.bio);
    setValue("bannerUrl", nextState.bannerUrl);
    setValue("avatarUrl", nextState.avatarUrl);

    setChecked("visibility-profile", nextState.visibility.profile);
    setChecked("visibility-avatar", nextState.visibility.avatar);
    setChecked("visibility-bio", nextState.visibility.bio);
    setChecked("visibility-stats", nextState.visibility.stats);
    setChecked("visibility-portfolio", nextState.visibility.portfolio);
    setChecked("visibility-activity", nextState.visibility.activity);
    setChecked("visibility-achievements", nextState.visibility.achievements);
    setChecked("visibility-contact", nextState.visibility.contact);

    setChecked("avatar-visible", nextState.avatarVisible);
    setValue("avatar-alignment", nextState.avatarAlignment || "left");
    setValue("avatar-shape", nextState.avatarShape || "circle");
    setChecked("avatar-circular-crop", nextState.avatarUseCircularCrop !== false);
    setValue("avatar-size", nextState.avatarSize ?? 116);
    setValue("avatar-zoom", nextState.avatarZoom ?? 1);
    setValue("avatar-position-x", nextState.avatarPositionX ?? 50);
    setValue("avatar-position-y", nextState.avatarPositionY ?? 50);

    setChecked("stats-fitness", nextState.statsSources.fitness);
    setChecked("stats-hobbies", nextState.statsSources.hobbies);

    setChecked("stats-display-auto", nextState.statsDisplay.autoFormatted);
    setChecked("stats-display-overview", nextState.statsDisplay.showOverview);
    setChecked("stats-display-sections", nextState.statsDisplay.showSections);
    setChecked("stats-display-workouts", nextState.statsDisplay.showWorkouts);
    setChecked("stats-display-cardio", nextState.statsDisplay.showCardio);
    setChecked("stats-display-recent", nextState.statsDisplay.showRecentSessions);
    setValue("stats-default-range", nextState.statsDisplay.defaultRange);
    setValue("stats-default-section", nextState.statsDisplay.defaultSection);
    setValue("stats-default-workout", nextState.statsDisplay.defaultWorkout);
    setValue("stats-default-cardio-type", nextState.statsDisplay.defaultCardioType);
    setValue("stats-default-hobby-id", nextState.statsDisplay.defaultHobbyId);
    setValue("stats-default-hobby-stage-id", nextState.statsDisplay.defaultHobbyStageId);
    setValue("stats-portfolio-mode", nextState.statsDisplay.portfolioMode);

    setChecked("notifications-email", nextState.notifications.email);
    setChecked("notifications-push", nextState.notifications.push);
    setChecked("notifications-product", nextState.notifications.product);
    setChecked("notifications-reminders", nextState.notifications.reminders);
    setChecked("notifications-marketing", nextState.notifications.marketing);

    setValue("ui-scope", nextState.theme.scope);
    setValue("ui-mode", normalizeThemeMode(nextState.theme.mode));
    setValue("ui-text-size", nextState.theme.textSize);

    setValue("ui-header-color", nextState.theme.surfaces.header.color);
    setValue("ui-header-texture", nextState.theme.surfaces.header.texture);
    setValue("ui-section-color", nextState.theme.surfaces.section.color);
    setValue("ui-section-texture", nextState.theme.surfaces.section.texture);
    setValue("ui-background-color", nextState.theme.surfaces.background.color);
    setValue("ui-background-texture", nextState.theme.surfaces.background.texture);
    setValue("ui-dropdown-color", nextState.theme.surfaces.dropdown.color);
    setValue("ui-dropdown-texture", nextState.theme.surfaces.dropdown.texture);

    setValue("component-navbar-surface", nextState.theme.components.navbar.surface);
    setValue("component-hero-surface", nextState.theme.components.hero.surface);
    setValue("component-section-card-surface", nextState.theme.components.sectionCard.surface);
    setValue("component-quick-link-card-surface", nextState.theme.components.quickLinkCard.surface);
    setValue("component-quote-card-surface", nextState.theme.components.quoteCard.surface);
    setValue("component-stat-card-surface", nextState.theme.components.statCard.surface);
    setValue("component-card-surface", nextState.theme.components.card.surface);
    setValue("component-dropdown-card-surface", nextState.theme.components.dropdownCard.surface);
    setValue("component-embed-surface", nextState.theme.components.embed.surface);
    setValue("component-metric-surface", nextState.theme.components.metric.surface);
    setValue("component-input-surface", nextState.theme.components.input.surface);

    refreshSnapshot(nextState);
  }

  function collectState() {
    const defaults = cloneDefaults();
    const defaultTheme = getDefaultTheme();
    const derivedUsername = deriveUsernameCandidate();
    const derivedHandle = deriveHandleCandidate(derivedUsername);

    return {
      ...defaults,
      displayName: getValue("displayName"),
      username: derivedUsername,
      handle: derivedHandle,
      bio: getValue("bio"),
      bannerUrl: getValue("bannerUrl"),
      avatarUrl: getValue("avatarUrl"),
      avatarFileDataUrl: state?.avatarFileDataUrl || "",
      avatarSize: Number(getValue("avatar-size") || defaults.avatarSize || 116),
      avatarZoom: Number(getValue("avatar-zoom") || defaults.avatarZoom || 1),
      avatarPositionX: Number(getValue("avatar-position-x") || defaults.avatarPositionX || 50),
      avatarPositionY: Number(getValue("avatar-position-y") || defaults.avatarPositionY || 50),
      avatarVisible: getChecked("avatar-visible"),
      avatarAlignment: getValue("avatar-alignment") || "left",
      avatarShape: getValue("avatar-shape") || "circle",
      avatarUseCircularCrop: getChecked("avatar-circular-crop"),
      location: getValue("location"),
      headline: getValue("headline"),
      visibility: {
        profile: getChecked("visibility-profile"),
        avatar: getChecked("visibility-avatar"),
        bio: getChecked("visibility-bio"),
        stats: getChecked("visibility-stats"),
        portfolio: getChecked("visibility-portfolio"),
        activity: getChecked("visibility-activity"),
        achievements: getChecked("visibility-achievements"),
        contact: getChecked("visibility-contact"),
      },
      statsSources: {
        ...(defaults.statsSources || {}),
        fitness: getChecked("stats-fitness"),
        hobbies: getChecked("stats-hobbies"),
      },
      statsDisplay: {
        ...defaults.statsDisplay,
        autoFormatted: getChecked("stats-display-auto"),
        showOverview: getChecked("stats-display-overview"),
        showSections: getChecked("stats-display-sections"),
        showWorkouts: getChecked("stats-display-workouts"),
        showCardio: getChecked("stats-display-cardio"),
        showRecentSessions: getChecked("stats-display-recent"),
        defaultRange: getValue("stats-default-range") || "30d",
        defaultSection: getValue("stats-default-section") || "all",
        defaultWorkout: getValue("stats-default-workout") || "all",
        defaultCardioType: getValue("stats-default-cardio-type") || "all",
        defaultHobbyId: getValue("stats-default-hobby-id") || "all",
        defaultHobbyStageId: getValue("stats-default-hobby-stage-id") || "all",
        portfolioMode: getValue("stats-portfolio-mode") || "link",
      },
      notifications: {
        email: getChecked("notifications-email"),
        push: getChecked("notifications-push"),
        product: getChecked("notifications-product"),
        reminders: getChecked("notifications-reminders"),
        marketing: getChecked("notifications-marketing"),
      },
      theme: {
        ...defaultTheme,
        scope: getValue("ui-scope") || "global",
        mode: getValue("ui-mode") || defaultTheme.mode,
        textSize: getValue("ui-text-size") || defaultTheme.textSize,
        surfaces: {
          header: {
            color: getValue("ui-header-color") || defaultTheme.surfaces.header.color,
            texture: getValue("ui-header-texture") || defaultTheme.surfaces.header.texture,
          },
          section: {
            color: getValue("ui-section-color") || defaultTheme.surfaces.section.color,
            texture: getValue("ui-section-texture") || defaultTheme.surfaces.section.texture,
          },
          background: {
            color: getValue("ui-background-color") || defaultTheme.surfaces.background.color,
            texture: getValue("ui-background-texture") || defaultTheme.surfaces.background.texture,
          },
          dropdown: {
            color: getValue("ui-dropdown-color") || defaultTheme.surfaces.dropdown.color,
            texture: getValue("ui-dropdown-texture") || defaultTheme.surfaces.dropdown.texture,
          },
        },
        components: {
          navbar: {
            surface: getValue("component-navbar-surface") || defaultTheme.components.navbar.surface,
          },
          hero: {
            surface: getValue("component-hero-surface") || defaultTheme.components.hero.surface,
          },
          sectionCard: {
            surface: getValue("component-section-card-surface") || defaultTheme.components.sectionCard.surface,
          },
          quickLinkCard: {
            surface: getValue("component-quick-link-card-surface") || defaultTheme.components.quickLinkCard.surface,
          },
          quoteCard: {
            surface: getValue("component-quote-card-surface") || defaultTheme.components.quoteCard.surface,
          },
          statCard: {
            surface: getValue("component-stat-card-surface") || defaultTheme.components.statCard.surface,
          },
          card: {
            surface: getValue("component-card-surface") || defaultTheme.components.card.surface,
          },
          dropdownCard: {
            surface: getValue("component-dropdown-card-surface") || defaultTheme.components.dropdownCard.surface,
          },
          embed: {
            surface: getValue("component-embed-surface") || defaultTheme.components.embed.surface,
          },
          metric: {
            surface: getValue("component-metric-surface") || defaultTheme.components.metric.surface,
          },
          input: {
            surface: getValue("component-input-surface") || defaultTheme.components.input.surface,
          },
        },
      },
      account: {
        email: getValue("email"),
      },
      portfolioFilters: {
        ...(defaults.portfolioFilters || {}),
      },
    };
  }

  function persistUiSettings(theme, currentPageKey) {
    if (theme.scope === "global") {
      localStorage.setItem("app-ui-settings", JSON.stringify(theme));
      localStorage.removeItem(`app-ui-page-settings:${currentPageKey}`);
    } else {
      localStorage.setItem(`app-ui-page-settings:${currentPageKey}`, JSON.stringify(theme));
    }
  }

  async function loadState() {
    try {
      const response = await fetch(`/api/state?pageKey=${encodeURIComponent(pageKey)}`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) return null;

      const payload = await response.json();
      return payload?.state ?? null;
    } catch (error) {
      console.error("Failed to load profile settings:", error);
      return null;
    }
  }

  async function uploadAvatarFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload-avatar", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error || `Avatar upload failed (${response.status})`);
    }

    return payload;
  }

  async function persistState(nextState) {
    const response = await fetch("/api/state", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey, state: nextState }),
    });

    if (!response.ok) {
      throw new Error("Failed to save profile settings");
    }
  }

  function applyTheme(nextState) {
    const defaultTheme = getDefaultTheme();
    const theme = nextState?.theme || defaultTheme;
    const mode = normalizeThemeMode(theme.mode || defaultTheme.mode);
    const textSize = theme.textSize || defaultTheme.textSize;
    const surfaces = getEffectiveThemeColors(mode, theme.surfaces || defaultTheme.surfaces, defaultTheme.surfaces);
    const components = theme.components || defaultTheme.components;
    const root = document.documentElement;

    persistUiSettings(theme, pageKey);

    root.dataset.theme = mode;
    root.dataset.textSize = textSize;

    root.dataset.headerTexture = surfaces.header?.texture || defaultTheme.surfaces.header.texture;
    root.dataset.sectionTexture = surfaces.section?.texture || defaultTheme.surfaces.section.texture;
    root.dataset.backgroundTexture = surfaces.background?.texture || defaultTheme.surfaces.background.texture;
    root.dataset.dropdownTexture = surfaces.dropdown?.texture || defaultTheme.surfaces.dropdown.texture;

    root.dataset.navbarSurface = components.navbar?.surface || defaultTheme.components.navbar.surface;
    root.dataset.heroSurface = components.hero?.surface || defaultTheme.components.hero.surface;
    root.dataset.sectionCardSurface = components.sectionCard?.surface || defaultTheme.components.sectionCard.surface;
    root.dataset.quickLinkCardSurface = components.quickLinkCard?.surface || defaultTheme.components.quickLinkCard.surface;
    root.dataset.quoteCardSurface = components.quoteCard?.surface || defaultTheme.components.quoteCard.surface;
    root.dataset.statCardSurface = components.statCard?.surface || defaultTheme.components.statCard.surface;
    root.dataset.cardSurface = components.card?.surface || defaultTheme.components.card.surface;
    root.dataset.dropdownCardSurface = components.dropdownCard?.surface || defaultTheme.components.dropdownCard.surface;
    root.dataset.embedSurface = components.embed?.surface || defaultTheme.components.embed.surface;
    root.dataset.metricSurface = components.metric?.surface || defaultTheme.components.metric.surface;
    root.dataset.inputSurface = components.input?.surface || defaultTheme.components.input.surface;

    updateThemeModeUi(mode);

    const isDark = mode === "dark";

    root.style.setProperty(
      "--header-color",
      isDark ? "#0f172a" : (surfaces.header?.color || defaultTheme.surfaces.header.color)
    );

    root.style.setProperty(
      "--section-color",
      isDark ? "#1e293b" : (surfaces.section?.color || defaultTheme.surfaces.section.color)
    );

    root.style.setProperty(
      "--background-color",
      isDark ? "#020617" : (surfaces.background?.color || defaultTheme.surfaces.background.color)
    );

    root.style.setProperty(
      "--dropdown-color",
      isDark ? "#111827" : (surfaces.dropdown?.color || defaultTheme.surfaces.dropdown.color)
    );
  }

  async function saveState(nextState = state, options = {}) {
    const { silent = false } = options;

    if (!hasLoadedInitialState) return;

    if (isSaving) {
      pendingSave = true;
      state = normalizeState(nextState);
      return;
    }

    isSaving = true;
    state = normalizeState(nextState);

    if (!silent) {
      setStatus("Saving...", "neutral");
    }

    try {
      applyTheme(state);
      await persistState(state);

      if (!silent) {
        setStatus("Saved", "success");
      }
    } catch (error) {
      console.error(error);
      if (!silent) {
        setStatus("Unable to save", "error");
      }
    } finally {
      isSaving = false;

      if (pendingSave) {
        pendingSave = false;
        await saveState(state, options);
      }
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

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeObject(value) {
    return value && typeof value === "object" ? value : {};
  }

  function renderPreview(payload, draftState = state) {
    const apiProfile = payload?.profile;

    if (!apiProfile && !draftState) {
      previewRoot.innerHTML = `<p>Preview unavailable.</p>`;
      return;
    }

    const profile = {
      ...(apiProfile || {}),
      ...(draftState || {}),
      visibility: {
        ...(apiProfile?.visibility || {}),
        ...(draftState?.visibility || {}),
        avatar:
          typeof draftState?.visibility?.avatar === "boolean"
            ? draftState.visibility.avatar
            : apiProfile?.visibility?.avatar,
      },
      statsDisplay: {
        ...(apiProfile?.statsDisplay || {}),
        ...(draftState?.statsDisplay || {}),
      },
      interactiveData: apiProfile?.interactiveData || {},
      portfolioMode:
        draftState?.statsDisplay?.portfolioMode ||
        apiProfile?.portfolioMode ||
        "link",
    };

    const fitness = safeObject(profile?.interactiveData?.fitness);
    const hobbies = safeObject(profile?.interactiveData?.hobbies);

    previewRoot.innerHTML = `
      <div class="preview-stack">
        ${renderProfileHeroPreview(profile, {
          shellClassName: "preview-card preview-profile-hero-card",
          bannerClassName: "preview-profile-banner",
          bodyClassName: "preview-profile-body",
          copyClassName: "preview-profile-copy",
          avatarWrapClassName: "preview-profile-avatar-row",
          avatarAlignmentClassPrefix: "preview-avatar-align-",
          avatarFrameClassName: "preview-profile-avatar",
          avatarImageClassName: "preview-profile-avatar-image",
          avatarFallbackClassName: "preview-profile-avatar-fallback",
        })}

        <div class="grid three">
          ${safeArray(fitness?.overviewCards).map((item) => `
            <article class="preview-stat-card">
              <p class="metric-label">${escapeHtml(item?.label || "")}</p>
              <h4>${escapeHtml(formatPreviewValue(item?.value))}</h4>
            </article>
          `).join("")}
        </div>

        <article class="preview-card">
          <h4>Weightlifting sections</h4>
          <p>${safeArray(fitness?.sections).map((item) => escapeHtml(item?.label || item?.id)).join(", ") || "None yet"}</p>
        </article>

        <article class="preview-card">
          <h4>Cardio types</h4>
          <p>${safeArray(fitness?.cardioTypes).map((item) => escapeHtml(item?.label || item?.id)).join(", ") || "None yet"}</p>
        </article>

        <article class="preview-card">
          <h4>Hobbies</h4>
          <p>${safeArray(hobbies?.hobbies).map((item) => escapeHtml(item?.name || item?.id)).join(", ") || "None yet"}</p>
        </article>

        <article class="preview-card">
          <h4>Portfolio mode</h4>
          <p>${escapeHtml(profile?.portfolioMode || "link")}</p>
        </article>
      </div>
    `;
  }

  async function refreshPreview() {
    previewRoot.innerHTML = `<p>Refreshing preview...</p>`;

    try {
      const response = await fetch(`/api/profile/public?preview=1`, {
        credentials: "include",
        cache: "no-store",
      });

      const payload = await response.json().catch(() => ({}));
      renderPreview(payload, normalizeState(collectState()));
    } catch (error) {
      console.error(error);
      renderPreview({ profile: {} }, normalizeState(collectState()));
    }
  }

  function schedulePreviewRefresh() {
    if (previewRefreshTimer) {
      clearTimeout(previewRefreshTimer);
    }

    previewRefreshTimer = window.setTimeout(() => {
      refreshPreview();
    }, 350);
  }


  async function persistAvatarCrop(options = {}) {
    const { silent = true, successMessage = "Avatar crop saved" } = options;
    state = normalizeState(collectState());
    refreshSnapshot(state);
    applyTheme(state);
    await saveState(state, { silent });
    renderPreview({ profile: {} }, state);
    schedulePreviewRefresh();

    if (successMessage) {
      setStatus(successMessage, "success");
    }
  }

  function attachAvatarCropInteractions() {
    const preview = byId("avatar-editor-preview");
    const image = byId("avatar-editor-preview-image");
    const fallback = byId("avatar-editor-preview-fallback");

    if (!preview || !image || !fallback) return;

    image.addEventListener("load", () => {
      avatarImageNaturalWidth = image.naturalWidth || 0;
      avatarImageNaturalHeight = image.naturalHeight || 0;
      image.hidden = !getAvatarSource(normalizeState(collectState()));
      fallback.style.display = image.hidden ? "grid" : "none";
    });

    image.addEventListener("error", () => {
      avatarImageNaturalWidth = 0;
      avatarImageNaturalHeight = 0;
      image.hidden = true;
      fallback.style.display = "grid";
      setStatus("Avatar image loaded in state but could not be rendered.", "error");
    });

    if (image.complete && image.naturalWidth > 0) {
      avatarImageNaturalWidth = image.naturalWidth || 0;
      avatarImageNaturalHeight = image.naturalHeight || 0;
      image.hidden = !getAvatarSource(normalizeState(collectState()));
      fallback.style.display = image.hidden ? "grid" : "none";
    }

    const finishDrag = async () => {
      if (!cropDragState) return;
      const pointerId = cropDragState.pointerId;
      cropDragState = null;
      preview.classList.remove("is-dragging");
      if (preview.hasPointerCapture?.(pointerId)) {
        preview.releasePointerCapture(pointerId);
      }
      await persistAvatarCrop({ silent: true, successMessage: "Avatar crop saved" });
    };

    preview.addEventListener("pointerdown", (event) => {
      const liveState = normalizeState(collectState());
      if (!getAvatarSource(liveState)) return;

      cropDragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startPositionX: getAvatarCropValue("avatar-position-x", liveState.avatarPositionX ?? 50),
        startPositionY: getAvatarCropValue("avatar-position-y", liveState.avatarPositionY ?? 50),
      };

      preview.classList.add("is-dragging");
      preview.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    });

    preview.addEventListener("pointermove", (event) => {
      if (!cropDragState || cropDragState.pointerId !== event.pointerId) return;

      const liveState = normalizeState(collectState());
      const zoom = Number(liveState.avatarZoom || 1);
      const frameRect = preview.getBoundingClientRect();
      const renderMetrics = getAvatarRenderMetrics(frameRect, zoom);
      const deltaX = event.clientX - cropDragState.startX;
      const deltaY = event.clientY - cropDragState.startY;
      const widthRange = (frameRect.width || 0) - renderMetrics.width;
      const heightRange = (frameRect.height || 0) - renderMetrics.height;

      const nextX = clamp(
        cropDragState.startPositionX + (widthRange ? (deltaX / widthRange) * 100 : 0),
        0,
        100
      );
      const nextY = clamp(
        cropDragState.startPositionY + (heightRange ? (deltaY / heightRange) * 100 : 0),
        0,
        100
      );

      setAvatarCropValue("avatar-position-x", nextX);
      setAvatarCropValue("avatar-position-y", nextY);

      const nextState = normalizeState({
        ...liveState,
        avatarPositionX: nextX,
        avatarPositionY: nextY,
      });

      refreshSnapshot(nextState);
      event.preventDefault();
    });

    preview.addEventListener("pointerup", () => {
      finishDrag();
    });

    preview.addEventListener("pointercancel", () => {
      finishDrag();
    });

    preview.addEventListener("lostpointercapture", () => {
      finishDrag();
    });
  }

  async function syncFromInputs(options = {}) {
    const shouldPersistCrop = options.persistCrop === true;
    state = normalizeState(collectState());
    refreshSnapshot(state);
    applyTheme(state);
    updateAvatarEditorPreview(state);

    if (shouldPersistCrop) {
      await persistAvatarCrop({
        silent: options.silent !== false,
        successMessage: options.successMessage || "Avatar crop saved",
      });
      return;
    }

    await saveState(state, options);
    renderPreview({ profile: {} }, state);
    schedulePreviewRefresh();
  }

  async function handleAvatarFileChange(file) {
    if (!file) return;

    setStatus("Uploading avatar...", "neutral");

    try {
      const uploaded = await uploadAvatarFile(file);
      const fileUrl = String(uploaded?.fileUrl || "");

      state = normalizeState({
        ...collectState(),
        avatarFileDataUrl: "",
        avatarUrl: fileUrl,
      });

      setValue("avatarUrl", fileUrl);
      refreshSnapshot(state);
      updateAvatarEditorPreview(state);
      await saveState(state, { silent: true });
      renderPreview({ profile: {} }, state);
      schedulePreviewRefresh();
      setStatus("Avatar uploaded", "success");
    } catch (error) {
      console.error(error);
      setStatus(
        error instanceof Error ? error.message : "Unable to upload avatar",
        "error"
      );
    }
  }

  function attachAutoSaveListeners() {
    const fieldIds = [
      "email",
      "username",
      "handle",
      "displayName",
      "headline",
      "location",
      "avatarUrl",
      "bannerUrl",
      "bio",
      "visibility-profile",
      "visibility-avatar",
      "visibility-bio",
      "visibility-stats",
      "visibility-portfolio",
      "visibility-activity",
      "visibility-achievements",
      "visibility-contact",
      "avatar-visible",
      "avatar-alignment",
      "avatar-shape",
      "avatar-circular-crop",
      "avatar-size",
      "avatar-zoom",
      "avatar-position-x",
      "avatar-position-y",
      "stats-fitness",
      "stats-hobbies",
      "stats-display-auto",
      "stats-display-overview",
      "stats-display-sections",
      "stats-display-workouts",
      "stats-display-cardio",
      "stats-display-recent",
      "stats-default-range",
      "stats-default-section",
      "stats-default-workout",
      "stats-default-cardio-type",
      "stats-default-hobby-id",
      "stats-default-hobby-stage-id",
      "stats-portfolio-mode",
      "notifications-email",
      "notifications-push",
      "notifications-product",
      "notifications-reminders",
      "notifications-marketing",
      "ui-scope",
      "ui-mode",
      "ui-text-size",
      "ui-header-color",
      "ui-header-texture",
      "ui-section-color",
      "ui-section-texture",
      "ui-background-color",
      "ui-background-texture",
      "ui-dropdown-color",
      "ui-dropdown-texture",
      "component-navbar-surface",
      "component-hero-surface",
      "component-section-card-surface",
      "component-quick-link-card-surface",
      "component-quote-card-surface",
      "component-stat-card-surface",
      "component-card-surface",
      "component-dropdown-card-surface",
      "component-embed-surface",
      "component-metric-surface",
      "component-input-surface",
    ];

    fieldIds.forEach((id) => {
      const el = byId(id);
      if (!el) return;

      const eventName =
        el.tagName === "SELECT" || el.type === "checkbox" || el.type === "range" ? "change" : "input";

      el.addEventListener(eventName, async () => {
        await syncFromInputs({ silent: true });
      });

      if (el.type === "range") {
        el.addEventListener("input", () => {
          const liveState = normalizeState(collectState());
          refreshSnapshot(liveState);
        });
      }
    });
  }

  document.getElementById("save-profile-settings-btn")?.addEventListener("click", async () => {
    state = normalizeState(collectState());
    refreshSnapshot(state);
    setStatus("Saving...", "neutral");
    applyTheme(state);
    await saveState(state);
    refreshPreview();
  });

  document.getElementById("refresh-preview-btn")?.addEventListener("click", async () => {
    state = normalizeState(collectState());
    refreshSnapshot(state);
    await refreshPreview();
  });

  document.getElementById("change-password-btn")?.addEventListener("click", () => {
    window.location.href = "/forgot-password";
  });

  document.getElementById("avatar-upload-trigger")?.addEventListener("click", () => {
    byId("avatarFile")?.click();
  });

  document.getElementById("avatar-save-crop-btn")?.addEventListener("click", async () => {
    await syncFromInputs({
      silent: true,
      persistCrop: true,
      successMessage: "Avatar crop saved",
    });
  });

  document.getElementById("avatarFile")?.addEventListener("change", async (event) => {
    const file = event.target?.files?.[0];
    await handleAvatarFileChange(file);
  });

  document.getElementById("avatar-clear-btn")?.addEventListener("click", async () => {
    const fileInput = byId("avatarFile");
    if (fileInput) fileInput.value = "";

    state = normalizeState({
      ...collectState(),
      avatarFileDataUrl: "",
      avatarUrl: "",
    });

    setValue("avatarUrl", "");
    refreshSnapshot(state);
    await saveState(state, { silent: true });
    renderPreview({ profile: {} }, state);
    schedulePreviewRefresh();
  });

  async function init() {
    setStatus("Loading...", "neutral");

    const saved = await loadState();
    state = normalizeState(saved);

    applyState(state);
    applyTheme(state);
    attachAutoSaveListeners();
    attachAvatarCropInteractions();

    hasLoadedInitialState = true;

    await refreshPreview();
    setStatus("Ready", "success");
  }

  init();
      
}
