const STACKED_STATS_CARD_VERSION = "0.20.0";

function loadChartJs() {
  if (window.Chart) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

class StackedStatsCard extends HTMLElement {
  setConfig(config) {
    if (!config.entities || config.entities.length === 0) {
      throw new Error("You must define at least one entity");
    }

    this._config = config;
    this._hass = null;

    this._period = "hour";
    this._offset = 0;

    this._recalcRange();

    this._root = this.attachShadow({ mode: "open" });
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  // ────────────────────────────────────────────────────────────────
  // HELPERS
  // ────────────────────────────────────────────────────────────────

  _pad(n) {
    return n.toString().padStart(2, "0");
  }

  _getIsoWeek(date) {
    const d = new Date(date.getTime());
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return (
      1 +
      Math.round(
        ((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) /
          7
      )
    );
  }

  _colorForIndex(i) {
    const hue = (i * 137.508) % 360;
    return `hsl(${hue}, 65%, 55%)`;
  }

  // ────────────────────────────────────────────────────────────────
  // DATE RANGE LOGIC (LOCAL TIME)
  // ────────────────────────────────────────────────────────────────

  _recalcRange() {
    const now = new Date();

    // Hour mode (24h blocks)
    if (this._period === "hour") {
      const end = new Date(now);
      end.setMinutes(0, 0, 0);
      end.setHours(end.getHours() + this._offset * 24);
      const start = new Date(end.getTime() - 24 * 3600 * 1000);
      this._start = start;
      this._end = end;
      return;
    }

    // Day mode (7 days ending today)
    if (this._period === "day") {
      const today = new Date(now);
      today.setHours(23, 59, 59, 999);

      const end = new Date(today.getTime() + this._offset * 7 * 86400000);
      const start = new Date(end.getTime() - 6 * 86400000);

      this._start = start;
      this._end = end;
      return;
    }

    // Week mode (5 weeks)
    if (this._period === "week") {
      const base = new Date(now);
      base.setHours(0, 0, 0, 0);
      const day = base.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      base.setDate(base.getDate() + diff);

      const oldestWeekOffset = this._offset * 5 - 4;
      const oldestMonday = new Date(base.getTime() + oldestWeekOffset * 7 * 86400000);
      const newestMonday = new Date(base.getTime() + this._offset * 5 * 7 * 86400000);

      this._start = oldestMonday;
      this._end = new Date(newestMonday.getTime() + 7 * 86400000);
      return;
    }

    // Month mode (13 months)
    if (this._period === "month") {
      const base = new Date(now.getFullYear(), now.getMonth(), 1);

      const oldestOffset = this._offset * 13 - 12;
      const startMonth = new Date(base.getFullYear(), base.getMonth() + oldestOffset, 1);
      const newestMonth = new Date(base.getFullYear(), base.getMonth() + this._offset * 13, 1);
      const end = new Date(newestMonth.getFullYear(), newestMonth.getMonth() + 1, 1);

      this._start = startMonth;
      this._end = end;
      return;
    }
  }

  _shiftRange(dir) {
    const mult = dir === "back" ? -1 : 1;
    this._offset += mult;
    this._recalcRange();
    this._render();
  }

  _setPeriod(period) {
    this._period = period;
    this._offset = 0;
    this._recalcRange();
    this._render();
  }

  // ────────────────────────────────────────────────────────────────
  // BUCKET KEY GENERATION (UNIFIED FORMAT)
  // ────────────────────────────────────────────────────────────────

  _bucketKeyFromDate(date) {
    const y = date.getFullYear();
    const m = this._pad(date.getMonth() + 1);
    const d = this._pad(date.getDate());
    const h = this._pad(date.getHours());

    if (this._period === "hour") return `${y}-${m}-${d}T${h}:00`;
    if (this._period === "day") return `${y}-${m}-${d}`;
    if (this._period === "week") return `${y}-${m}-${d}`;
    return `${y}-${m}`;
  }

  _bucketKey(ts) {
    const d = new Date(ts);

    if (this._period === "week") {
      const day = d.getDay();
      const diff = (day === 0 ? -6 : 1) - day;
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
    }

    if (this._period === "day") d.setHours(0, 0, 0, 0);
    if (this._period === "month") d.setDate(1), d.setHours(0, 0, 0, 0);
    if (this._period === "hour") d.setMinutes(0, 0, 0);

    return this._bucketKeyFromDate(d);
  }

  _generateBucketDates() {
    const dates = [];

    if (this._period === "hour") {
      const start = new Date(this._start);
      start.setMinutes(0, 0, 0);
      for (let i = 0; i < 24; i++) dates.push(new Date(start.getTime() + i * 3600000));
      return dates;
    }

    if (this._period === "day") {
      const start = new Date(this._start);
      start.setHours(0, 0, 0, 0);
      for (let i = 0; i < 7; i++) dates.push(new Date(start.getTime() + i * 86400000));
      return dates;
    }

    if (this._period === "week") {
      const start = new Date(this._start);
      start.setHours(0, 0, 0, 0);
      for (let i = 0; i < 5; i++) dates.push(new Date(start.getTime() + i * 7 * 86400000));
      return dates;
    }

    if (this._period === "month") {
      const start = new Date(this._start.getFullYear(), this._start.getMonth(), 1);
      for (let i = 0; i < 13; i++)
        dates.push(new Date(start.getFullYear(), start.getMonth() + i, 1));
      return dates;
    }

    return dates;
  }

  // ────────────────────────────────────────────────────────────────
  // HISTORY FETCHING
  // ────────────────────────────────────────────────────────────────

  async _fetchHistory(entityId) {
    const startIso = this._start.toISOString();
    const endIso = this._end.toISOString();

    const path =
      `history/period/${startIso}` +
      `?filter_entity_id=${entityId}` +
      `&end_time=${endIso}`;

    try {
      const result = await this._hass.callApi("GET", path);
      return result[0] || [];
    } catch (err) {
      console.error("History API error:", err);
      return [];
    }
  }

  _bucketize(history, entityId) {
    const buckets = {};
    const unit = this._hass.states[entityId]?.attributes?.unit_of_measurement;

    for (const entry of history) {
      const ts = new Date(entry.last_changed);
      const key = this._bucketKey(ts);

      let value = parseFloat(entry.state);
      if (isNaN(value)) continue;

      if (unit === "Wh") value = value / 1000;

      buckets[key] = value;
    }

    return buckets;
  }

  // ────────────────────────────────────────────────────────────────
  // DELTAS + ZERO FILLING
  // ────────────────────────────────────────────────────────────────

  _computeDeltas(allBuckets) {
    const bucketDates = this._generateBucketDates();
    const keys = bucketDates.map((d) => this._bucketKeyFromDate(d));
    const labels = bucketDates.map((d) => this._formatLabel(d));

    const datasets = [];
    let colorIndex = 0;

    for (let i = 0; i < this._config.entities.length; i++) {
      const entityId = this._config.entities[i].entity;
      const buckets = allBuckets[i];

      const filled = {};
      let lastValue = 0;

      for (const key of keys) {
        if (buckets[key] !== undefined) lastValue = buckets[key];
        filled[key] = lastValue;
      }

      const values = [];
      let prev = null;

      for (const key of keys) {
        const val = filled[key];

        if (prev === null) values.push(null);
        else values.push(Math.max(val - prev, 0));

        prev = val;
      }

      const friendly =
        this._hass.states[entityId]?.attributes?.friendly_name || entityId;

      const color =
        this._config.entities[i].color || this._colorForIndex(colorIndex++);

      datasets.push({
        label: friendly,
        data: values,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        stack: "total",
      });
    }

    return { labels, datasets };
  }

  _formatLabel(date) {
    const locale = this._hass.locale?.language || "en-US";

    if (this._period === "hour") {
      return date.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }

    if (this._period === "day") {
      return date.toLocaleDateString(locale, {
        day: "2-digit",
        month: "2-digit",
      });
    }

    if (this._period === "week") {
      const week = this._getIsoWeek(date);
      return `W${week.toString().padStart(2, "0")}`;
    }

    if (this._period === "month") {
      return date.toLocaleDateString(locale, {
        month: "short",
      });
    }

    return "";
  }

  // ────────────────────────────────────────────────────────────────
  // RENDERING
  // ────────────────────────────────────────────────────────────────

  async _render() {
    if (!this._root || !this._config || !this._hass) return;

    if (!this._container) {
      this._container = document.createElement("ha-card");
      this._container.header =
        `${this._config.title || "Stacked statistics"} (v${STACKED_STATS_CARD_VERSION})`;

      this._content = document.createElement("div");
      this._content.style.padding = "8px 16px 16px 16px";

      this._canvas = document.createElement("canvas");
      this._canvas.height = 240;

      this._container.appendChild(this._content);
      this._root.appendChild(this._container);
    }

    // Clear content
    this._content.innerHTML = "";

    // Build selector DOM manually
    const selector = document.createElement("div");
    selector.style.display = "flex";
    selector.style.gap = "8px";
    selector.style.margin = "12px 0";
    selector.style.alignItems = "center";

    const mkBtn = (id, label, active) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.style.fontWeight = active ? "bold" : "normal";
      b.id = id;
      return b;
    };

    const backBtn = mkBtn("backBtn", "←", false);
    const hourBtn = mkBtn("hourBtn", "Hour", this._period === "hour");
    const dayBtn = mkBtn("dayBtn", "Day", this._period === "day");
    const weekBtn = mkBtn("weekBtn", "Week", this._period === "week");
    const monthBtn = mkBtn("monthBtn", "Month", this._period === "month");
    const fwdBtn = mkBtn("fwdBtn", "→", false);

    selector.append(backBtn, hourBtn, dayBtn, weekBtn, monthBtn, fwdBtn);
    this._content.appendChild(selector);

    // Attach listeners BEFORE rendering chart
    backBtn.onclick = () => this._shiftRange("back");
    fwdBtn.onclick = () => this._shiftRange("fwd");
    hourBtn.onclick = () => this._setPeriod("hour");
    dayBtn.onclick = () => this._setPeriod("day");
    weekBtn.onclick = () => this._setPeriod("week");
    monthBtn.onclick = () => this._setPeriod("month");

    this._content.appendChild(this._canvas);

    await loadChartJs();

    const allBuckets = [];

    for (const ent of this._config.entities) {
      const history = await this._fetchHistory(ent.entity);
      const buckets = this._bucketize(history, ent.entity);
      allBuckets.push(buckets);
    }

    const { labels, datasets } = this._computeDeltas(allBuckets);

    const ctx = this._canvas.getContext("2d");

    if (this._chart) this._chart.destroy();

    this._chart = new Chart(ctx, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: { boxWidth: 12, padding: 10 },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: {
              display: true,
              color: "rgba(180, 180, 180, 0.3)",
              borderColor: "rgba(180, 180, 180, 0.5)",
            },
            ticks: { color: "rgba(220, 220, 220, 0.9)" },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: "kWh",
              color: "rgba(220, 220, 220, 0.9)",
            },
            grid: {
              display: true,
              color: "rgba(180, 180, 180, 0.3)",
              borderColor: "rgba(180, 180, 180, 0.5)",
            },
            ticks: { color: "rgba(220, 220, 220, 0.9)" },
          },
        },
      },
    });
  }
}

customElements.define("stacked-stats-card", StackedStatsCard);
