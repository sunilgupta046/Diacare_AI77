import { useState, useMemo } from "react";
import { Lightbulb, Info, Sparkles, Footprints, Stethoscope, Apple, Dumbbell, Moon, BarChart3, AlertTriangle, Clock3, ShieldAlert } from "lucide-react";
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import Header from "../components/Header";
import { InsightCard } from "../components/Shared";
import { bandFor, getTrackerAnalysis } from "../data";

const TABS = ["Overview", "Tracker analysis", "Diet", "Exercise", "Medical"];

export default function Insights({ readings, settings, profile, tracker }) {
  const [tab, setTab] = useState("Overview");
  const latest = readings[readings.length - 1];
  const previous = readings[readings.length - 2] ?? latest;
  const band = bandFor(latest.hba1c);
  const improving = latest.hba1c <= previous.hba1c;
  const trackerAnalysis = useMemo(() => getTrackerAnalysis(tracker), [tracker]);
  const highPattern = trackerAnalysis.mostFrequentHigh?.highCount > 0
    ? trackerAnalysis.mostFrequentHigh
    : null;
  const lowPattern = trackerAnalysis.mostFrequentLow;

  const streak = useMemo(() => {
    let count = 0;
    for (let i = readings.length - 1; i > 0; i--) {
      if (readings[i].hba1c <= readings[i - 1].hba1c) count++;
      else break;
    }
    return count;
  }, [readings]);

  return (
    <>
      <Header title="Insights" subtitle="Personalized guidance based on your latest readings." userName={profile.name} />

      <div className="flex gap-2 bg-white border border-slate-200 rounded-xl p-1 shadow-sm mb-5 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t ? "bg-blue-600 text-white" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Lightbulb size={18} className="text-blue-600" />
          </div>
          <div className="font-semibold text-slate-900 text-sm">{tab} Insights</div>
        </div>

        <div className="flex flex-col gap-3">
          {tab === "Overview" && (
            <>
              <InsightCard icon={Info} tone="blue" title="Current status">
                Your latest HbA1c is {latest.hba1c.toFixed(1)}% ({band.label}), recorded on {latest.date}.
              </InsightCard>
              <InsightCard icon={Sparkles} tone={improving ? "emerald" : "amber"} title={improving ? "Trending down" : "Trending up"}>
                {improving
                  ? `You've improved or held steady for ${streak} consecutive reading${streak === 1 ? "" : "s"}. Nice work.`
                  : "Your last reading rose compared to the one before it. One change worth revisiting: sleep, stress, or a recent diet shift."}
              </InsightCard>
              <InsightCard icon={Footprints} tone="amber" title="Distance to goal">
                {latest.hba1c <= settings.hba1cGoal
                  ? `You're at or below your goal of ${settings.hba1cGoal}%.`
                  : `You're ${(latest.hba1c - settings.hba1cGoal).toFixed(1)} points above your goal of ${settings.hba1cGoal}%. Small, steady changes close this fastest.`}
              </InsightCard>
            </>
          )}

          {tab === "Tracker analysis" && (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-[11px] font-medium text-slate-500">Tracker readings analyzed</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{trackerAnalysis.totalReadings}</div>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50 p-3">
                  <div className="text-[11px] font-medium text-red-700">High-pattern slot</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{trackerAnalysis.mostFrequentHigh?.label ?? "Not enough data"}</div>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                  <div className="text-[11px] font-medium text-amber-800">Hypos recorded</div>
                  <div className="mt-1 text-xl font-bold text-slate-900">{trackerAnalysis.hypoEvents}</div>
                </div>
              </div>

              {trackerAnalysis.totalReadings === 0 ? (
                <InsightCard icon={Info} tone="blue" title="Add tracker readings first">
                  Enter readings in the Daily Habit Tracker to see fasting, meal-window, anomaly, and hypo-time patterns here.
                </InsightCard>
              ) : (
                <>
                  <div className="rounded-xl border border-slate-200 p-3">
                    <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <BarChart3 size={15} className="text-blue-600" /> Average glucose by reading window
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trackerAnalysis.slotStats.filter((slot) => slot.count > 0)} margin={{ top: 8, right: 8, bottom: 8, left: -20 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                          <XAxis dataKey="chartLabel" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} interval={0} angle={-18} textAnchor="end" height={48} />
                          <YAxis tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                          <Tooltip formatter={(value) => [`${Number(value).toFixed(1)} mg/dL`, "Average"]} contentStyle={{ borderRadius: 10, border: "1px solid #E2E8F0", fontSize: 12 }} />
                          <Bar dataKey="average" fill="#2563EB" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <AlertTriangle size={15} className="text-red-600" /> High and low reading patterns
                      </div>
                      <div className="space-y-2">
                        {trackerAnalysis.slotStats.filter((slot) => slot.count > 0).map((slot) => (
                          <div key={slot.key}>
                            <div className="mb-1 flex justify-between text-[11px] text-slate-600">
                              <span>{slot.label}</span>
                              <span>{slot.highCount} high · {slot.lowCount} low</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.min(slot.highRate * 100, 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 p-3">
                      <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-800">
                        <Clock3 size={15} className="text-amber-600" /> Usual hypo times
                      </div>
                      {trackerAnalysis.hypoTimeStats.length > 0 ? (
                        <div className="space-y-2">
                          {trackerAnalysis.hypoTimeStats.map((time) => (
                            <div key={time.key} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2 text-xs">
                              <span className="text-amber-900">{time.label}</span>
                              <span className="font-bold text-amber-800">{time.count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500">No hypo times have been recorded.</p>
                      )}
                    </div>
                  </div>

                  <InsightCard icon={Footprints} tone="emerald" title="Movement suggestion">
                    {trackerAnalysis.mostFrequentHigh
                      ? `Your most frequent high pattern is ${trackerAnalysis.mostFrequentHigh.label}. A gentle 10–15 minute walk after that meal may help, if your clinician has cleared exercise and you are not low. Recheck your response in the tracker.`
                      : "Keep logging consistently. A 10–15 minute walk after meals can support glucose control when it is safe for you."}
                  </InsightCard>
                  <InsightCard icon={ShieldAlert} tone="red" title="Insulin safety">
                    This analysis does not calculate insulin units. Do not increase or decrease insulin from app suggestions; recurring highs or any lows should be reviewed with your diabetes clinician, who can adjust the dose safely using your medication plan.
                  </InsightCard>
                </>
              )}
            </div>
          )}

          {tab === "Diet" && (
            <>
              <InsightCard icon={Apple} tone="emerald" title={highPattern ? `Food choices for ${highPattern.label}` : "Diet and tracker pattern"}>
                {highPattern
                  ? `${highPattern.highCount} of ${highPattern.count} ${highPattern.label.toLowerCase()} readings were above ${highPattern.highThreshold} mg/dL (average ${highPattern.average.toFixed(0)} mg/dL). Try consistent portions of high-fiber carbohydrates paired with protein and non-starchy vegetables at the related meal.`
                  : trackerAnalysis.totalReadings === 0
                    ? "Log glucose readings in the Daily Habit Tracker to get food suggestions based on your meal-time patterns."
                    : "No recurring above-target reading window is showing in the tracker. Continue balanced meals with high-fiber carbohydrates, protein, and non-starchy vegetables."}
              </InsightCard>
              <InsightCard icon={Info} tone="blue" title="Why this may help">
                Fiber-rich foods and pairing carbohydrates with protein can slow digestion and may reduce sharp after-meal glucose rises. Keep portions steady rather than making restrictive diet changes.
              </InsightCard>
              {lowPattern && (
                <InsightCard icon={AlertTriangle} tone="amber" title={`Low readings around ${lowPattern.label}`}>
                  {lowPattern.lowCount} low reading{lowPattern.lowCount === 1 ? " was" : "s were"} recorded in this window. Keep meals regular and discuss recurring lows with your diabetes care team, especially if you use glucose-lowering medication.
                </InsightCard>
              )}
              <InsightCard icon={Info} tone="blue" title="Postprandial reading">
                Your postprandial reading was {latest.postprandial} mg/dL. Readings above 180 mg/dL two hours after eating are worth flagging to your doctor if they recur.
              </InsightCard>
            </>
          )}

          {tab === "Exercise" && (
            <>
              <InsightCard icon={Dumbbell} tone="amber" title={highPattern ? `Movement around ${highPattern.label}` : "Movement and tracker pattern"}>
                {highPattern
                  ? `Your ${highPattern.label.toLowerCase()} window has the most frequent above-target readings (${highPattern.highCount} of ${highPattern.count}). If this follows a meal, consider a gentle 10–15 minute walk afterward, if it is safe for you and approved by your clinician.`
                  : trackerAnalysis.totalReadings === 0
                    ? "Log readings in the Daily Habit Tracker to get activity suggestions related to your glucose patterns."
                    : "The tracker does not show a recurring above-target window. Aim for regular, comfortable activity, such as walking, and continue monitoring your readings."}
              </InsightCard>
              <InsightCard icon={Info} tone="blue" title="Why this may help">
                Active muscles use glucose for energy, so gentle movement after a meal may help moderate the post-meal rise. Build activity gradually and follow your clinician’s guidance.
              </InsightCard>
              {(lowPattern || trackerAnalysis.hypoEvents > 0) && (
                <InsightCard icon={AlertTriangle} tone="red" title="Check for lows before activity">
                  Your tracker includes low readings{lowPattern ? `, especially around ${lowPattern.label.toLowerCase()}` : ""}. Avoid exercising while low and follow your personal care plan; ask your clinician how to adjust activity safely.
                </InsightCard>
              )}
              <InsightCard icon={Dumbbell} tone="amber" title="Build a steady routine" list={[
                "Work toward regular moderate activity through the week, at a pace that feels comfortable.",
                "Include strength or resistance activity when appropriate for your health and mobility.",
              ]} />
              <InsightCard icon={Moon} tone="blue" title="Recovery matters">
                Poor sleep and high stress both raise fasting glucose independent of diet — they're worth tracking alongside meals.
              </InsightCard>
            </>
          )}

          {tab === "Medical" && (
            <>
              <InsightCard icon={Stethoscope} tone="red" title="Talk to your doctor">
                Always discuss changes in your HbA1c trend, medication timing, or symptoms with your healthcare provider before adjusting treatment.
              </InsightCard>
              <InsightCard icon={Info} tone="blue" title="Testing cadence">
                Most guidelines suggest checking HbA1c every 3 months while adjusting treatment, and every 6 months once stable at goal.
              </InsightCard>
            </>
          )}
        </div>
      </section>
    </>
  );
}
