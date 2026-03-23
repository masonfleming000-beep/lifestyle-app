// @ts-nocheck
export function initNutritionPage({ defaultGoodFoods = [], defaultBadFoods = [], defaultMicros = [] } = {}) {
  const defaultGoodFoodsList = Array.isArray(defaultGoodFoods) ? defaultGoodFoods : JSON.parse(defaultGoodFoods || '[]');
  const defaultBadFoodsList = Array.isArray(defaultBadFoods) ? defaultBadFoods : JSON.parse(defaultBadFoods || '[]');
  const parsedMicros = typeof defaultMicros === 'string' ? JSON.parse(defaultMicros || '[]') : defaultMicros;
  const defaultMicroTargets = Array.isArray(parsedMicros) ? Object.fromEntries(parsedMicros.filter(Boolean).map((item) => [item.key, item.target])) : (parsedMicros || {});
      const pageKey = "nutrition";
  
      const DEFAULT_MICROS = {
        fiber: 30,
        sodium: 2300,
        potassium: 3500,
        calcium: 1000,
        iron: 18,
        magnesium: 400,
        zinc: 11,
        copper: 0.9,
        niacin: 16,
        ...defaultMicroTargets,
      };
  
      const MICRO_CONFIG = [
        { key: "fiber", label: "Fiber", unit: "g" },
        { key: "sodium", label: "Sodium", unit: "mg" },
        { key: "potassium", label: "Potassium", unit: "mg" },
        { key: "calcium", label: "Calcium", unit: "mg" },
        { key: "iron", label: "Iron", unit: "mg" },
        { key: "magnesium", label: "Magnesium", unit: "mg" },
        { key: "zinc", label: "Zinc", unit: "mg" },
        { key: "copper", label: "Copper", unit: "mg" },
        { key: "niacin", label: "Niacin", unit: "mg" },
      ];
  
      const defaultGoodFoodTexts = new Set(defaultGoodFoodsList);
      const defaultBadFoodTexts = new Set(defaultBadFoodsList);
  
      const goodFoodsListEl = document.getElementById("good-foods-list");
      const badFoodsListEl = document.getElementById("bad-foods-list");
  
      const goodFoodsForm = document.getElementById("good-foods-form");
      const badFoodsForm = document.getElementById("bad-foods-form");
  
      const goodFoodsInput = document.getElementById("good-foods-input");
      const badFoodsInput = document.getElementById("bad-foods-input");
  
      const goodFoodsEditBtn = document.getElementById("good-foods-edit-btn");
      const badFoodsEditBtn = document.getElementById("bad-foods-edit-btn");
  
      const goodFoodsRestoreBtn = document.getElementById("good-foods-restore-btn");
      const badFoodsRestoreBtn = document.getElementById("bad-foods-restore-btn");
  
      let editModes = {
        goodFoods: false,
        badFoods: false,
      };
  
      let hasLoadedInitialState = false;
      let isSaving = false;
      let pendingSave = false;
  
      let state = {
        targets: getDefaultTargets(),
        dailyLogs: {},
        goodFoods: [...defaultGoodFoodsList],
        badFoods: [...defaultBadFoodsList],
        removedDefaults: {
          goodFoods: [],
          badFoods: [],
        },
      };
  
      function formatUpTo4(value) {
        const num = Number(value || 0);
        return num.toFixed(4).replace(/\.?0+$/, "");
      }
  
      function getTodayKey() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
  
      function getPrettyDate() {
        return new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
  
      function uniqueStrings(items = []) {
        return [...new Set((items || []).map((item) => String(item).trim()).filter(Boolean))];
      }
  
      function mergeDefaults(savedItems, defaultItems, removedItems = []) {
        const removedSet = new Set(removedItems || []);
        const merged = uniqueStrings(savedItems);
  
        defaultItems.forEach((item) => {
          const value = String(item).trim();
          if (!value) return;
          if (!merged.includes(value) && !removedSet.has(value)) {
            merged.push(value);
          }
        });
  
        return merged;
      }
  
      function getDefaultTargets() {
        return {
          calories: 2200,
          protein: 180,
          carbs: 220,
          fat: 70,
          waterOz: 125,
          micros: { ...DEFAULT_MICROS },
        };
      }
  
      function getEmptyDailyLog() {
        return { items: [], waterOz: 0 };
      }
  
      function getTodayState() {
        const todayKey = getTodayKey();
        const saved = state?.dailyLogs?.[todayKey];
  
        return {
          items: Array.isArray(saved?.items) ? saved.items : [],
          waterOz: Number(saved?.waterOz || 0),
        };
      }
  
      function setTodayState(nextToday) {
        const todayKey = getTodayKey();
        state.dailyLogs = {
          ...(state.dailyLogs || {}),
          [todayKey]: {
            items: Array.isArray(nextToday?.items) ? nextToday.items : [],
            waterOz: Number(nextToday?.waterOz || 0),
          },
        };
      }
  
      async function loadState() {
        try {
          const res = await fetch(`/api/state?pageKey=${encodeURIComponent(pageKey)}`, {
            credentials: "include",
            cache: "no-store",
          });
  
          if (!res.ok) return null;
  
          const data = await res.json();
          return data?.state ?? null;
        } catch (error) {
          console.error("Failed to load nutrition state:", error);
          return null;
        }
      }
  
      async function saveState() {
        if (!hasLoadedInitialState) return;
  
        if (isSaving) {
          pendingSave = true;
          return;
        }
  
        isSaving = true;
  
        try {
          await fetch("/api/state", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pageKey, state }),
          });
        } catch (error) {
          console.error("Failed to save nutrition state:", error);
        } finally {
          isSaving = false;
  
          if (pendingSave) {
            pendingSave = false;
            await saveState();
          }
        }
      }
  
      function markDefaultDeleted(section, value) {
        const nextValue = String(value || "").trim();
        if (!nextValue) return;
  
        const current = uniqueStrings(state.removedDefaults?.[section] || []);
        if (!current.includes(nextValue)) {
          state.removedDefaults[section] = [...current, nextValue];
        }
      }
  
      function unmarkDefaultDeleted(section, value) {
        const nextValue = String(value || "").trim();
        state.removedDefaults[section] = uniqueStrings(state.removedDefaults?.[section] || []).filter(
          (item) => item !== nextValue
        );
      }
  
      function setTargetInputs() {
        const targets = state.targets || getDefaultTargets();
        document.getElementById("target-calories").value = targets.calories;
        document.getElementById("target-protein").value = targets.protein;
        document.getElementById("target-carbs").value = targets.carbs;
        document.getElementById("target-fat").value = targets.fat;
        document.getElementById("target-water").value = targets.waterOz;
      }
  
      function computeTotals(items) {
        return items.reduce(
          (acc, item) => {
            acc.calories += Number(item.calories || 0);
            acc.protein += Number(item.protein || 0);
            acc.carbs += Number(item.carbs || 0);
            acc.fat += Number(item.fat || 0);
            acc.fiber += Number(item.fiber || 0);
            acc.sodium += Number(item.sodium || 0);
            acc.potassium += Number(item.potassium || 0);
            acc.calcium += Number(item.calcium || 0);
            acc.iron += Number(item.iron || 0);
            acc.magnesium += Number(item.magnesium || 0);
            acc.zinc += Number(item.zinc || 0);
            acc.copper += Number(item.copper || 0);
            acc.niacin += Number(item.niacin || 0);
            return acc;
          },
          {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sodium: 0,
            potassium: 0,
            calcium: 0,
            iron: 0,
            magnesium: 0,
            zinc: 0,
            copper: 0,
            niacin: 0,
          }
        );
      }
  
      function renderMicroProgress(totals, targets) {
        const container = document.getElementById("micro-progress-list");
        container.innerHTML = "";
  
        MICRO_CONFIG.forEach((micro) => {
          const current = Number(totals[micro.key] || 0);
          const target = Number((targets.micros && targets.micros[micro.key]) || DEFAULT_MICROS[micro.key] || 0);
          const row = document.createElement("div");
          row.className = "micro-progress-item";
  
          row.innerHTML = `
            <div>
              <p class="food-log-title">${micro.label}</p>
              <p class="food-log-meta">${formatUpTo4(current)} ${micro.unit} / ${formatUpTo4(target)} ${micro.unit}</p>
            </div>
            <div class="micro-progress-right">
              <span class="pill">${formatUpTo4(Math.max(0, target - current))} ${micro.unit} left</span>
            </div>
          `;
  
          container.appendChild(row);
        });
      }
  
      function renderTotals() {
        const targets = state.targets || getDefaultTargets();
        const todayState = getTodayState();
        const totals = computeTotals(todayState.items);
  
        document.getElementById("total-calories").textContent = formatUpTo4(totals.calories);
        document.getElementById("total-protein").textContent = `${formatUpTo4(totals.protein)}g`;
        document.getElementById("total-carbs").textContent = `${formatUpTo4(totals.carbs)}g`;
        document.getElementById("total-fat").textContent = `${formatUpTo4(totals.fat)}g`;
        document.getElementById("total-water").textContent = `${formatUpTo4(todayState.waterOz)} oz`;
  
        document.getElementById("remaining-calories").textContent = `${formatUpTo4(targets.calories - totals.calories)} remaining`;
        document.getElementById("remaining-protein").textContent = `${formatUpTo4(targets.protein - totals.protein)}g remaining`;
        document.getElementById("remaining-carbs").textContent = `${formatUpTo4(targets.carbs - totals.carbs)}g remaining`;
        document.getElementById("remaining-fat").textContent = `${formatUpTo4(targets.fat - totals.fat)}g remaining`;
        document.getElementById("remaining-water").textContent = `${formatUpTo4(targets.waterOz - todayState.waterOz)} oz remaining`;
  
        document.getElementById("nutrition-date-label").textContent = getPrettyDate();
  
        renderMicroProgress(totals, targets);
      }
  
      function renderFoodLog() {
        const foodLog = document.getElementById("food-log");
        const todayState = getTodayState();
        foodLog.innerHTML = "";
  
        if (!todayState.items.length && !todayState.waterOz) {
          const empty = document.createElement("li");
          empty.className = "food-log-empty";
          empty.textContent = "No nutrition logged yet today.";
          foodLog.appendChild(empty);
          renderTotals();
          return;
        }
  
        if (todayState.waterOz > 0) {
          const waterLi = document.createElement("li");
          waterLi.className = "food-log-item";
          waterLi.innerHTML = `
            <div class="food-log-left">
              <h3 class="food-log-title">Water</h3>
              <p class="food-log-meta">${formatUpTo4(todayState.waterOz)} oz logged</p>
            </div>
          `;
          foodLog.appendChild(waterLi);
        }
  
        todayState.items.forEach((item, index) => {
          const li = document.createElement("li");
          li.className = "food-log-item";
  
          const left = document.createElement("div");
          left.className = "food-log-left";
  
          const title = document.createElement("h3");
          title.className = "food-log-title";
          title.textContent = item.name;
  
          const meta = document.createElement("p");
          meta.className = "food-log-meta";
          meta.textContent = `${formatUpTo4(item.calories)} cal · ${formatUpTo4(item.protein)}P · ${formatUpTo4(item.carbs)}C · ${formatUpTo4(item.fat)}F · ${formatUpTo4(item.fiber || 0)} fiber`;
  
          left.appendChild(title);
          left.appendChild(meta);
  
          const removeBtn = document.createElement("button");
          removeBtn.type = "button";
          removeBtn.className = "todo-remove";
          removeBtn.textContent = "Remove";
          removeBtn.addEventListener("click", async () => {
            const nextToday = getTodayState();
            nextToday.items.splice(index, 1);
            setTodayState(nextToday);
            renderFoodLog();
            await saveState();
          });
  
          li.appendChild(left);
          li.appendChild(removeBtn);
          foodLog.appendChild(li);
        });
  
        renderTotals();
      }
  
      function updateEditUI() {
        if (goodFoodsEditBtn) {
          goodFoodsEditBtn.textContent = editModes.goodFoods ? "Done" : "Edit";
        }
        if (badFoodsEditBtn) {
          badFoodsEditBtn.textContent = editModes.badFoods ? "Done" : "Edit";
        }
  
        if (goodFoodsForm) {
          goodFoodsForm.style.display = editModes.goodFoods ? "flex" : "none";
        }
        if (badFoodsForm) {
          badFoodsForm.style.display = editModes.badFoods ? "flex" : "none";
        }
      }
  
      function createDeleteButton(onClick, isVisible) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Delete";
        btn.className = "todo-add-btn";
        btn.style.marginLeft = "0.75rem";
        btn.style.display = isVisible ? "inline-block" : "none";
        btn.addEventListener("click", onClick);
        return btn;
      }
  
      function renderSimpleEditableList(listEl, items, sectionKey, defaultSet, isEditing) {
        if (!listEl) return;
        listEl.innerHTML = "";
  
        if (!items.length) {
          const li = document.createElement("li");
          li.className = "food-log-empty";
          li.textContent = "No items yet.";
          listEl.appendChild(li);
          return;
        }
  
        items.forEach((item, index) => {
          const li = document.createElement("li");
          li.className = "food-log-item";
  
          const row = document.createElement("div");
          row.style.display = "flex";
          row.style.alignItems = "center";
          row.style.justifyContent = "space-between";
          row.style.gap = "0.75rem";
          row.style.width = "100%";
  
          const label = document.createElement("div");
          label.className = "food-log-left";
          label.style.flex = "1";
  
          const text = document.createElement("h3");
          text.className = "food-log-title";
          text.textContent = item;
  
          label.appendChild(text);
  
          const deleteBtn = createDeleteButton(async () => {
            const removed = state[sectionKey][index];
  
            if (defaultSet.has(removed)) {
              markDefaultDeleted(sectionKey, removed);
            }
  
            state[sectionKey].splice(index, 1);
            renderGoodBadFoods();
            await saveState();
          }, isEditing);
  
          row.appendChild(label);
          row.appendChild(deleteBtn);
          li.appendChild(row);
          listEl.appendChild(li);
        });
      }
  
      function renderGoodBadFoods() {
        renderSimpleEditableList(
          goodFoodsListEl,
          uniqueStrings(state.goodFoods),
          "goodFoods",
          defaultGoodFoodTexts,
          editModes.goodFoods
        );
  
        renderSimpleEditableList(
          badFoodsListEl,
          uniqueStrings(state.badFoods),
          "badFoods",
          defaultBadFoodTexts,
          editModes.badFoods
        );
      }
  
      function restoreSection(section) {
        if (section === "goodFoods") {
          state.removedDefaults.goodFoods = [];
          state.goodFoods = mergeDefaults(
            state.goodFoods,
            defaultGoodFoodsList,
            []
          );
          renderGoodBadFoods();
          return;
        }
  
        if (section === "badFoods") {
          state.removedDefaults.badFoods = [];
          state.badFoods = mergeDefaults(
            state.badFoods,
            defaultBadFoodsList,
            []
          );
          renderGoodBadFoods();
        }
      }
  
      async function searchNutrition(query) {
        const res = await fetch(`/api/nutrition-search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        return Array.isArray(data.results) ? data.results : [];
      }
  
      async function fetchNutritionDetail(url) {
        const res = await fetch(`/api/nutrition-detail?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error("Detail fetch failed");
        return res.json();
      }
  
      function setField(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value !== undefined && value !== null ? value : "";
      }
  
      function renderSearchResults(results) {
        const list = document.getElementById("nutrition-search-results");
        list.innerHTML = "";
  
        if (!results.length) {
          const li = document.createElement("li");
          li.className = "food-log-empty";
          li.textContent = "No search results found.";
          list.appendChild(li);
          return;
        }
  
        results.forEach((result) => {
          const li = document.createElement("li");
          li.className = "food-log-item";
  
          const left = document.createElement("div");
          left.className = "food-log-left";
  
          const title = document.createElement("h3");
          title.className = "food-log-title";
          title.textContent = result.title;
  
          const meta = document.createElement("p");
          meta.className = "food-log-meta";
          meta.textContent = result.url;
  
          left.appendChild(title);
          left.appendChild(meta);
  
          const button = document.createElement("button");
          button.type = "button";
          button.className = "todo-add-btn";
          button.textContent = "Use";
  
          button.addEventListener("click", async () => {
            button.disabled = true;
            button.textContent = "Loading...";
  
            try {
              const item = await fetchNutritionDetail(result.url);
  
              setField("food-name", item.name || result.title || "");
              setField("food-calories", item.calories);
              setField("food-protein", item.protein);
              setField("food-carbs", item.carbs);
              setField("food-fat", item.fat);
              setField("food-fiber", item.fiber);
              setField("food-sugars", item.sugars);
              setField("food-sodium", item.sodium);
              setField("food-potassium", item.potassium);
              setField("food-calcium", item.calcium);
              setField("food-iron", item.iron);
              setField("food-magnesium", item.magnesium);
              setField("food-zinc", item.zinc);
              setField("food-copper", item.copper);
              setField("food-niacin", item.niacin?.value ?? item.niacin ?? 0);
            } catch (err) {
              console.error(err);
              alert("Could not load that food.");
            } finally {
              button.disabled = false;
              button.textContent = "Use";
            }
          });
  
          li.appendChild(left);
          li.appendChild(button);
          list.appendChild(li);
        });
      }
  
      document.getElementById("nutrition-search-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const input = document.getElementById("nutrition-search-input");
        const query = input.value.trim();
        if (!query) return;
  
        const resultsEl = document.getElementById("nutrition-search-results");
        resultsEl.innerHTML = `<li class="food-log-empty">Searching...</li>`;
  
        try {
          const results = await searchNutrition(query);
          renderSearchResults(results);
        } catch (err) {
          console.error(err);
          resultsEl.innerHTML = `<li class="food-log-empty">Search failed.</li>`;
        }
      });
  
      document.getElementById("macro-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        state.targets = {
          ...(state.targets || getDefaultTargets()),
          calories: Number(document.getElementById("target-calories").value || 0),
          protein: Number(document.getElementById("target-protein").value || 0),
          carbs: Number(document.getElementById("target-carbs").value || 0),
          fat: Number(document.getElementById("target-fat").value || 0),
          waterOz: Number(document.getElementById("target-water").value || 0),
        };
  
        renderTotals();
        await saveState();
      });
  
      document.getElementById("macro-autofill-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const weight = Number(document.getElementById("bodyweight-lb")?.value || 0);
        const caloriesPerLb = Number(document.getElementById("calories-per-lb")?.value || 14);
        const proteinPerLb = Number(document.getElementById("protein-per-lb")?.value || 1.0);
        const carbsPerLb = Number(document.getElementById("carbs-per-lb")?.value || 1.2);
        const fatPerLb = Number(document.getElementById("fat-per-lb")?.value || 0.35);
        const waterPerLb = Number(document.getElementById("water-per-lb")?.value || 0.67);
  
        if (!weight) return;
  
        document.getElementById("target-calories").value = (weight * caloriesPerLb).toFixed(4);
        document.getElementById("target-protein").value = (weight * proteinPerLb).toFixed(4);
        document.getElementById("target-carbs").value = (weight * carbsPerLb).toFixed(4);
        document.getElementById("target-fat").value = (weight * fatPerLb).toFixed(4);
        document.getElementById("target-water").value = (weight * waterPerLb).toFixed(4);
  
        state.targets = {
          ...(state.targets || getDefaultTargets()),
          calories: Number((weight * caloriesPerLb).toFixed(4)),
          protein: Number((weight * proteinPerLb).toFixed(4)),
          carbs: Number((weight * carbsPerLb).toFixed(4)),
          fat: Number((weight * fatPerLb).toFixed(4)),
          waterOz: Number((weight * waterPerLb).toFixed(4)),
        };
  
        renderTotals();
        await saveState();
      });
  
      document.getElementById("food-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        const item = {
          name: document.getElementById("food-name").value.trim(),
          calories: Number(document.getElementById("food-calories").value || 0),
          protein: Number(document.getElementById("food-protein").value || 0),
          carbs: Number(document.getElementById("food-carbs").value || 0),
          fat: Number(document.getElementById("food-fat").value || 0),
          fiber: Number(document.getElementById("food-fiber").value || 0),
          sugars: Number(document.getElementById("food-sugars").value || 0),
          sodium: Number(document.getElementById("food-sodium").value || 0),
          potassium: Number(document.getElementById("food-potassium").value || 0),
          calcium: Number(document.getElementById("food-calcium").value || 0),
          iron: Number(document.getElementById("food-iron").value || 0),
          magnesium: Number(document.getElementById("food-magnesium").value || 0),
          zinc: Number(document.getElementById("food-zinc").value || 0),
          copper: Number(document.getElementById("food-copper").value || 0),
          niacin: Number(document.getElementById("food-niacin").value || 0),
        };
  
        if (!item.name) return;
  
        const todayState = getTodayState();
        todayState.items.unshift(item);
        setTodayState(todayState);
  
        document.getElementById("food-form").reset();
        renderFoodLog();
        await saveState();
      });
  
      document.getElementById("water-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const amount = Number(document.getElementById("water-amount").value || 0);
        if (!amount) return;
  
        const todayState = getTodayState();
        todayState.waterOz = Number(todayState.waterOz || 0) + amount;
        setTodayState(todayState);
  
        document.getElementById("water-form").reset();
        renderFoodLog();
        await saveState();
      });
  
      document.getElementById("clear-food-log")?.addEventListener("click", async () => {
        setTodayState(getEmptyDailyLog());
        renderFoodLog();
        await saveState();
      });
  
      document.getElementById("calculator-apply-form")?.addEventListener("submit", async (e) => {
        e.preventDefault();
  
        state.targets = {
          ...(state.targets || getDefaultTargets()),
          calories: Number(document.getElementById("calc-calories").value || 0),
          protein: Number(document.getElementById("calc-protein").value || 0),
          carbs: Number(document.getElementById("calc-carbs").value || 0),
          fat: Number(document.getElementById("calc-fat").value || 0),
          waterOz: Number(document.getElementById("calc-water").value || 0),
        };
  
        document.getElementById("target-calories").value = state.targets.calories;
        document.getElementById("target-protein").value = state.targets.protein;
        document.getElementById("target-carbs").value = state.targets.carbs;
        document.getElementById("target-fat").value = state.targets.fat;
        document.getElementById("target-water").value = state.targets.waterOz;
  
        renderTotals();
        await saveState();
      });
  
      goodFoodsEditBtn?.addEventListener("click", () => {
        editModes.goodFoods = !editModes.goodFoods;
        updateEditUI();
        renderGoodBadFoods();
      });
  
      badFoodsEditBtn?.addEventListener("click", () => {
        editModes.badFoods = !editModes.badFoods;
        updateEditUI();
        renderGoodBadFoods();
      });
  
      goodFoodsRestoreBtn?.addEventListener("click", async () => {
        restoreSection("goodFoods");
        await saveState();
      });
  
      badFoodsRestoreBtn?.addEventListener("click", async () => {
        restoreSection("badFoods");
        await saveState();
      });
  
      goodFoodsForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const value = goodFoodsInput.value.trim();
        if (!value) return;
  
        unmarkDefaultDeleted("goodFoods", value);
        state.goodFoods = uniqueStrings([value, ...(state.goodFoods || [])]);
  
        goodFoodsInput.value = "";
        renderGoodBadFoods();
        await saveState();
      });
  
      badFoodsForm?.addEventListener("submit", async (e) => {
        e.preventDefault();
        const value = badFoodsInput.value.trim();
        if (!value) return;
  
        unmarkDefaultDeleted("badFoods", value);
        state.badFoods = uniqueStrings([value, ...(state.badFoods || [])]);
  
        badFoodsInput.value = "";
        renderGoodBadFoods();
        await saveState();
      });
  
      async function init() {
        updateEditUI();
        renderGoodBadFoods();
        setTargetInputs();
        renderFoodLog();
  
        const saved = await loadState();
  
        const removedDefaults = {
          goodFoods: uniqueStrings(saved?.removedDefaults?.goodFoods),
          badFoods: uniqueStrings(saved?.removedDefaults?.badFoods),
        };
  
        state = {
          targets: {
            ...getDefaultTargets(),
            ...(saved?.targets || {}),
            micros: {
              ...DEFAULT_MICROS,
              ...(saved?.targets?.micros || {}),
            },
          },
          dailyLogs: saved?.dailyLogs && typeof saved.dailyLogs === "object" ? saved.dailyLogs : {},
          removedDefaults,
          goodFoods: mergeDefaults(
            saved?.goodFoods,
            defaultGoodFoodsList,
            removedDefaults.goodFoods
          ),
          badFoods: mergeDefaults(
            saved?.badFoods,
            defaultBadFoodsList,
            removedDefaults.badFoods
          ),
        };
  
        const todayKey = getTodayKey();
        if (!state.dailyLogs[todayKey]) {
          state.dailyLogs[todayKey] = getEmptyDailyLog();
        } else {
          state.dailyLogs[todayKey] = {
            items: Array.isArray(state.dailyLogs[todayKey]?.items) ? state.dailyLogs[todayKey].items : [],
            waterOz: Number(state.dailyLogs[todayKey]?.waterOz || 0),
          };
        }
  
        hasLoadedInitialState = true;
  
        updateEditUI();
        setTargetInputs();
        renderGoodBadFoods();
        renderFoodLog();
        renderTotals();
      }
  
      init();
    
}
