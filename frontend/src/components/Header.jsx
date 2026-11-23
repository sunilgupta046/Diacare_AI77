import { Calendar, User, ChevronDown } from "lucide-react";
import Chatbot from "./Chatbot";

// title/subtitle change per page. userName comes from the shared profile state.
export default function Header({ title, subtitle, userName = "User" }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-slate-500 text-sm mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <Chatbot />
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full px-4 py-2 text-sm text-slate-600 shadow-sm">
          <Calendar size={15} className="text-blue-600" />
          {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-full pl-2 pr-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
            <User size={13} className="text-blue-600" />
          </div>
          {userName}
          <ChevronDown size={14} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
}
