# Dia Care Dashboard — full project

A React app (Dashboard, Daily Habit Tracker, Insulin Prediction, History,
Trends & Graphs, Insights, Reports, Profile, Settings) with working client-side navigation and shared state —
no page reloads, no router library needed.

## File structure

```
src/
  data.js                 shared mock data + helper functions (bandFor, predictHbA1c, computeBMI, etc.)
  App.jsx                 root component — owns all state, renders the sidebar + active page
  components/
    Sidebar.jsx            nav list; calls onNavigate(key) on click
    Header.jsx             page title/date/user, reused on every page
    Shared.jsx             Field, RangeRow, InsightCard, StatCard — reused UI pieces
  pages/
    Dashboard.jsx           readings form, HbA1c prediction, mini trend chart, recent readings
    DailyHabitTracker.jsx   six daily glucose entries across a consecutive 60-day range
    InsulinPrediction.jsx  personalized meal-dose prediction and doctor calibration
    History.jsx             full readings table — search, filter by status, sort, delete
    TrendsGraphs.jsx        metric switcher (HbA1c/Fasting/Postprandial), date range, stats
    Insights.jsx            tabbed insights (Overview/Diet/Exercise/Medical), driven by latest reading
    Reports.jsx             summary stats, CSV export, print
    Profile.jsx             editable personal details, saves to shared state
    Settings.jsx            HbA1c goal, units, reminders, dark mode flag, doctor sharing

  The Daily Habit Tracker stores its 60-day glucose entries in browser local storage.
  It includes fasting/breakfast, post-fasting, pre-lunch, post-lunch, pre-dinner,
  and post-dinner values in mg/dL.
```

## How navigation works

`App.jsx` holds one piece of state, `activePage` (a string like `"dashboard"`,
`"history"`, etc). `Sidebar.jsx` calls `onNavigate(key)` when a nav item is
clicked, which calls `setActivePage(key)` in `App.jsx`. A `switch` statement
in `App.jsx` then renders the matching page component. This is a lightweight
hand-rolled router — swap it for `react-router-dom` if you want deep-linkable
URLs (e.g. `/history`), the page components themselves don't need to change.

## How data flows

All state (`readings`, `profile`, `settings`) lives in `App.jsx` and is
passed down as props, along with the functions that change it
(`addReading`, `removeReading`, `updateProfile`, `updateSettings`,
`goToPage`). Any page can:
- add a reading (Dashboard's "Predict HbA1c" button)
- delete a reading (History's trash icon)
- edit the profile (Profile's "Save Changes")
- edit settings (Settings' "Save Settings")
- jump to another page (Dashboard's "See all" / "View Full History" links)

This is intentionally simple `useState` + prop drilling. For a larger app,
lift this into React Context or a store (Zustand/Redux) without changing the
page components' logic — only how they receive props would change.

## Setup

This project expects a React app (Vite, Create React App, or Next.js) with:

```bash
npm install react react-dom recharts lucide-react
```

Then drop the `src/` folder in, import `App` from `./src/App.jsx` in your
entry point, and render it:

```jsx
import App from "./src/App";
// ...
<App />
```

Styling uses Tailwind utility classes — make sure Tailwind is configured in
your project (`npx tailwindcss init`), or swap the class names for your own
CSS.

## Notes on the prediction formula

`predictHbA1c()` in `data.js` is a simplified, illustrative estimate (based
loosely on the standard eAG → HbA1c conversion), not a clinically validated
model. Don't use it for real medical decisions.
