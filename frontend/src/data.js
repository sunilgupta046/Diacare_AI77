// ---- shared mock data & helper functions -----------------------------
// Import these into App.jsx and any page that needs them.

export const seedReadings = [
  { id: 1,  date: "30 Jun 2024", label: "Jun '24", fasting: 178, postprandial: 260, hba1c: 8.9 },
  { id: 2,  date: "31 Jul 2024", label: "Jul '24", fasting: 172, postprandial: 250, hba1c: 8.6 },
  { id: 3,  date: "31 Aug 2024", label: "Aug '24", fasting: 175, postprandial: 255, hba1c: 8.7 },
  { id: 4,  date: "30 Sep 2024", label: "Sep '24", fasting: 170, postprandial: 245, hba1c: 8.4 },
  { id: 5,  date: "31 Oct 2024", label: "Oct '24", fasting: 165, postprandial: 245, hba1c: 8.3 },
  { id: 6,  date: "30 Nov 2024", label: "Nov '24", fasting: 170, postprandial: 248, hba1c: 8.4 },
  { id: 7,  date: "31 Dec 2024", label: "Dec '24", fasting: 168, postprandial: 240, hba1c: 8.2 },
  { id: 8,  date: "31 Jan 2025", label: "Jan '25", fasting: 160, postprandial: 230, hba1c: 7.8 },
  { id: 9,  date: "28 Feb 2025", label: "Feb '25", fasting: 155, postprandial: 220, hba1c: 7.6 },
  { id: 10, date: "30 Mar 2025", label: "Mar '25", fasting: 148, postprandial: 205, hba1c: 7.3 },
  { id: 11, date: "30 Apr 2025", label: "Apr '25", fasting: 162, postprandial: 215, hba1c: 7.5 },
  { id: 12, date: "31 May 2025", label: "May '25", fasting: 156, postprandial: 210, hba1c: 7.2 },
];

export const defaultProfile = {
  name: "User",
  age: 45,
  gender: "Male",
  phone: "+91 98765 43210",
  email: "user@example.com",
  emergencyContact: "+91 91234 56789",
  diagnosedDate: "2019-04-12",
  weight: 78,
  height: 172,
};

export const PROFILE_STORAGE_KEY = "diacare-profile";
export const INSULIN_PATIENT_ID_KEY = "diacare-insulin-patient-id";

export const defaultSettings = {
  hba1cGoal: 7.0,
  units: "mg/dL",
  darkMode: false,
  reminders: true,
  reminderTimes: ["08:00"],
  shareWithDoctor: false,
  shareToken: "",
};

export const SETTINGS_STORAGE_KEY = "diacare-settings";

export function bandFor(hba1c) {
  if (hba1c < 5.7) return { label: "Normal", color: "#16A34A", chip: "bg-emerald-50 text-emerald-700" };
  if (hba1c < 6.5) return { label: "Pre-Diabetes", color: "#CA8A04", chip: "bg-amber-50 text-amber-700" };
  if (hba1c < 8.0) return { label: "Fair Control", color: "#EA580C", chip: "bg-orange-50 text-orange-700" };
  return { label: "Poor Control", color: "#DC2626", chip: "bg-red-50 text-red-700" };
}

export function isValidReading(value) {
  if (value === "" || value === undefined || value === null) return false;
  const number = Number(value);
  return Number.isInteger(number) && number >= 20 && number <= 600;
}

export const DAILY_TRACKER_STORAGE_KEY = "diacare-daily-habit-tracker";
export const TRACKER_MIN_DAYS = 1;
export const TRACKER_MAX_DAYS = 90;
export const DEFAULT_TRACKER_DAYS = 60;

export const TRACKER_READING_FIELDS = [
  { key: "fasting", label: "Fasting / Breakfast" },
  { key: "postFasting", label: "Post-fasting" },
  { key: "preLunch", label: "Pre-lunch" },
  { key: "postLunch", label: "Post-lunch" },
  { key: "preDinner", label: "Pre-dinner" },
  { key: "postDinner", label: "Post-dinner" },
];

