import {
  Home, History, TrendingUp, Lightbulb, FileText, User, Settings, LogOut, HeartPulse, CalendarCheck2, Syringe,
} from "lucide-react";

export const NAV_ITEMS = [
  { key: "dashboard", icon: Home, label: "Dashboard" },
  { key: "daily-tracker", icon: CalendarCheck2, label: "Daily Habit Tracker" },
  { key: "insulin-prediction", icon: Syringe, label: "Insulin Prediction" },
  { key: "history", icon: History, label: "History" },
  { key: "trends", icon: TrendingUp, label: "Trends & Graphs" },
  { key: "insights", icon: Lightbulb, label: "Insights" },
  { key: "reports", icon: FileText, label: "Reports" },
  { key: "profile", icon: User, label: "Profile" },
  { key: "settings", icon: Settings, label: "Settings" },
];

// activePage: string key. onNavigate(key): switches the visible page.
// onLogout(): called when Logout is clicked.
export default function Sidebar({ activePage, onNavigate, onLogout }) {
  return (
    <aside className="w-[230px] shrink-0 bg-white border-r border-slate-200 flex flex-col py-6 px-4">
      <div className="flex items-center gap-2 px-2 mb-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-sm">
          <HeartPulse size={20} className="text-white" strokeWidth={2.5} />
        </div>
        <div className="text-lg font-bold text-blue-800 leading-tight">Dia Care</div>
      </div>
      <div className="text-[11px] text-slate-400 px-2 mb-6">Smart Diabetes Care</div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, icon: Icon, label }) => {
          const active = activePage === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                active ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-4 border-t border-slate-100">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 text-left"
        >
          <LogOut size={17} strokeWidth={2} />
          Logout
        </button>
      </div>
    </aside>
  );
}
