import { useEffect, useState } from "react";
import { AlertTriangle, Calculator, CheckCircle2, Info, LoaderCircle, Plus, ShieldCheck, Trash2, Utensils } from "lucide-react";
import Header from "../components/Header";
import {
  calibrateInsulinModel,
  createInsulinPatient,
  getInsulinPredictionHistory,
  getInsulinPatient,
  predictMealInsulin,
} from "../api";
import { INSULIN_PATIENT_ID_KEY } from "../data";

const CARB_RATIO_KEY = "diacare-clinician-carb-ratio";
const MEAL_SUGGESTIONS = [
  { name: "1 bowl cooked rice", portion: "1 bowl", mealTime: "Lunch" },
  { name: "2 rotis", portion: "2 pieces", mealTime: "Lunch" },
  { name: "1 bowl dal", portion: "1 bowl", mealTime: "Lunch" },
  { name: "Idli", portion: "2 pieces", mealTime: "Breakfast" },
  { name: "Dosa", portion: "1 medium", mealTime: "Breakfast" },
  { name: "Oatmeal", portion: "1 bowl", mealTime: "Breakfast" },
  { name: "Bread", portion: "2 slices", mealTime: "Breakfast" },
  { name: "Biryani", portion: "1 bowl", mealTime: "Lunch" },
  { name: "Pasta", portion: "1 bowl", mealTime: "Dinner" },
  { name: "Apple", portion: "1 medium", mealTime: "Snack" },
  { name: "Banana", portion: "1 medium", mealTime: "Snack" },
  { name: "Yogurt", portion: "1 cup", mealTime: "Snack" },
];

function getLocalPatientId() {
  try {
    const existingId = window.localStorage.getItem(INSULIN_PATIENT_ID_KEY);
    if (existingId) return existingId;
    const patientId = `diacare${crypto.randomUUID().replaceAll("-", "")}`;
    window.localStorage.setItem(INSULIN_PATIENT_ID_KEY, patientId);
    return patientId;
  } catch {
    return `diacare${Date.now()}`;
  }
}

async function ensurePatient(patientId, profile, baselineIcr = 12) {
  try {
    await getInsulinPatient(patientId);
  } catch (error) {
    if (error.status !== 404) throw error;
    await createInsulinPatient({
      patient_id: patientId,
      name: profile.name || "Dia Care user",
      age: profile.age,
      gender: profile.gender || "Unspecified",
      diabetes_type: "Unspecified",
      baseline_icr: baselineIcr,
      target_glucose: 100,
    });
  }
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function NumberField({ label, unit, value, onChange, required = false, min = 0, step = "0.1" }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}{unit && <span className="text-slate-400"> ({unit})</span>}</span>
      <input
        type="number"
        min={min}
        step={step}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      />
    </label>
  );
}

function historyTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function InsulinPrediction({ profile }) {
  const [patientId] = useState(getLocalPatientId);
  const [meals, setMeals] = useState([{ id: crypto.randomUUID(), food_query: "", quantity: "1" }]);
  const [mealTime, setMealTime] = useState("Lunch");
  const [carbRatio, setCarbRatio] = useState(() => {
    try {
      return window.localStorage.getItem(CARB_RATIO_KEY) || "";
    } catch {
      return "";
    }
  });
  const [calibration, setCalibration] = useState({ meal_query: "", actual_units: "", meal_time: "Lunch" });
  const [prediction, setPrediction] = useState(null);
  const [calibrationResult, setCalibrationResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [calibrating, setCalibrating] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(CARB_RATIO_KEY, carbRatio);
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }, [carbRatio]);

  useEffect(() => {
    let cancelled = false;
    ensurePatient(patientId, profile)
      .then(() => getInsulinPredictionHistory(patientId))
      .then((result) => {
        if (!cancelled) setHistory(result.history || []);
      })
      .catch((requestError) => {
        if (!cancelled) setHistoryError(requestError.message || "Unable to load prediction history.");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const updateCalibration = (patch) => setCalibration((current) => ({ ...current, ...patch }));

  const updateMeal = (mealId, patch) => {
    setMeals((current) => current.map((meal) => (
      meal.id === mealId ? { ...meal, ...patch } : meal
    )));
  };

  const addMeal = (foodQuery = "") => {
    setMeals((current) => [
      ...current,
      { id: crypto.randomUUID(), food_query: foodQuery, quantity: "1" },
    ]);
  };

  const chooseSuggestedMeal = (suggestion) => {
    setMealTime(suggestion.mealTime);
    setMeals((current) => {
      const emptyMealIndex = current.findIndex((meal) => !meal.food_query.trim());
      if (emptyMealIndex < 0) {
        return [...current, { id: crypto.randomUUID(), food_query: suggestion.name, quantity: "1" }];
      }
      return current.map((meal, index) => (
        index === emptyMealIndex ? { ...meal, food_query: suggestion.name } : meal
      ));
    });
  };

  const handlePredict = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPrediction(null);
    try {
      const selectedMeals = meals
        .filter((meal) => meal.food_query.trim())
        .map((meal) => ({
          food_query: meal.food_query.trim(),
          quantity: Number(meal.quantity),
        }));
      if (!selectedMeals.length) {
        throw new Error("Add at least one meal item before calculating.");
      }
      if (selectedMeals.some((meal) => !Number.isFinite(meal.quantity) || meal.quantity <= 0)) {
        throw new Error("Enter a quantity greater than zero for every meal item.");
      }
      await ensurePatient(patientId, profile, Number(carbRatio));
      const result = await predictMealInsulin(patientId, {
        meals: selectedMeals,
        meal_time: mealTime,
        baseline_icr: Number(carbRatio),
      });
      setPrediction({ ...result.insulin_prediction });
      setHistoryError("");
      try {
        const updatedHistory = await getInsulinPredictionHistory(patientId);
        setHistory(updatedHistory.history || []);
      } catch (historyRequestError) {
        setHistoryError(historyRequestError.message || "Prediction saved, but history could not be refreshed.");
      }
    } catch (requestError) {
      setError(requestError.message || "Unable to get an insulin prediction. Check that the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleCalibration = async (event) => {
    event.preventDefault();
    setCalibrating(true);
    setError("");
    setCalibrationResult(null);
    try {
      await ensurePatient(patientId, profile, Number(carbRatio) || 12);
      const result = await calibrateInsulinModel(patientId, {
        meal_query: calibration.meal_query.trim(),
        actual_units: Number(calibration.actual_units),
        meal_time: calibration.meal_time,
      });
      setCalibrationResult(result);
      setPrediction(null);
    } catch (requestError) {
      setError(requestError.message || "Unable to calibrate the insulin model.");
    } finally {
      setCalibrating(false);
    }
  };

  return (
    <>
      <Header
        title="Insulin Prediction"
        subtitle="Estimate a meal bolus using the personalized insulin model."
        userName={profile.name}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <section className="border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Calculator size={18} /></div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Meal items and portions</h2>
                <p className="text-xs text-slate-500">Add all foods and quantities in the meal; estimates are combined.</p>
              </div>
            </div>

            <form onSubmit={handlePredict} className="space-y-4">
              <datalist id="meal-suggestions">
                {MEAL_SUGGESTIONS.map((meal) => <option key={meal.name} value={meal.name} />)}
              </datalist>
              <div className="space-y-3">
                {meals.map((meal, index) => (
                  <div key={meal.id} className="grid items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3 sm:grid-cols-[minmax(0,1fr)_145px_40px]">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-slate-600">Food {index + 1}</span>
                      <input
                        type="text"
                        minLength={2}
                        value={meal.food_query}
                        list="meal-suggestions"
                        onChange={(event) => updateMeal(meal.id, { food_query: event.target.value })}
                        placeholder="e.g. 2 rotis, rice, dal"
                        className={inputClass}
                      />
                    </label>
                    <NumberField
                      label="Quantity"
                      unit="portions"
                      min="0.1"
                      step="0.1"
                      value={meal.quantity}
                      onChange={(quantity) => updateMeal(meal.id, { quantity })}
                    />
                    <button
                      type="button"
                      disabled={meals.length === 1}
                      onClick={() => setMeals((current) => current.filter((item) => item.id !== meal.id))}
                      aria-label={`Remove food ${index + 1}`}
                      className="mb-0.5 flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-red-200 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addMeal()}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
                >
                  <Plus size={15} /> Add another food
                </button>
                <div>
                  <p className="mb-2 text-[11px] font-medium text-slate-500">Meal suggestions · typical portion</p>
                  <div className="flex flex-wrap gap-2">
                    {MEAL_SUGGESTIONS.slice(0, 6).map((meal) => (
                      <button
                        key={meal.name}
                        type="button"
                        onClick={() => chooseSuggestedMeal(meal)}
                        className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100"
                      >
                        {meal.name} <span className="text-blue-600">({meal.portion})</span>
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate-500">Suggestions are examples. Check actual portions with nutrition information and your clinician.</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">Meal time</span>
                  <select value={mealTime} onChange={(event) => setMealTime(event.target.value)} className={inputClass}>
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Dinner</option>
                    <option>Snack</option>
                  </select>
                </label>
                <NumberField
                  label="Clinician-prescribed carb ratio"
                  unit="g per unit"
                  min="0.1"
                  step="0.1"
                  required
                  value={carbRatio}
                  onChange={setCarbRatio}
                />
              </div>

              <button type="submit" disabled={loading || calibrating} className="flex items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60">
                {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Calculator size={16} />}
                {loading ? "Calculating..." : "Predict insulin dose"}
              </button>
            </form>
          </section>

          <details className="border border-slate-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-slate-800">Doctor calibration (optional)</summary>
            <div className="border-t border-slate-100 p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700"><Utensils size={17} /></div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Train from a prescription</h2>
                  <p className="text-xs text-slate-500">Use a meal and dose prescribed by your clinician.</p>
                </div>
              </div>
              <form onSubmit={handleCalibration} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">Prescribed meal</span>
                  <input
                    type="text"
                    required
                    value={calibration.meal_query}
                    onChange={(event) => updateCalibration({ meal_query: event.target.value })}
                    placeholder="e.g. 2 rotis and 1 bowl dal"
                    className={inputClass}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <NumberField label="Prescribed insulin" unit="units" min="0.1" step="0.1" required value={calibration.actual_units} onChange={(actual_units) => updateCalibration({ actual_units })} />
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-medium text-slate-600">Meal time</span>
                    <select value={calibration.meal_time} onChange={(event) => updateCalibration({ meal_time: event.target.value })} className={inputClass}>
                      <option>Breakfast</option>
                      <option>Lunch</option>
                      <option>Dinner</option>
                      <option>Snack</option>
                    </select>
                  </label>
                </div>
                <button type="submit" disabled={loading || calibrating} className="flex items-center gap-2 rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-50 disabled:cursor-wait disabled:opacity-60">
                  {calibrating ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {calibrating ? "Updating model..." : "Calibrate from prescription"}
                </button>
              </form>
            </div>
          </details>
        </div>

        <div className="space-y-4">
          {error && (
            <div role="alert" className="flex gap-3 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {prediction && (
            <section aria-live="polite" className="border border-blue-200 bg-white shadow-sm">
              <div className="border-b border-blue-100 bg-blue-50 px-5 py-4">
                <div className="text-xs font-medium text-blue-700">Estimated meal bolus</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-900">{prediction.predicted_units}</span>
                  <span className="text-sm font-medium text-slate-500">units</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
                  <span>Meal: <strong>{prediction.meals?.map((meal) => `${meal.quantity} × ${meal.food_query}`).join(" + ") || prediction.food_name}</strong></span>
                  <span>Meal time: <strong>{prediction.meal_time}</strong></span>
                </div>
                <p className="mt-1 text-xs text-slate-600">Suggested pen setting: <strong>{prediction.suggested_pen_units} units</strong></p>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-700" />
                  <span>{prediction.confidence}. Effective ICR: 1 unit per {prediction.effective_icr}g carbohydrates.</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">{prediction.explanation}</p>
                {prediction.alerts?.map((alert) => (
                  <div key={alert} className="flex items-start gap-2 border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                    <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                    {alert}
                  </div>
                ))}
                <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Model: {prediction.model_type} · {prediction.training_samples} calibration meal(s)
                </div>
              </div>
            </section>
          )}

          {calibrationResult && (
            <div role="status" className="flex gap-3 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Model calibrated</p>
                <p className="mt-1 text-xs">{calibrationResult.message}</p>
              </div>
            </div>
          )}

          {!prediction && !calibrationResult && !error && (
            <div className="border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Info size={18} className="shrink-0 text-blue-600" />
                <h2 className="text-sm font-semibold text-slate-900">Personalized dosing model</h2>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">The model adjusts for meal carbohydrates, fiber, fat, protein, meal time, and doctor-entered calibration meals.</p>
            </div>
          )}

          <div className="border-l-2 border-amber-500 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            Insulin estimates are not medical advice. Follow your clinician's dosing plan and verify any dose with them, especially before acting on an uncalibrated estimate.
          </div>
        </div>
      </div>

      <section className="mt-5 border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Prediction history</h2>
            <p className="mt-0.5 text-xs text-slate-500">Recent meal estimates saved to your patient record.</p>
          </div>
          <span className="text-xs text-slate-400">{history.length} saved</span>
        </div>
        {historyError && <p role="status" className="px-5 py-3 text-xs text-amber-700">{historyError}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Meal</th>
                <th className="px-3 py-3 font-medium">Quantity</th>
                <th className="px-3 py-3 font-medium">Time</th>
                <th className="px-3 py-3 font-medium">Carbs</th>
                <th className="px-5 py-3 text-right font-medium">Predicted dose</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading && <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400">Loading history...</td></tr>}
              {!historyLoading && history.length === 0 && <tr><td colSpan={6} className="px-5 py-6 text-center text-slate-400">No saved predictions yet.</td></tr>}
              {!historyLoading && history.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-100 text-slate-600">
                  <td className="whitespace-nowrap px-5 py-3">{historyTimestamp(entry.created_at || entry.timestamp)}</td>
                  <td className="px-3 py-3">{entry.meals?.map((meal) => `${meal.quantity} × ${meal.food_query}`).join(" + ") || entry.food_query || entry.meal_query}</td>
                  <td className="px-3 py-3">{entry.quantity ?? "—"} portion(s)</td>
                  <td className="px-3 py-3">{entry.meal_time}</td>
                  <td className="px-3 py-3">{Number.isFinite(Number(entry.carbs_g)) ? `${Number(entry.carbs_g).toFixed(1)} g` : "—"}</td>
                  <td className="px-5 py-3 text-right font-semibold text-slate-800">
                    {entry.type === "calibration"
                      ? `${Number(entry.actual_units).toFixed(2)} units prescribed`
                      : `${Number(entry.predicted_units).toFixed(2)} units estimated`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}