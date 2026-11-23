import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import Header from "../components/Header";

const METRICS = [
  { key: "hba1c", label: "HbA1c (%)", color: "#2563EB", domain: [5, 9] },
  { key: "fasting", label: "Fasting Sugar (mg/dL)", color: "#F97316", domain: [80, 260] },
  { key: "postprandial", label: "Postprandial Sugar (mg/dL)", color: "#16A34A", domain: [100, 300] },
];

const RANGES = [
  { key: "3", label: "Last 3 Months" },
  { key: "6", label: "Last 6 Months" },
  { key: "12", label: "Last 12 Months" },
];

export default function TrendsGraphs({ readings, profile }) {
  const [metricKey, setMetricKey] = useState("hba1c");
  const [range, setRange] = useState("6");

  const metric = METRICS.find((m) => m.key === metricKey);
  const data = useMemo(() => readings.slice(-Number(range)), [readings, range]);

  const values = data.map((d) => d[metricKey]);
  const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "0";
  const min = values.length ? Math.min(...values).toFixed(1) : "0";
  const max = values.length ? Math.max(...values).toFixed(1) : "0";
  const delta = values.length > 1 ? values[values.length - 1] - values[0] : 0;

  const TrendIcon = delta < -0.05 ? TrendingDown : delta > 0.05 ? TrendingUp : Minus;
  const trendColor = delta < -0.05 ? "text-emerald-600" : delta > 0.05 ? "text-red-600" : "text-slate-500";
  const trendLabel = delta < -0.05 ? "Improving" : delta > 0.05 ? "Worsening" : "Stable";

  return (
    <>
      <Header title="Trends & Graphs" subtitle="Track how your readings move over time." userName={profile.name} />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                metricKey === m.key ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r.key ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5">
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity size={18} className="text-blue-600" />
            </div>
            <div className="font-semibold text-slate-900 text-sm">{metric.label} over time</div>
          </div>
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 16, right: 20, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#EEF2F7" }} tickLine={false} />
                <YAxis domain={metric.domain} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                <Line type="monotone" dataKey={metricKey} stroke={metric.color} strokeWidth={2.5} dot={{ r: 3.5 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">Average</div>
            <div className="text-2xl font-bold text-slate-900">{avg}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">Lowest</div>
            <div className="text-2xl font-bold text-emerald-600">{min}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">Highest</div>
            <div className="text-2xl font-bold text-red-500">{max}</div>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="text-xs text-slate-400 mb-1">Trend</div>
            <div className={`flex items-center gap-1.5 text-lg font-bold ${trendColor}`}>
              <TrendIcon size={18} /> {trendLabel}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