export function getTrackerStats(tracker) {
  const POST_MEAL_KEYS = ["postFasting", "postLunch", "postDinner"];
  const ALL_KEYS = ["fasting", "postFasting", "preLunch", "postLunch", "preDinner", "postDinner"];

  const fastingValues = [];
  const postMealValues = [];
  const allValues = [];

  if (tracker?.entries && typeof tracker.entries === "object") {
    const dates = Object.keys(tracker.entries).sort();
    for (const date of dates) {
      const entry = tracker.entries[date];
      if (!entry || typeof entry !== "object") continue;

      if (isValidReading(entry.fasting)) {
        fastingValues.push(Number(entry.fasting));
      }

      for (const key of POST_MEAL_KEYS) {
        if (isValidReading(entry[key])) {
          postMealValues.push(Number(entry[key]));
        }
      }

      for (const key of ALL_KEYS) {
        if (isValidReading(entry[key])) {
          allValues.push(Number(entry[key]));
        }
      }

      if (isValidReading(entry.hypoReading)) {
        allValues.push(Number(entry.hypoReading));
      }
    }
  }

  const fastingAvg = fastingValues.length > 0
    ? Math.round(fastingValues.reduce((a, b) => a + b, 0) / fastingValues.length)
    : null;
  const postMealAvg = postMealValues.length > 0
    ? Math.round(postMealValues.reduce((a, b) => a + b, 0) / postMealValues.length)
    : null;
  const overallAvg = allValues.length > 0
    ? Math.round((allValues.reduce((a, b) => a + b, 0) / allValues.length) * 10) / 10
    : null;

  return {
    fastingValues,
    postMealValues,
    allValues,
    fastingAvg,
    postMealAvg,
    overallAvg,
    count: allValues.length,
  };
}

export function getTrackerAnalysis(tracker) {
  const slotDefinitions = [
    { key: "fasting", label: "Fasting", chartLabel: "Fasting" },
    { key: "postFasting", label: "Post-breakfast", chartLabel: "Post-breakfast" },
    { key: "preLunch", label: "Pre-lunch", chartLabel: "Pre-lunch" },
    { key: "postLunch", label: "Post-lunch", chartLabel: "Post-lunch" },
    { key: "preDinner", label: "Pre-dinner", chartLabel: "Pre-dinner" },
    { key: "postDinner", label: "Post-dinner", chartLabel: "Post-dinner" },
  ];
  const hypoTimeLabels = {
    "before-breakfast": "Before breakfast",
    "after-breakfast": "After breakfast",
    "before-lunch": "Before lunch",
    "after-lunch": "After lunch",
    "before-dinner": "Before dinner",
    "after-dinner": "After dinner",
    bedtime: "Bedtime",
    overnight: "Overnight",
    unknown: "Time not recorded",
  };
  const valuesBySlot = Object.fromEntries(slotDefinitions.map(({ key }) => [key, []]));
  const hypoTimes = {};
  let hypoEvents = 0;

  for (const [date, entry] of Object.entries(tracker?.entries ?? {})) {
    if (!entry || typeof entry !== "object") continue;
    for (const { key } of slotDefinitions) {
      if (isValidReading(entry[key])) valuesBySlot[key].push({ value: Number(entry[key]), date });
    }
    if (isValidReading(entry.hypoReading)) {
      const timeKey = entry.hypoTime || "unknown";
      hypoTimes[timeKey] = (hypoTimes[timeKey] || 0) + 1;
      hypoEvents += 1;
    }
  }

  const slotStats = slotDefinitions.map(({ key, label, chartLabel }) => {
    const values = valuesBySlot[key];
    const numbers = values.map(({ value }) => value);
    const average = numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
    const lowCount = numbers.filter((value) => value < 70).length;
    const highThreshold = key === "fasting" || key === "preLunch" || key === "preDinner" ? 130 : 180;
    const highCount = numbers.filter((value) => value > highThreshold).length;
    return {
      key,
      label,
      chartLabel,
      count: numbers.length,
      average,
      lowCount,
      highCount,
      highThreshold,
      highRate: numbers.length ? highCount / numbers.length : 0,
    };
  });

  const hypoTimeStats = Object.entries(hypoTimes)
    .map(([key, count]) => ({ key, label: hypoTimeLabels[key] || key, count }))
    .sort((a, b) => b.count - a.count);
  const totalReadings = slotStats.reduce((sum, slot) => sum + slot.count, 0) + hypoEvents;
  const mostFrequentHigh = [...slotStats].filter((slot) => slot.count > 0).sort((a, b) => b.highRate - a.highRate)[0] ?? null;
  const mostFrequentLow = [...slotStats].filter((slot) => slot.lowCount > 0).sort((a, b) => b.lowCount - a.lowCount)[0] ?? null;

  return {
    slotStats,
    hypoTimeStats,
    hypoEvents,
    totalReadings,
    mostFrequentHigh,
    mostFrequentLow,
  };
}

