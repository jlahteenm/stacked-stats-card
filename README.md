<p align="center">
  <img src="https://raw.githubusercontent.com/jlahteenm/stacked-stats-card/main/dist/stacked-stats-card.svg" width="128" />
</p>

# Stacked Stats Card (Experimental)

A clean, lightweight, stacked multi-period statistics card for Home Assistant.

This card displays energy-like sensors (kWh, Wh, W, gas, water, heat pump counters, etc.) in stacked bar format across multiple time periods:

- **Hour** (24 buckets)
- **Day** (7 buckets ending today)
- **Week** (5 ISO weeks)
- **Month** (13 months)

The card uses local time, zero-fills missing data, supports navigation (back/forward), and generates unique colors automatically.

> **Status:** Experimental  
> This card works reliably in my own setup, but may still have edge cases.  
> Feedback and PRs are welcome.

---

## ✨ Features

- Local-time bucket logic (no UTC drift)
- Hour/Day/Week/Month modes
- Back/forward navigation
- Zero-fill for missing buckets
- Infinite unique colors (HSL golden-angle)
- Stacked bar chart using Chart.js
- Works with any numeric history sensor
- No dependencies, no backend, no Energy Dashboard coupling

---

## 📦 Installation (HACS)

1. Go to **HACS → Custom Repositories**
2. Add this repository: https://github.com/jlahteenm/stacked-stats-card
3. Category: **Frontend**
4. Install the card
5. Add this to your dashboard resources: /hacsfiles/stacked-stats-card/stacked-stats-card.js
 
---

## 🧩 Example Configuration

```yaml
type: custom:stacked-stats-card
title: Energy Usage
entities:
- entity: sensor.house_energy_kwh
- entity: sensor.heat_pump_kwh
- entity: sensor.water_heater_kwh
```
---

## 📝 Notes
- Hour mode shows the last 24 hours.
- Day mode shows the last 7 days ending today.
- Week mode shows the last 5 ISO weeks.
- Month mode shows the last 13 months.
- All buckets are zero-filled to ensure alignment.
- Colors are auto-generated unless overridden.

---

## 🤝 Contributing
- This project is experimental.
- Bug reports, ideas, and pull requests are welcome.

---

## 📄 License
- MIT

