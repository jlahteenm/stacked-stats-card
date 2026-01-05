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
2. Add this repository:
