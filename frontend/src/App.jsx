import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import TrendsGraphs from "./pages/TrendsGraphs";
import Insights from "./pages/Insights";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import DailyHabitTracker from "./pages/DailyHabitTracker";
import InsulinPrediction from "./pages/InsulinPrediction";
import {
  seedReadings,
  defaultProfile,
  defaultSettings,
  initialTracker,
  DAILY_TRACKER_STORAGE_KEY,
  PROFILE_STORAGE_KEY,
  SETTINGS_STORAGE_KEY,
} from "./data";

export default function App() {
  // ---- shared app state, lifted here so every page can read/update it ----
  const [activePage, setActivePage] = useState("dashboard");
  const [readings, setReadings] = useState(seedReadings);
  const [profile, setProfile] = useState(() => {
    try {
      const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
      if (savedProfile) {
        const parsedProfile = JSON.parse(savedProfile);
        if (parsedProfile && typeof parsedProfile === "object" && !Array.isArray(parsedProfile)) {
          return { ...defaultProfile, ...parsedProfile };
        }
      }
    } catch {
      // Fall back to the defaults if storage is unavailable or invalid.
    }
    return defaultProfile;
  });
  const [settings, setSettings] = useState(() => {
    try {
      const savedSettings = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings && typeof parsedSettings === "object" && !Array.isArray(parsedSettings)) {
          const reminderTimes = Array.isArray(parsedSettings.reminderTimes)
            ? parsedSettings.reminderTimes.filter((time) => /^\d{2}:\d{2}$/.test(time)).slice(0, 6)
            : [parsedSettings.reminderTime || defaultSettings.reminderTimes[0]];
          return {
            ...defaultSettings,
            ...parsedSettings,
            reminderTimes: reminderTimes.length ? reminderTimes : defaultSettings.reminderTimes,
          };
        }
      }
    } catch {
      // Fall back to the defaults if storage is unavailable or invalid.
    }
    return defaultSettings;
  });
  const [tracker, setTracker] = useState(initialTracker);

  useEffect(() => {
    try {
      window.localStorage.setItem(DAILY_TRACKER_STORAGE_KEY, JSON.stringify(tracker));
    } catch {
      // Keep state in memory if local storage is restricted
    }
  }, [tracker]);

  useEffect(() => {
    try {
      window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Keep profile updates in memory if local storage is restricted.
    }
  }, [profile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep settings in memory if local storage is restricted.
    }
  }, [settings]);

  // ---- functions passed down as props: this is the "JavaScript to
  // navigate the page and perform all functions" the pages call into ----

  const goToPage = (key) => setActivePage(key);

  const addReading = (reading) => {
    setReadings((prev) => [...prev, { id: (prev[prev.length - 1]?.id ?? 0) + 1, ...reading }]);
  };

  const removeReading = (id) => {
    setReadings((prev) => prev.filter((r) => r.id !== id));
  };

  const updateProfile = (newProfile) => setProfile(newProfile);
  const updateSettings = (newSettings) => setSettings(newSettings);

  const handleLogout = () => {
    // Wire this up to your real auth flow. For this demo it just resets to Dashboard.
    if (window.confirm("Log out of Dia Care?")) {
      setActivePage("dashboard");
      alert("You have been logged out (demo only — no auth is wired up).");
    }
  };

  // ---- page router: swaps the visible section, no page reload ----
  const pageProps = {
    readings,
    addReading,
    removeReading,
    profile,
    updateProfile,
    settings,
    updateSettings,
    goToPage,
    tracker,
    setTracker,
  };

  let PageContent;
  switch (activePage) {
    case "dashboard": PageContent = <Dashboard {...pageProps} />; break;
    case "daily-tracker": PageContent = <DailyHabitTracker {...pageProps} />; break;
    case "insulin-prediction": PageContent = <InsulinPrediction profile={profile} />; break;
    case "history": PageContent = <History {...pageProps} />; break;
    case "trends": PageContent = <TrendsGraphs {...pageProps} />; break;
    case "insights": PageContent = <Insights {...pageProps} />; break;
    case "reports": PageContent = <Reports {...pageProps} />; break;
    case "profile": PageContent = <Profile {...pageProps} />; break;
    case "settings": PageContent = <Settings {...pageProps} />; break;
    default: PageContent = <Dashboard {...pageProps} />;
  }

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-800 flex ${settings.darkMode ? "dark-theme" : ""}`} style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>
      <Sidebar activePage={activePage} onNavigate={goToPage} onLogout={handleLogout} />

      <main className="flex-1 min-w-0 px-8 py-6">
        {PageContent}
      </main>

      <style>{`
        .input {
          width: 100%;
          border: 1px solid #E2E8F0;
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          color: #334155;
          outline: none;
          transition: border-color .15s;
        }
        .input:focus {
          border-color: #2563EB;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
      `}</style>
    </div>
  );
}
