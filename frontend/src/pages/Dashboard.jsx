import { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot } from "recharts";
import {
  ClipboardList, ClipboardCheck, Droplet, Droplets, Ruler, Weight, Clock, Calculator,
  User, Activity, ShieldCheck, TrendingUp, ChevronDown, Info, FileText, ArrowRight,
  Lightbulb, Sparkles, Footprints, Stethoscope, Target, CalendarCheck2,
} from "lucide-react";
import Header from "../components/Header";
import { Field, RangeRow, InsightCard, StatCard } from "../components/Shared";
import { bandFor, computeBMI, bmiTag, sugarStatus, todayLabelParts, getTrackerStats, predictHbA1cFromValues } from "../data";
import { predictHbA1cFromReadings } from "../api";

function CustomDot(props) {
  const { cx, cy, value } = props;
  return (
    <g>
      <Dot cx={cx} cy={cy} r={4} fill="#2563EB" stroke="#fff" strokeWidth={2} />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize={11} fontWeight={600} fill="#1E293B">
        {value.toFixed(1)}%
      </text>
    </g>
  );
}

// Props come from App.jsx's shared state so every page stays in sync:
// readings (array), addReading(reading), profile, settings, goToPage(key), tracker
export default function Dashboard({ readings, addReading, profile, settings, goToPage, tracker }) {
  const trackerStats = useMemo(() => getTrackerStats(tracker), [tracker]);

  const [form, setForm] = useState({
    age: profile.age,
    gender: profile.gender,
    weight: profile.weight,
    height: profile.height,
    duration: 6,
  });

  const last = readings[readings.length - 1];
  const [result, setResult] = useState(() => ({
    hba1c: last.hba1c,
    fasting: trackerStats.fastingAvg ?? last.fasting,
    postprandial: trackerStats.postMealAvg ?? last.postprandial,
  }));
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionNotice, setPredictionNotice] = useState("");

  const bmi = useMemo(() => computeBMI(Number(form.weight), Number(form.height)), [form.weight, form.height]);
  const bmiInfo = bmiTag(bmi);
  const band = bandFor(result.hba1c);
  const chartData = readings.slice(-6);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: field === "gender" ? value : value === "" ? "" : Number(value) }));
  };

  const handlePredict = async () => {
    const allTrackerReadings = trackerStats.allValues;
    if (!allTrackerReadings || allTrackerReadings.length === 0) {
      setPredictionNotice("Please enter glucose readings in the Daily Habit Tracker before predicting HbA1c.");
      return;
    }

    setPredictionNotice("");
    setIsPredicting(true);

    const fasting = trackerStats.fastingAvg ?? Math.round(allTrackerReadings[0]);
    const postprandial = trackerStats.postMealAvg ?? Math.round(allTrackerReadings[allTrackerReadings.length - 1]);

    let hba1c;
    try {
      const response = await predictHbA1cFromReadings(allTrackerReadings);
      hba1c = Number(response?.data?.predicted_hba1c_pct ?? response?.predicted_hba1c);
      if (!Number.isFinite(hba1c)) throw new Error("Backend returned an invalid HbA1c value.");
    } catch {
      // Fallback using the clinical ADAG formula on all readings from the tracker
      hba1c = predictHbA1cFromValues(allTrackerReadings);
    } finally {
      setIsPredicting(false);
    }

    setResult({ hba1c, fasting, postprandial });

    const { label, dateStr } = todayLabelParts();
    addReading({ date: dateStr, label, fasting, postprandial, hba1c });
  };

  const fastingStatus = sugarStatus(result.fasting, [100, 130]);
  const ppStatus = sugarStatus(result.postprandial, [140, 200]);
  const recentReadings = [...readings].slice(-6).reverse();

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Predict your HbA1c level from your Daily Habit Tracker readings and clinical profile."
        userName={profile.name}
      />

      <div className="grid grid-cols-1 xl:grid-cols-[340px_380px_1fr] gap-5">
        {/* Enter readings */}
        <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm h-fit">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ClipboardList size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">HbA1c Prediction Profile</div>
              <div className="text-xs text-slate-400">Uses readings from Daily Habit Tracker</div>
            </div>
          </div>

          <div className="flex flex-col gap-3.5">
            <Field label="Age (Years)" icon={User}>
              <input type="number" value={form.age} onChange={handleChange("age")} className="input" />
            </Field>
            <Field label="Gender" icon={Activity}>
              <select value={form.gender} onChange={handleChange("gender")} className="input">
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </Field>

            {/* Daily Habit Tracker Blood Sugar Data */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-blue-900">
                  <CalendarCheck2 size={15} className="text-blue-600 shrink-0" />
                  <span>Daily Habit Tracker Readings</span>
                </div>
                {goToPage && (
                  <button
                    type="button"
                    onClick={() => goToPage("daily-tracker")}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5"
                  >
                    Open tracker <ArrowRight size={11} />
                  </button>
                )}
              </div>

              {trackerStats.count > 0 ? (
                <div className="space-y-2 text-slate-600">
                  <p className="text-[12px] leading-relaxed">
                    Taking all <strong className="text-slate-900 font-semibold">{trackerStats.count}</strong> readings entered in your Daily Habit Tracker for prediction.
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-0.5 text-[11px]">
                    <div className="bg-white rounded-lg p-2 border border-blue-100 shadow-2xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fasting avg</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {trackerStats.fastingAvg !== null ? trackerStats.fastingAvg : "—"}
                        <span className="text-[10px] font-normal text-slate-500 ml-0.5">{settings.units}</span>
                      </span>
                    </div>
                    <div className="bg-white rounded-lg p-2 border border-blue-100 shadow-2xs">
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Post-meal avg</span>
                      <span className="font-bold text-slate-800 text-sm">
                        {trackerStats.postMealAvg !== null ? trackerStats.postMealAvg : "—"}
                        <span className="text-[10px] font-normal text-slate-500 ml-0.5">{settings.units}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-0.5">
                    <span>Tracker glucose average:</span>
                    <span className="font-semibold text-slate-700">{trackerStats.overallAvg} {settings.units}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-slate-600">
                  <p className="text-[12px]">No readings entered in your Daily Habit Tracker yet.</p>
                  {goToPage && (
                    <button
                      type="button"
                      onClick={() => goToPage("daily-tracker")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs shadow-sm transition-colors"
                    >
                      Enter readings in tracker <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <Field label="Weight (kg)" icon={Weight}>
              <input type="number" value={form.weight} onChange={handleChange("weight")} className="input" />
            </Field>
            <Field label="Height (cm)" icon={Ruler}>
              <input type="number" value={form.height} onChange={handleChange("height")} className="input" />
            </Field>
            <Field label="BMI (kg/m²)" icon={Calculator}>
              <input readOnly value={bmi || ""} className="input bg-slate-50 text-slate-500" />
            </Field>
            <Field label="Duration of Diabetes (Years)" icon={Clock}>
              <input type="number" value={form.duration} onChange={handleChange("duration")} className="input" />
            </Field>

            {predictionNotice && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-start gap-2">
                <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                <span>{predictionNotice}</span>
              </div>
            )}

            <button
              onClick={handlePredict}
              disabled={isPredicting || trackerStats.count === 0}
              className="mt-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white font-medium text-sm rounded-xl py-3 shadow-sm"
            >
              <ClipboardCheck size={16} />
              {isPredicting ? "Predicting…" : `Predict HbA1c from Tracker (${trackerStats.count} readings)`}
            </button>
          </div>

          <div className="mt-4 flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2.5 text-xs text-slate-500">
            <ShieldCheck size={14} className="text-blue-500 shrink-0" />
            Your data is secure and confidential.
          </div>
        </section>

        {/* Result + Insights */}
        <div className="flex flex-col gap-5">
          <section className="bg-gradient-to-b from-emerald-50/60 to-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                <ClipboardCheck size={18} className="text-emerald-600" />
              </div>
              <div>
                <div className="font-semibold text-slate-900 text-sm">Your Result</div>
                <div className="text-xs text-slate-400">Predicted HbA1c Level</div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="text-xs text-slate-400 mb-1">Predicted HbA1c</div>
                  <div className="text-4xl font-extrabold" style={{ color: band.color }}>
                    {result.hba1c.toFixed(1)}<span className="text-xl align-top ml-0.5">%</span>
                  </div>
                  <span className={`inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full ${band.chip}`}>
                    {band.label}
                  </span>
                </div>
                <div className="flex-1 border-l border-slate-100 pl-4 flex flex-col justify-center gap-1.5 text-[11px]">
                  <div className="font-semibold text-slate-500 mb-0.5">HbA1c Range Guide</div>
                  <RangeRow color="#16A34A" range="Below 5.7%" label="Normal" />
                  <RangeRow color="#CA8A04" range="5.7% – 6.4%" label="Pre-Diabetes" />
                  <RangeRow color="#EA580C" range="6.5% – 7.9%" label="Fair Control" />
                  <RangeRow color="#DC2626" range="8.0% and above" label="Poor Control" />
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Lightbulb size={18} className="text-blue-600" />
                </div>
                <div className="font-semibold text-slate-900 text-sm">Insights & Recommendations</div>
              </div>
              <button onClick={() => goToPage("insights")} className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:gap-1.5 transition-all">
                See all <ArrowRight size={12} />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <InsightCard icon={Info} tone="blue" title="What this means">
                Your HbA1c level is {result.hba1c.toFixed(1)}%, which indicates {band.label.toLowerCase()} of blood sugar.
              </InsightCard>
              <InsightCard icon={Sparkles} tone="emerald" title={result.hba1c < settings.hba1cGoal ? "Good news" : "Keep going"}>
                {result.hba1c < settings.hba1cGoal
                  ? `You've reached your goal of under ${settings.hba1cGoal}%. Keep up the routine.`
                  : `A few consistent changes can bring your levels closer to your goal of under ${settings.hba1cGoal}%.`}
              </InsightCard>
              <InsightCard icon={Footprints} tone="amber" title="Recommendations" list={[
                "Follow a balanced diet and control carbohydrate intake.",
                "Exercise regularly – at least 30 minutes a day.",
                "Monitor your blood sugar levels consistently.",
              ]} />
              <InsightCard icon={Stethoscope} tone="red" title="Consult your doctor">
                Always discuss your results and treatment plan with your healthcare provider.
              </InsightCard>
            </div>
          </section>
        </div>

        {/* Trend + readings */}
        <div className="flex flex-col gap-5 min-w-0">
          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp size={18} className="text-blue-600" />
                </div>
                <div className="font-semibold text-slate-900 text-sm">HbA1c Trend (Fluctuation)</div>
              </div>
              <button onClick={() => goToPage("trends")} className="flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-100">
                Last 6 Months <ChevronDown size={13} />
              </button>
            </div>
            <div className="h-[230px] mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 24, right: 16, bottom: 0, left: -16 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={{ stroke: "#EEF2F7" }} tickLine={false} />
                  <YAxis domain={[5, 9]} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`${v.toFixed(1)}%`, "HbA1c"]} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                  <Line type="monotone" dataKey="hba1c" stroke="#2563EB" strokeWidth={2.5} dot={<CustomDot />} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex items-start gap-2 bg-blue-50/70 rounded-lg px-3 py-2.5 text-xs text-blue-700 mt-1">
              <Info size={14} className="shrink-0 mt-0.5" />
              {chartData[chartData.length - 1].hba1c <= chartData[0].hba1c
                ? "Your HbA1c is gradually improving. Keep it up!"
                : "Your HbA1c has increased recently. Consider reviewing your routine."}
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FileText size={18} className="text-blue-600" />
                </div>
                <div className="font-semibold text-slate-900 text-sm">Recent Readings</div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-100">
                    <th className="text-left font-medium py-2">Date</th>
                    <th className="text-left font-medium py-2">Fasting</th>
                    <th className="text-left font-medium py-2">Postprandial</th>
                    <th className="text-left font-medium py-2">HbA1c (%)</th>
                    <th className="text-left font-medium py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReadings.map((r) => {
                    const rBand = bandFor(r.hba1c);
                    return (
                      <tr key={r.id ?? r.date} className="border-b border-slate-50 last:border-0">
                        <td className="py-2.5 text-slate-600">{r.date}</td>
                        <td className="py-2.5 text-slate-600">{r.fasting}</td>
                        <td className="py-2.5 text-slate-600">{r.postprandial}</td>
                        <td className="py-2.5 text-slate-600">{r.hba1c.toFixed(1)}</td>
                        <td className="py-2.5"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${rBand.chip}`}>{rBand.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button onClick={() => goToPage("history")} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mt-4 hover:gap-2.5 transition-all">
              View Full History <ArrowRight size={13} />
            </button>
          </section>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
        <StatCard icon={Droplet} iconBg="bg-blue-50" iconColor="text-blue-500" label="Fasting Sugar" value={result.fasting} unit={settings.units} tag={fastingStatus.label} tagColor={fastingStatus.color} />
        <StatCard icon={Droplets} iconBg="bg-emerald-50" iconColor="text-emerald-500" label="Post-meal Sugar" value={result.postprandial} unit={settings.units} tag={ppStatus.label} tagColor={ppStatus.color} />
        <StatCard icon={Calculator} iconBg="bg-violet-50" iconColor="text-violet-500" label="BMI" value={bmi} unit="" tag={bmiInfo.label} tagColor={bmiInfo.color} />
        <StatCard icon={Clock} iconBg="bg-orange-50" iconColor="text-orange-500" label="Diabetes Duration" value={form.duration} unit="Years" tag={form.duration >= 10 ? "Long-term" : form.duration >= 5 ? "Moderate" : "Early"} tagColor="text-orange-600" />
        <StatCard icon={Target} iconBg="bg-emerald-50" iconColor="text-emerald-500" label="Goal HbA1c" value={`< ${settings.hba1cGoal}`} unit="%" tag="Recommended" tagColor="text-emerald-600" />
      </div>
    </>
  );
}
