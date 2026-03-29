// @ts-nocheck
import { renderProfileAvatarMarkup, escapeProfileHtml } from "../profile/clientPrimitives";

interface PublicProfileClientConfig {
  username: string;
}

export function initPublicProfilePage(config: PublicProfileClientConfig) {
  const pageRoot = document.getElementById("public-profile-page");
  const root = document.getElementById("public-profile-root");
  const username = config.username || pageRoot?.getAttribute("data-username") || "";

      let currentProfile = null;
      let uiState = {
        range: "30d",
        section: "all",
        workout: "all",
        cardioType: "all",
        hobbyId: "all",
        hobbyStageId: "all",
      };

      function escapeHtml(value) {
        return escapeProfileHtml(value);
      }

      function safeArray(value) {
        return Array.isArray(value) ? value : [];
      }

      function safeObject(value) {
        return value && typeof value === "object" ? value : {};
      }

      function renderEmpty(message) {
        root.innerHTML = `
          <article class="card empty-profile-card dropdown-card">
            <h2 class="section-title">Profile unavailable</h2>
            <p>${escapeHtml(message)}</p>
          </article>
        `;
      }

      function renderBadge(badge) {
        return `
          <span class="profile-badge">
            ${badge?.icon ? `<span>${escapeHtml(badge.icon)}</span>` : ""}
            ${escapeHtml(badge?.label || "")}
          </span>
        `;
      }

      function renderMetricCards(items, title, subtitle) {
        if (!items.length) return "";
        return `
          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">${escapeHtml(title)}</h2>
                <p class="section-subtitle">${escapeHtml(subtitle)}</p>
              </div>
            </div>
            <div class="grid three">
              ${items.map((item) => `
                <article class="profile-stat-card stat-card">
                  <p class="stat-card-label">${escapeHtml(item?.label || "")}</p>
                  <h3 class="stat-card-value">${escapeHtml(item?.value || "")}</h3>
                  ${item?.description ? `<p class="stat-card-description">${escapeHtml(item.description)}</p>` : ""}
                </article>
              `).join("")}
            </div>
          </section>
        `;
      }

      function getSelectedSection(profile) {
        const sections = safeArray(profile?.interactiveData?.fitness?.sections);
        if (!sections.length) return null;

        if (uiState.section === "all") return sections[0];
        return sections.find((item) => item.id === uiState.section) || sections[0];
      }

      function getSelectedWorkout(section) {
        const workouts = safeArray(section?.workouts);
        if (!workouts.length) return null;
        if (uiState.workout === "all") return workouts[0];
        return workouts.find((item) => item.id === uiState.workout || item.name === uiState.workout) || workouts[0];
      }

      function getSelectedCardioType(profile) {
        const items = safeArray(profile?.interactiveData?.fitness?.cardioTypes);
        if (!items.length) return null;
        if (uiState.cardioType === "all") return items[0];
        return items.find((item) => item.id === uiState.cardioType) || items[0];
      }

      function getSelectedHobby(profile) {
        const items = safeArray(profile?.interactiveData?.hobbies?.hobbies);
        if (!items.length) return null;
        if (uiState.hobbyId === "all") return items[0];
        return items.find((item) => item.id === uiState.hobbyId) || items[0];
      }

      function getSelectedHobbyStage(hobby) {
        const items = safeArray(hobby?.stages);
        if (!items.length) return null;
        if (uiState.hobbyStageId === "all") return items[0];
        return items.find((item) => item.id === uiState.hobbyStageId) || items[0];
      }

      function formatChartValue(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return "";

        if (Math.abs(num) >= 100) return String(Math.round(num));
        if (Math.abs(num) >= 10) return num.toFixed(1);
        return num.toFixed(2);
      }

      function renderSparkline(series, label) {
        const points = safeArray(series).filter((item) => Number.isFinite(Number(item?.y)));

        if (!points.length) {
          return `
            <article class="chart-card dropdown-card">
              <div class="chart-header">
                <h4>${escapeHtml(label)}</h4>
              </div>
              <p class="meta">No data yet</p>
            </article>
          `;
        }

        const width = 340;
        const height = 160;
        const paddingLeft = 42;
        const paddingRight = 18;
        const paddingTop = 18;
        const paddingBottom = 24;

        const values = points.map((p) => Number(p.y));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = Math.max(max - min, 1);

        const yTop = max;
        const yMid = min + range / 2;
        const yBottom = min;

        function getX(index) {
          return points.length === 1
            ? (width - paddingLeft - paddingRight) / 2 + paddingLeft
            : paddingLeft + (index * (width - paddingLeft - paddingRight)) / Math.max(points.length - 1, 1);
        }

        function getY(value) {
          return (
            height -
            paddingBottom -
            ((value - min) / range) * (height - paddingTop - paddingBottom)
          );
        }

        const normalizedPoints = points.map((point, index) => ({
          x: getX(index),
          y: getY(Number(point.y)),
          rawX: point.x,
          rawY: Number(point.y),
        }));

        const path = normalizedPoints
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
          .join(" ");

        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const delta = lastValue - firstValue;
        const deltaText = `${delta > 0 ? "+" : ""}${formatChartValue(delta)}`;

        const topLineY = getY(yTop);
        const midLineY = getY(yMid);
        const bottomLineY = getY(yBottom);

        return `
          <article class="chart-card dropdown-card">
            <div class="chart-header">
              <div>
                <h4>${escapeHtml(label)}</h4>
                <p class="meta">Latest: ${escapeHtml(formatChartValue(lastValue))}</p>
              </div>
              <p class="meta">Change: ${escapeHtml(deltaText)}</p>
            </div>

            <svg viewBox="0 0 ${width} ${height}" class="sparkline" role="img" aria-label="${escapeHtml(label)} trend">
              <line x1="${paddingLeft}" y1="${topLineY}" x2="${width - paddingRight}" y2="${topLineY}" class="chart-grid-line"></line>
              <line x1="${paddingLeft}" y1="${midLineY}" x2="${width - paddingRight}" y2="${midLineY}" class="chart-grid-line"></line>
              <line x1="${paddingLeft}" y1="${bottomLineY}" x2="${width - paddingRight}" y2="${bottomLineY}" class="chart-grid-line"></line>
              <line x1="${paddingLeft}" y1="${paddingTop}" x2="${paddingLeft}" y2="${height - paddingBottom}" class="chart-grid-line"></line>

              <text x="${paddingLeft - 6}" y="${topLineY + 4}" text-anchor="end" class="chart-axis-label">${escapeHtml(formatChartValue(yTop))}</text>
              <text x="${paddingLeft - 6}" y="${midLineY + 4}" text-anchor="end" class="chart-axis-label">${escapeHtml(formatChartValue(yMid))}</text>
              <text x="${paddingLeft - 6}" y="${bottomLineY + 4}" text-anchor="end" class="chart-axis-label">${escapeHtml(formatChartValue(yBottom))}</text>

              ${
                normalizedPoints.length === 1
                  ? `<circle cx="${normalizedPoints[0].x}" cy="${normalizedPoints[0].y}" r="4" class="chart-point">
                      <title>${escapeHtml(String(normalizedPoints[0].rawX))}: ${escapeHtml(formatChartValue(normalizedPoints[0].rawY))}</title>
                    </circle>`
                  : `<path d="${path}" fill="none" class="chart-line"></path>
                    ${normalizedPoints
                      .map(
                        (point) => `
                          <circle cx="${point.x}" cy="${point.y}" r="3.5" class="chart-point">
                            <title>${escapeHtml(String(point.rawX))}: ${escapeHtml(formatChartValue(point.rawY))}</title>
                          </circle>
                        `
                      )
                      .join("")}`
              }
            </svg>

            <div class="chart-axis-row">
              <span>${escapeHtml(points[0]?.x || "")}</span>
              <span>${escapeHtml(points[points.length - 1]?.x || "")}</span>
            </div>
          </article>
        `;
      }

      function renderFitnessInteractive(profile) {
        const fitness = safeObject(profile?.interactiveData?.fitness);
        const sections = safeArray(fitness?.sections);
        const section = getSelectedSection(profile);
        const workout = getSelectedWorkout(section);
        const cardioType = getSelectedCardioType(profile);

        const sectionSummary = safeObject(section?.summaryByRange?.[uiState.range] || section?.summaryByRange?.all);
        const cardioSummary = safeObject(cardioType?.summaryByRange?.[uiState.range] || cardioType?.summaryByRange?.all);

        return `
          ${renderMetricCards(safeArray(fitness?.overviewCards), "Fitness Overview", "High-level fitness summary")}

          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Weightlifting</h2>
                <p class="section-subtitle">Choose a time range, body section, and workout to inspect trends</p>
              </div>
            </div>

            <div class="control-grid">
              <label class="field-group">
                <span class="field-label">Time Range</span>
                <select id="fitness-range" class="ui-select">
                  ${["7d", "30d", "90d", "6m", "1y", "all"].map((item) => `
                    <option value="${item}" ${uiState.range === item ? "selected" : ""}>${item}</option>
                  `).join("")}
                </select>
              </label>

              <label class="field-group">
                <span class="field-label">Body Section</span>
                <select id="fitness-section" class="ui-select">
                  <option value="all">Select a section</option>
                  ${sections.map((item) => `
                    <option value="${escapeHtml(item.id)}" ${uiState.section === item.id ? "selected" : ""}>
                      ${escapeHtml(item.label)}
                    </option>
                  `).join("")}
                </select>
              </label>

              <label class="field-group">
                <span class="field-label">Workout</span>
                <select id="fitness-workout" class="ui-select">
                  <option value="all">Select a workout</option>
                  ${safeArray(section?.workouts).map((item) => `
                    <option value="${escapeHtml(item.id)}" ${uiState.workout === item.id ? "selected" : ""}>
                      ${escapeHtml(item.name)}
                    </option>
                  `).join("")}
                </select>
              </label>
            </div>

            <div class="grid two">
              <article class="card summary-card dropdown-card">
                <h3 class="card-title">Quick overview</h3>
                <p><strong>Section:</strong> ${escapeHtml(section?.label || "No section selected")}</p>
                <p><strong>Sessions in range:</strong> ${escapeHtml(String(sectionSummary?.totalSessions ?? 0))}</p>
                <p><strong>Workouts this week:</strong> ${escapeHtml(String(sectionSummary?.workoutsThisWeek ?? 0))}</p>
                <p class="meta">Even when nothing is loaded yet, the selectors still stay available.</p>
              </article>

              <article class="card summary-card dropdown-card">
                <h3 class="card-title">Workout trend</h3>
                <p><strong>Workout:</strong> ${escapeHtml(workout?.name || "No workout selected")}</p>
                <p><strong>Weight:</strong> ${escapeHtml(String(workout?.trendSummary?.firstWeight ?? 0))} → ${escapeHtml(String(workout?.trendSummary?.lastWeight ?? 0))}</p>
                <p><strong>Reps:</strong> ${escapeHtml(String(workout?.trendSummary?.firstReps ?? 0))} → ${escapeHtml(String(workout?.trendSummary?.lastReps ?? 0))}</p>
                <p><strong>Volume:</strong> ${escapeHtml(String(workout?.trendSummary?.firstVolume ?? 0))} → ${escapeHtml(String(workout?.trendSummary?.lastVolume ?? 0))}</p>
                <p><strong>Weight Change:</strong> ${escapeHtml(String(workout?.trendSummary?.weightChange ?? 0))}</p>
                <p><strong>Rep Change:</strong> ${escapeHtml(String(workout?.trendSummary?.repChange ?? 0))}</p>
                <p><strong>Volume Change:</strong> ${escapeHtml(String(workout?.trendSummary?.volumeChange ?? 0))}</p>
              </article>
            </div>

            <div class="grid three">
              ${renderSparkline(workout?.chartSeries?.weight, "Weight")}
              ${renderSparkline(workout?.chartSeries?.reps, "Reps")}
              ${renderSparkline(workout?.chartSeries?.volume, "Volume")}
            </div>
          </section>

          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Cardio</h2>
                <p class="section-subtitle">Pick a cardio type and inspect the stats that make sense for it</p>
              </div>
            </div>

            <div class="control-grid">
              <label class="field-group">
                <span class="field-label">Cardio Type</span>
                <select id="cardio-type" class="ui-select">
                  <option value="all">Select cardio type</option>
                  ${safeArray(fitness?.cardioTypes).map((item) => `
                    <option value="${escapeHtml(item.id)}" ${uiState.cardioType === item.id ? "selected" : ""}>
                      ${escapeHtml(item.label)}
                    </option>
                  `).join("")}
                </select>
              </label>
            </div>

            <div class="grid two">
              <article class="card summary-card dropdown-card">
                <h3 class="card-title">Cardio summary</h3>
                <p><strong>Type:</strong> ${escapeHtml(cardioType?.label || "No cardio selected")}</p>
                <p><strong>Sessions in range:</strong> ${escapeHtml(String(cardioSummary?.totalSessions ?? 0))}</p>
                <p><strong>Workouts this week:</strong> ${escapeHtml(String(cardioSummary?.workoutsThisWeek ?? 0))}</p>
              </article>

              <article class="card summary-card dropdown-card">
                <h3 class="card-title">Recent sessions</h3>
                ${safeArray(cardioType?.recentSessions).slice(0, 3).map((item) => `
                  <p>${escapeHtml(item?.title || "Session")} — ${escapeHtml(item?.date || "")}</p>
                `).join("") || `<p class="meta">No recent sessions yet</p>`}
              </article>
            </div>

            <div class="grid three">
              ${safeArray(cardioType?.metrics).map((metric) => renderSparkline(metric?.chartSeries, metric?.label || "Metric")).join("")}
            </div>
          </section>
        `;
      }

      function renderHobbies(profile) {
        const hobbies = safeObject(profile?.interactiveData?.hobbies);
        const hobby = getSelectedHobby(profile);
        const stage = getSelectedHobbyStage(hobby);

        return `
          ${renderMetricCards(safeArray(hobbies?.overviewCards), "Hobby Overview", "Overall hobby progress and totals")}

          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Hobbies</h2>
                <p class="section-subtitle">Weekly progress plus hobby and stage drilldown</p>
              </div>
            </div>

            <div class="grid three">
              <article class="profile-stat-card stat-card">
                <p class="stat-card-label">Active Hobbies</p>
                <h3 class="stat-card-value">${escapeHtml(String(hobbies?.weeklySummary?.activeHobbies ?? 0))}</h3>
              </article>
              <article class="profile-stat-card stat-card">
                <p class="stat-card-label">Updates This Week</p>
                <h3 class="stat-card-value">${escapeHtml(String(hobbies?.weeklySummary?.updatesThisWeek ?? 0))}</h3>
              </article>
              <article class="profile-stat-card stat-card">
                <p class="stat-card-label">Stage Progress Total</p>
                <h3 class="stat-card-value">${escapeHtml(String(hobbies?.weeklySummary?.stageProgressThisWeek ?? 0))}</h3>
              </article>
            </div>

            <div class="control-grid">
              <label class="field-group">
                <span class="field-label">Hobby</span>
                <select id="hobby-id" class="ui-select">
                  <option value="all">Select a hobby</option>
                  ${safeArray(hobbies?.hobbies).map((item) => `
                    <option value="${escapeHtml(item.id)}" ${uiState.hobbyId === item.id ? "selected" : ""}>
                      ${escapeHtml(item.name)}
                    </option>
                  `).join("")}
                </select>
              </label>

              <label class="field-group">
                <span class="field-label">Stage</span>
                <select id="hobby-stage-id" class="ui-select">
                  <option value="all">Select a stage</option>
                  ${safeArray(hobby?.stages).map((item) => `
                    <option value="${escapeHtml(item.id)}" ${uiState.hobbyStageId === item.id ? "selected" : ""}>
                      ${escapeHtml(item.name)}
                    </option>
                  `).join("")}
                </select>
              </label>
            </div>

            <div class="grid two">
              <article class="card summary-card dropdown-card">
                <h3 class="card-title">${escapeHtml(hobby?.name || "Hobby")}</h3>
                <p><strong>Status:</strong> ${escapeHtml(hobby?.status || "—")}</p>
                <p><strong>Overall Progress:</strong> ${escapeHtml(String(hobby?.overallProgress ?? 0))}%</p>
              </article>

              <article class="card summary-card dropdown-card">
                <h3 class="card-title">${escapeHtml(stage?.name || "Stage")}</h3>
                <p><strong>Status:</strong> ${escapeHtml(stage?.status || "—")}</p>
                <p><strong>Progress:</strong> ${escapeHtml(String(stage?.progress ?? 0))}%</p>
                <p><strong>Target:</strong> ${escapeHtml(stage?.targetDate || "—")}</p>
                ${stage?.update ? `<p>${escapeHtml(stage.update)}</p>` : ""}
              </article>
            </div>
          </section>
        `;
      }

      function renderPinned(items) {
        if (!items.length) return "";
        return `
          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Highlights</h2>
                <p class="section-subtitle">Pinned work and featured items</p>
              </div>
            </div>
            <div class="grid two">
              ${items.map((item) => `
                <article class="card content-card dropdown-card">
                  <p class="meta">${escapeHtml(item?.category || "Highlight")}</p>
                  <h3 class="card-title">${escapeHtml(item?.title || "Pinned item")}</h3>
                  ${item?.description ? `<p>${escapeHtml(item.description)}</p>` : ""}
                  ${item?.href ? `<p class="top-gap-sm"><a href="${escapeHtml(item.href)}">Open</a></p>` : ""}
                </article>
              `).join("")}
            </div>
          </section>
        `;
      }

      function renderPortfolio(profile) {
        if (profile?.portfolioMode !== "link") {
          return "";
        }

        return `
          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Portfolio</h2>
                <p class="section-subtitle">Open the full portfolio in its dedicated page</p>
              </div>
            </div>
            <article class="card content-card dropdown-card">
              <p>This profile uses portfolio link mode instead of rendering portfolio cards here.</p>
              <p class="top-gap-sm">
                <a class="portfolio-link-btn button-secondary" href="${escapeHtml(profile?.portfolioLink || "/career/portfolio")}">Open Portfolio</a>
              </p>
            </article>
          </section>
        `;
      }

      function renderAchievements(badges) {
        if (!badges.length) return "";
        return `
          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Achievements</h2>
                <p class="section-subtitle">Badges and public milestones</p>
              </div>
            </div>
            <div class="badge-row">
              ${badges.map(renderBadge).join("")}
            </div>
          </section>
        `;
      }

      function renderActivity(activity) {
        if (!activity.length) return "";
        return `
          <section class="section">
            <div class="section-header">
              <div>
                <h2 class="section-title">Recent Activity</h2>
                <p class="section-subtitle">Latest public updates</p>
              </div>
            </div>
            <div class="activity-stack">
              ${activity.map((item) => `
                <article class="card content-card dropdown-card">
                  <h3 class="card-title">${escapeHtml(item?.label || "Activity")}</h3>
                  ${item?.date ? `<p class="meta">${escapeHtml(item.date)}</p>` : ""}
                  ${item?.href ? `<p class="top-gap-sm"><a href="${escapeHtml(item.href)}">Open</a></p>` : ""}
                </article>
              `).join("")}
            </div>
          </section>
        `;
      }

      function renderAvatar(profile, visibility) {
        const avatarVisible = profile?.avatarVisible !== false && visibility?.avatar !== false;
        if (!avatarVisible) return "";

        return renderProfileAvatarMarkup(profile, {
          wrapClassName: "profile-avatar-wrap",
          frameClassName: "profile-avatar-frame",
          imageClassName: "profile-avatar-image",
          fallbackClassName: "profile-avatar-fallback",
          includeAriaLabel: true,
        });
      }

      function renderProfile(profile) {
        const badges = safeArray(profile?.badges);
        const pinned = safeArray(profile?.pinned);
        const activity = safeArray(profile?.activity);
        const visibility = profile?.visibility || {};

        root.innerHTML = `
          <section class="section">
            <article class="public-profile-shell">
              <div
                class="profile-banner"
                style="${profile?.bannerUrl ? `background-image:url('${escapeHtml(profile.bannerUrl)}');` : ""}"
              ></div>

              <div class="profile-identity-body">
                ${renderAvatar(profile, visibility)}

                <div class="profile-identity-copy">
                  <div class="profile-name-row">
                    <h2>${escapeHtml(profile?.displayName || profile?.username || "Profile")}</h2>
                    ${profile?.handle ? `<span class="profile-handle">${escapeHtml(profile.handle)}</span>` : ""}
                  </div>

                  ${profile?.headline ? `<p class="profile-headline">${escapeHtml(profile.headline)}</p>` : ""}
                  ${profile?.location ? `<p class="meta">${escapeHtml(profile.location)}</p>` : ""}
                  ${visibility.bio !== false && profile?.bio ? `<p class="profile-bio">${escapeHtml(profile.bio)}</p>` : ""}
                </div>
              </div>
            </article>
          </section>

          ${renderPinned(pinned)}
          ${visibility.stats !== false ? renderFitnessInteractive(profile) : ""}
          ${visibility.stats !== false ? renderHobbies(profile) : ""}
          ${visibility.portfolio !== false ? renderPortfolio(profile) : ""}
          ${visibility.achievements !== false ? renderAchievements(badges) : ""}
          ${visibility.activity !== false ? renderActivity(activity) : ""}
        `;

        bindControls(profile);
      }

      function bindControls(profile) {
        root.querySelector("#fitness-range")?.addEventListener("change", (event) => {
          uiState.range = event.target.value;
          renderProfile(profile);
        });

        root.querySelector("#fitness-section")?.addEventListener("change", (event) => {
          uiState.section = event.target.value;
          uiState.workout = "all";
          renderProfile(profile);
        });

        root.querySelector("#fitness-workout")?.addEventListener("change", (event) => {
          uiState.workout = event.target.value;
          renderProfile(profile);
        });

        root.querySelector("#cardio-type")?.addEventListener("change", (event) => {
          uiState.cardioType = event.target.value;
          renderProfile(profile);
        });

        root.querySelector("#hobby-id")?.addEventListener("change", (event) => {
          uiState.hobbyId = event.target.value;
          uiState.hobbyStageId = "all";
          renderProfile(profile);
        });

        root.querySelector("#hobby-stage-id")?.addEventListener("change", (event) => {
          uiState.hobbyStageId = event.target.value;
          renderProfile(profile);
        });
      }

      async function init() {
        if (!username) {
          renderEmpty("No username was provided.");
          return;
        }

        try {
          const response = await fetch(`/api/profile/public?username=${encodeURIComponent(username)}`, {
            credentials: "include",
            cache: "no-store",
          });

          const payload = await response.json().catch(() => ({}));

          if (!response.ok || !payload?.ok || !payload?.profile) {
            renderEmpty(payload?.error || "This public profile could not be loaded.");
            return;
          }

          currentProfile = payload.profile;
          const defaults = safeObject(currentProfile?.displayConfig);

          uiState.range = defaults?.defaultRange || "30d";
          uiState.section = defaults?.defaultSection || "all";
          uiState.workout = defaults?.defaultWorkout || "all";
          uiState.cardioType = defaults?.defaultCardioType || "all";
          uiState.hobbyId = defaults?.defaultHobbyId || "all";
          uiState.hobbyStageId = defaults?.defaultHobbyStageId || "all";

          renderProfile(currentProfile);
        } catch (error) {
          console.error(error);
          renderEmpty("Something went wrong while loading this profile.");
        }
      }

      init();
}