export function predictHbA1cFromValues(values) {
  if (!values || values.length === 0) return 7.0;
  const sum = values.reduce((total, v) => total + v, 0);
  const mean = sum / values.length;
  const val = (mean + 46.7) / 28.7;
  return Math.round(val * 10) / 10;
}

export function localDateString(date = new Date()) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

export function generateSeedTracker() {
  const today = new Date();
  const start = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
  const startDateStr = localDateString(start);

  const samplePattern = [
    { fasting: 114, postFasting: 148, preLunch: 108, postLunch: 144, preDinner: 110, postDinner: 146 },
    { fasting: 118, postFasting: 152, preLunch: 110, postLunch: 148, preDinner: 114, postDinner: 155 },
    { fasting: 122, postFasting: 158, preLunch: 112, postLunch: 150, preDinner: 116, postDinner: 152 },
    { fasting: 115, postFasting: 145, preLunch: 108, postLunch: 142, preDinner: 110, postDinner: 146 },
    { fasting: 125, postFasting: 162, preLunch: 115, postLunch: 155, preDinner: 118, postDinner: 160 },
    { fasting: 120, postFasting: 150, preLunch: 111, postLunch: 146, preDinner: 113, postDinner: 149 },
    { fasting: 117, postFasting: 148, preLunch: 109, postLunch: 144, preDinner: 112, postDinner: 151 },
    { fasting: 124, postFasting: 160, preLunch: 114, postLunch: 152, preDinner: 117, postDinner: 158 },
    { fasting: 119, postFasting: 153, preLunch: 110, postLunch: 147, preDinner: 115, postDinner: 150 },
    { fasting: 116, postFasting: 146, preLunch: 107, postLunch: 140, preDinner: 111, postDinner: 145 },
    { fasting: 121, postFasting: 155, preLunch: 113, postLunch: 149, preDinner: 116, postDinner: 154 },
    { fasting: 113, postFasting: 142, preLunch: 106, postLunch: 138, preDinner: 109, postDinner: 144 },
    { fasting: 123, postFasting: 159, preLunch: 115, postLunch: 153, preDinner: 118, postDinner: 157 },
    { fasting: 116, postFasting: 147, preLunch: 108, postLunch: 143, preDinner: 112, postDinner: 150 },
  ];

  const entries = {};
  for (let i = 0; i < 14; i++) {
    const curDate = new Date(start);
    curDate.setDate(curDate.getDate() + i);
    entries[localDateString(curDate)] = { ...samplePattern[i] };
  }

  return { startDate: startDateStr, entries };
}

export function initialTracker() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(DAILY_TRACKER_STORAGE_KEY));
    if (saved?.startDate && saved.entries && typeof saved.entries === "object") {
      const durationDays = Number.isInteger(saved.durationDays)
        ? Math.max(TRACKER_MIN_DAYS, Math.min(TRACKER_MAX_DAYS, saved.durationDays))
        : DEFAULT_TRACKER_DAYS;
      return { ...saved, durationDays };
    }
  } catch {
    // Keep empty or default if storage parsing fails
  }
  return { ...generateSeedTracker(), durationDays: DEFAULT_TRACKER_DAYS };
}

export function predictHbA1c(fasting, postprandial) {
  const avg = 0.75 * fasting + 0.25 * postprandial;
  const val = (avg + 46.7) / 28.7;
  return Math.round(val * 10) / 10;
}

export function computeBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm) return 0;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

export function bmiTag(bmi) {
  if (bmi < 18.5) return { label: "Underweight", color: "text-amber-600" };
  if (bmi < 25) return { label: "Normal", color: "text-emerald-600" };
  if (bmi < 30) return { label: "Overweight", color: "text-orange-600" };
  return { label: "Obese", color: "text-red-600" };
}

export function sugarStatus(value, thresholds) {
  if (value < thresholds[0]) return { label: "Normal", color: "text-emerald-600" };
  if (value < thresholds[1]) return { label: "High", color: "text-orange-600" };
  return { label: "Very High", color: "text-red-600" };
}

export function todayLabelParts() {
  const now = new Date();
  const label = now.toLocaleDateString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '");
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return { label, dateStr };
}
