import { useEffect, useState } from "react";
import { Activity, AlertTriangle, ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Sparkles, Sunrise, Utensils } from "lucide-react";
import Header from "../components/Header";
import {
  DAILY_TRACKER_STORAGE_KEY,
  TRACKER_READING_FIELDS,
  isValidReading,
  initialTracker as getInitialTracker,
  localDateString,
} from "../data";

function dateForDay(startDate, dayOffset) {
  const date = new Date(`${startDate}T00:00:00`);
  date.setDate(date.getDate() + dayOffset);
  return localDateString(date);
}

function formatDate(dateString) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function average(values) {
  if (!values || values.length === 0) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function displayAverage(value) {
  return value === null ? "—" : value.toFixed(1);
}

const HYPO_TIME_OPTIONS = [
  { value: "", label: "Select time" },
  { value: "before-breakfast", label: "Before breakfast" },
  { value: "after-breakfast", label: "After breakfast" },
  { value: "before-lunch", label: "Before lunch" },
  { value: "after-lunch", label: "After lunch" },
  { value: "before-dinner", label: "Before dinner" },
  { value: "after-dinner", label: "After dinner" },
  { value: "bedtime", label: "Bedtime" },
  { value: "overnight", label: "Overnight" },
];

export default function DailyHabitTracker({
  profile,
  tracker: propTracker,
  setTracker: propSetTracker,
  goToPage,
}) {
  const [localTracker, setLocalTracker] = useState(getInitialTracker);
  const tracker = propTracker ?? localTracker;
  const setTracker = propSetTracker ?? setLocalTracker;

  useEffect(() => {
    if (!propTracker) {
      try {
        window.localStorage.setItem(DAILY_TRACKER_STORAGE_KEY, JSON.stringify(tracker));
      } catch {
        // Keep the current session usable when browser storage is unavailable.
      }
    }
  }, [tracker, propTracker]);

  const days = Array.from({ length: 60 }, (_, index) => dateForDay(tracker.startDate, index));
  const readingsLogged = days.reduce((total, date) => (
    total + TRACKER_READING_FIELDS.filter(({ key }) => isValidReading(tracker.entries?.[date]?.[key])).length
  ), 0);
  const completeDays = days.filter((date) => (
    TRACKER_READING_FIELDS.every(({ key }) => isValidReading(tracker.entries?.[date]?.[key]))
  )).length;
  const trackerValues = days.flatMap((date) => (
    TRACKER_READING_FIELDS
      .map(({ key }) => tracker.entries?.[date]?.[key])
      .filter(isValidReading)
      .map(Number)
  ));
  const trackerAverage = average(trackerValues);

  // Fasting glucose average calculated strictly from entries logged in the habit tracker
  const fastingValues = days
    .map((date) => tracker.entries?.[date]?.fasting)
    .filter(isValidReading)
    .map(Number);

  // Post meal glucose average calculated strictly from all post-meal entries (post-fasting, post-lunch, post-dinner)
  const POST_MEAL_KEYS = ["postFasting", "postLunch", "postDinner"];
  const postMealValues = days.flatMap((date) =>
    POST_MEAL_KEYS
      .map((key) => tracker.entries?.[date]?.[key])
      .filter(isValidReading)
      .map(Number)
  );

  const fastingAverage = average(fastingValues);
  const postMealAverage = average(postMealValues);
  const totalHypos = days.filter((date) => isValidReading(tracker.entries?.[date]?.hypoReading)).length;

  const updateReading = (date, field, value) => {
    setTracker((current) => ({
      ...current,
      entries: {
        ...(current.entries || {}),
        [date]: { ...(current.entries?.[date] || {}), [field]: value },
      },
    }));
  };

  return (
    <>
      <Header
        title="Daily Habit Tracker"
        subtitle="Log six glucose readings each day across 60 consecutive days."
        userName={profile.name}
      />

      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <div className="flex items-center gap-3 border border-slate-200 bg-white p-4 shadow-sm">
          <CalendarDays size={19} className="shrink-0 text-blue-600" />
          <div>
            <label htmlFor="tracker-start-date" className="block text-xs font-medium text-slate-500">First day</label>
            <input
              id="tracker-start-date"
              type="date"
              value={tracker.startDate}
              onChange={(event) => setTracker((current) => ({ ...current, startDate: event.target.value }))}
              className="mt-1 text-sm font-semibold text-slate-800 outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 border border-slate-200 bg-white p-4 shadow-sm">
          <CheckCircle2 size={19} className="shrink-0 text-emerald-600" />
          <div>
            <div className="text-xs font-medium text-slate-500">Complete days</div>
            <div className="text-lg font-semibold text-slate-900">{completeDays} <span className="text-sm font-normal text-slate-500">/ 60</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3 border border-slate-200 bg-white p-4 shadow-sm">
          <ClipboardList size={19} className="shrink-0 text-teal-700" />
          <div>
            <div className="text-xs font-medium text-slate-500">Readings logged</div>
            <div className="text-lg font-semibold text-slate-900">{readingsLogged} <span className="text-sm font-normal text-slate-500">/ 360</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3 border border-slate-200 bg-white p-4 shadow-sm">
          <Activity size={19} className="shrink-0 text-emerald-700" />
          <div>
            <div className="text-xs font-medium text-slate-500">Tracker average</div>
            <div className="text-lg font-semibold text-slate-900">{displayAverage(trackerAverage)} <span className="text-sm font-normal text-slate-500">mg/dL</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3 border border-slate-200 bg-white p-4 shadow-sm">
          <Sunrise size={19} className="shrink-0 text-amber-600" />
          <div>
            <div className="text-xs font-medium text-slate-500">Fasting blood sugar avg</div>
            <div className="text-lg font-semibold text-slate-900">{displayAverage(fastingAverage)} <span className="text-sm font-normal text-slate-500">mg/dL</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3 border border-slate-200 bg-white p-4 shadow-sm">
          <Utensils size={19} className="shrink-0 text-orange-600" />
          <div>
            <div className="text-xs font-medium text-slate-500">Post-meal blood sugar avg</div>
            <div className="text-lg font-semibold text-slate-900">{displayAverage(postMealAverage)} <span className="text-sm font-normal text-slate-500">mg/dL</span></div>
          </div>
        </div>
        <div className="flex items-center gap-3 border border-amber-200 bg-amber-50/60 p-4 shadow-sm">
          <AlertTriangle size={19} className="shrink-0 text-amber-600" />
          <div>
            <div className="text-xs font-medium text-amber-800">Hypos logged</div>
            <div className="text-lg font-semibold text-slate-900">{totalHypos} <span className="text-sm font-normal text-slate-500">episodes</span></div>
          </div>
        </div>
      </section>

      <section className="border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Glucose readings</h2>
            <p className="text-xs text-slate-500">mg/dL · Whole numbers from 20 to 600 · Used directly for HbA1c prediction</p>
          </div>
          {goToPage && (
            <button
              onClick={() => goToPage("dashboard")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 shadow-sm"
            >
              <Sparkles size={13} />
              Predict HbA1c from these readings
              <ArrowRight size={13} />
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1280px] table-fixed text-xs">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="w-40 px-3 py-3 font-semibold">Date</th>
                {TRACKER_READING_FIELDS.map(({ key, label }) => (
                  <th key={key} className="px-2 py-3 font-semibold">{label}<span className="mt-1 block font-normal text-slate-400">mg/dL</span></th>
                ))}
                <th className="w-36 px-2 py-3 font-semibold">Hypo<span className="mt-1 block font-normal text-slate-400">mg/dL</span></th>
                <th className="w-44 px-2 py-3 font-semibold">Hypo time</th>
                <th className="w-32 px-2 py-3 font-semibold">Daily average<span className="mt-1 block font-normal text-slate-400">mg/dL</span></th>
              </tr>
            </thead>
            <tbody>
              {days.map((date, index) => {
                const dayValues = TRACKER_READING_FIELDS
                  .map(({ key }) => tracker.entries?.[date]?.[key])
                  .filter(isValidReading)
                  .map(Number);
                if (isValidReading(tracker.entries?.[date]?.hypoReading)) {
                  dayValues.push(Number(tracker.entries[date].hypoReading));
                }
                const dayAverage = average(dayValues);
                return (
                  <tr key={date} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70">
                    <th scope="row" className="px-3 py-2 text-left font-medium text-slate-700">
                      <span className="mr-2 text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                      {formatDate(date)}
                    </th>
                    {TRACKER_READING_FIELDS.map(({ key, label }) => {
                      const value = tracker.entries?.[date]?.[key] ?? "";
                      const invalid = value !== "" && !isValidReading(value);
                      return (
                        <td key={key} className="px-2 py-1.5">
                          <input
                            type="number"
                            min="20"
                            max="600"
                            step="1"
                            value={value}
                            onChange={(event) => updateReading(date, key, event.target.value)}
                            aria-label={`${label}, ${formatDate(date)} in mg/dL`}
                            aria-invalid={invalid}
                            className={`w-full rounded border px-2 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${invalid ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"}`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="20"
                        max="69"
                        step="1"
                        value={tracker.entries?.[date]?.hypoReading ?? ""}
                        onChange={(event) => updateReading(date, "hypoReading", event.target.value)}
                        aria-label={`Hypo glucose, ${formatDate(date)} in mg/dL`}
                        className="w-full rounded border border-amber-200 bg-amber-50/40 px-2 py-2 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={tracker.entries?.[date]?.hypoTime ?? ""}
                        onChange={(event) => updateReading(date, "hypoTime", event.target.value)}
                        aria-label={`Hypo time, ${formatDate(date)}`}
                        className="w-full rounded border border-amber-200 bg-amber-50/40 px-2 py-2 text-sm text-slate-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      >
                        {HYPO_TIME_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-sm font-semibold text-slate-700">{displayAverage(dayAverage)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

    </>
  );
}