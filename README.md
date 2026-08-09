# FinFlow — Personal Finance

A premium, single-user personal finance web app. Dark-mode-first, glassmorphism UI,
animated charts, and 100% local/offline storage. Built with React + TypeScript + Vite.

![stack](https://img.shields.io/badge/React-18-61dafb) ![ts](https://img.shields.io/badge/TypeScript-5-3178c6) ![vite](https://img.shields.io/badge/Vite-5-646cff)

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to /dist
npm run preview  # preview the production build
```

Sample data is preloaded on first launch (8 months of realistic transactions,
budgets, goals and investments), so every screen is populated immediately.
Everything is stored in your browser via **IndexedDB** — nothing is sent anywhere.

## Features

- **Dashboard** — balance, monthly income/spending, savings, net cash flow, and a
  computed financial health score; six interactive charts (cash flow, spending by
  category, income sources, monthly comparison, savings trend, investment allocation);
  auto-generated smart insight cards.
- **Transactions** — add / edit / delete, global search, multi-filter (type, category,
  method, date range), sort, multi-select **bulk edit & delete**, receipt image upload,
  recurring toggle, CSV export.
- **Budgets** — monthly limit per category with % used, remaining, progress bars,
  projected overspend warnings.
- **Goals** — savings goals with progress rings, estimated completion date, contributions.
- **Investments** — stocks, ETFs, crypto, savings, pensions; allocation donut, gains/losses,
  historical value line.
- **Calendar** — month grid of recurring bills/salary/subscriptions with a 60-day
  auto-projected upcoming list.
- **Reports** — monthly, yearly, category, merchant, cash-flow and savings reports,
  exportable to **CSV, Excel (.xlsx) and PDF**.
- **Settings** — currency (GBP/USD/EUR), dark/light theme, optional PIN + biometric lock,
  auto-lock timeout, custom categories, JSON backup & restore, bank-CSV import, reset.
- **Extras** — ⌘K / Ctrl+K command palette + global search, ⌘N quick add, onboarding flow,
  empty-state illustrations, animated transitions, responsive mobile layout with bottom nav,
  reduced-motion & focus-visible accessibility support.

## Tech

React 18 · TypeScript · Vite 5 · Tailwind CSS · Framer Motion · Recharts · Zustand ·
IndexedDB (`idb`) · React Hook Form · Zod · date-fns · SheetJS + jsPDF (exports).

## Project structure

```
src/
  components/    ui primitives, layout, charts, shared modals
  features/      dashboard, transactions, budgets, goals, investments, calendar, reports, settings
  store/         Zustand store (persists to IndexedDB)
  lib/           finance calcs, insights, recurring engine, exports, formatting, db
  data/          default categories + deterministic mock data
  types/         shared TypeScript types
```

## Colour palette

emerald = income · red = expenses · blue = savings · yellow = investments · purple = goals.

## Notes

- Data is deterministic mock data anchored to 28 Jul 2026 so charts look consistent.
- The "current date" is fixed to make the sample data feel populated; search `REF` /
  `TODAY` (or `2026-07-28`) to switch to `new Date()` for live use.
- Cloud sync is stubbed off by default — the app is fully local-first.
