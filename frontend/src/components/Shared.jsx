// Small presentational components reused by several pages.

export function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5">
        {Icon && <Icon size={13} className="text-blue-500" />}
        {label}
      </span>
      {children}
    </label>
  );
}

export function RangeRow({ color, range, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-slate-500 w-[86px]">{range}</span>
      <span className="text-slate-700 font-medium">{label}</span>
    </div>
  );
}

const toneMap = {
  blue: { bg: "bg-blue-50", iconBg: "bg-blue-100", iconColor: "text-blue-600", title: "text-blue-800" },
  emerald: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", title: "text-emerald-800" },
  amber: { bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-700", title: "text-amber-800" },
  red: { bg: "bg-red-50", iconBg: "bg-red-100", iconColor: "text-red-600", title: "text-red-800" },
};

export function InsightCard({ icon: Icon, tone, title, children, list }) {
  const t = toneMap[tone];
  return (
    <div className={`flex gap-3 rounded-xl p-3.5 ${t.bg}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.iconBg}`}>
        <Icon size={15} className={t.iconColor} />
      </div>
      <div className="text-xs leading-relaxed">
        <div className={`font-semibold mb-0.5 ${t.title}`}>{title}</div>
        {list ? (
          <ul className="text-slate-600 space-y-0.5 mt-1">
            {list.map((item, i) => <li key={i}>• {item}</li>)}
          </ul>
        ) : (
          <p className="text-slate-600">{children}</p>
        )}
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, iconBg, iconColor, label, value, unit, tag, tagColor }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${iconBg}`}>
        <Icon size={17} className={iconColor} />
      </div>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-slate-900">
        {value} <span className="text-sm font-medium text-slate-400">{unit}</span>
      </div>
      <div className={`text-xs font-semibold mt-1 ${tagColor}`}>{tag}</div>
    </div>
  );
}

export function StatusChip({ hba1c, chipClass, label }) {
  return <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${chipClass}`}>{label}</span>;
}
