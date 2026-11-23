import { useEffect, useMemo, useState } from "react";
import { Download, FileText, Printer } from "lucide-react";
import Header from "../components/Header";
import { getInsulinPredictionHistory } from "../api";
import { bandFor, INSULIN_PATIENT_ID_KEY } from "../data";

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function downloadCSV(readings) {
  const header = ["Date", "Fasting (mg/dL)", "Postprandial (mg/dL)", "HbA1c (%)", "Status"];
  const rows = readings.map((reading) => [
    reading.date,
    reading.fasting,
    reading.postprandial,
    Number(reading.hba1c).toFixed(1),
    bandFor(reading.hba1c).label,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `diacare-clinical-summary-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Reports({ readings = [], profile = {}, settings = {} }) {
  const [insulinHistory, setInsulinHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let patientId = "";
    try {
      patientId = window.localStorage.getItem(INSULIN_PATIENT_ID_KEY) || "";
    } catch {
      if (!cancelled) {
        setHistoryError("Insulin history is unavailable because browser storage could not be read.");
        setHistoryLoading(false);
      }
      return () => {
        cancelled = true;
      };
    }

    if (!patientId) {
      setHistoryLoading(false);
      return () => {
        cancelled = true;
      };
    }

    getInsulinPredictionHistory(patientId, 100)
      .then((result) => {
        if (!cancelled) setInsulinHistory(result.history || []);
      })
      .catch((error) => {
        if (!cancelled) setHistoryError(error.message || "Unable to load saved insulin history.");
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(() => {
    const hba1cs = readings.map((reading) => Number(reading.hba1c)).filter(Number.isFinite);
    const fastingValues = readings.map((reading) => Number(reading.fasting)).filter(Number.isFinite);
    const postprandialValues = readings.map((reading) => Number(reading.postprandial)).filter(Number.isFinite);
    const average = (values) => values.length
      ? (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1)
      : "—";
    return {
      averageHba1c: average(hba1cs),
      averageFasting: average(fastingValues),
      averagePostprandial: average(postprandialValues),
      total: readings.length,
      breakdown: readings.reduce((counts, reading) => {
        const label = bandFor(Number(reading.hba1c)).label;
        counts[label] = (counts[label] || 0) + 1;
        return counts;
      }, {}),
    };
  }, [readings]);

  const predictions = insulinHistory.filter((entry) => entry.type === "meal_prediction");
  const generatedAt = new Date();

  return (
    <>
      <Header title="Reports" subtitle="Prepare a clear care summary to print or share with your clinician." userName={profile.name} />

      <div className="mb-4 flex flex-wrap justify-end gap-3 print:hidden">
        <button
          onClick={() => downloadCSV(readings)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <Download size={15} /> Download readings CSV
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-800"
        >
          <Printer size={15} /> Print clinical report
        </button>
      </div>

      <article className="clinical-report overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b-4 border-blue-700 px-7 py-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">DiaCare · Patient Services</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Diabetes Care Summary</h1>
              <p className="mt-1 text-sm text-slate-500">Patient monitoring report for clinician review</p>
            </div>
          </div>
          <div className="text-left text-sm sm:text-right">
            <p className="font-semibold text-slate-800">Report generated</p>
            <p className="mt-1 text-slate-600">{formatDateTime(generatedAt.toISOString())}</p>
            <p className="mt-1 text-xs text-slate-500">HbA1c goal: &lt; {settings.hba1cGoal ?? 7}%</p>
          </div>
        </header>

        <section className="report-demographics border-b border-slate-200 px-7 py-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Patient information</h2>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-slate-500">Patient name</p><p className="mt-1 font-semibold text-slate-900">{profile.name || "Not provided"}</p></div>
            <div><p className="text-xs text-slate-500">Age / gender</p><p className="mt-1 font-semibold text-slate-900">{profile.age ? `${profile.age} years` : "—"} / {profile.gender || "—"}</p></div>
            <div><p className="text-xs text-slate-500">Diagnosis date</p><p className="mt-1 font-semibold text-slate-900">{formatDate(profile.diagnosedDate)}</p></div>
            <div><p className="text-xs text-slate-500">Report period</p><p className="mt-1 font-semibold text-slate-900">{readings.length ? `${readings[0].date} – ${readings[readings.length - 1].date}` : "No glucose readings recorded"}</p></div>
          </div>
        </section>

        <section className="report-metrics grid grid-cols-2 gap-3 border-b border-slate-200 px-7 py-5 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Readings on file</p><p className="mt-1 text-xl font-bold text-slate-900">{stats.total}</p></div>
          <div className="rounded-lg bg-blue-50 p-3"><p className="text-xs text-slate-600">Average HbA1c</p><p className="mt-1 text-xl font-bold text-blue-800">{stats.averageHba1c}{stats.averageHba1c !== "—" ? "%" : ""}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Average fasting glucose</p><p className="mt-1 text-xl font-bold text-slate-900">{stats.averageFasting}{stats.averageFasting !== "—" ? " mg/dL" : ""}</p></div>
          <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Average post-meal glucose</p><p className="mt-1 text-xl font-bold text-slate-900">{stats.averagePostprandial}{stats.averagePostprandial !== "—" ? " mg/dL" : ""}</p></div>
        </section>

        <section className="px-7 py-5">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Blood glucose and HbA1c readings</h2>
              <p className="mt-1 text-xs text-slate-500">Values entered in the DiaCare reading log.</p>
            </div>
            <p className="text-xs text-slate-500">Glucose values in mg/dL</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead><tr className="border-y border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">Date</th>
                <th className="px-3 py-2.5 font-semibold">Fasting</th>
                <th className="px-3 py-2.5 font-semibold">Postprandial</th>
                <th className="px-3 py-2.5 font-semibold">HbA1c</th>
                <th className="px-3 py-2.5 font-semibold">Assessment band</th>
              </tr></thead>
              <tbody>
                {readings.map((reading) => {
                  const band = bandFor(Number(reading.hba1c));
                  return <tr key={reading.id} className="border-b border-slate-100 text-slate-700">
                    <td className="px-3 py-2.5">{reading.date}</td>
                    <td className="px-3 py-2.5">{reading.fasting ?? "—"}</td>
                    <td className="px-3 py-2.5">{reading.postprandial ?? "—"}</td>
                    <td className="px-3 py-2.5">{Number(reading.hba1c).toFixed(1)}%</td>
                    <td className="px-3 py-2.5">{band.label}</td>
                  </tr>;
                })}
                {!readings.length && <tr><td colSpan={5} className="px-3 py-5 text-center text-slate-500">No glucose readings are available for this report.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="border-t border-slate-200 px-7 py-5">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-slate-900">Meal insulin estimate history</h2>
            <p className="mt-1 text-xs text-slate-500">Recent meal estimates saved to this patient record; these are not confirmed administered doses.</p>
          </div>
          {historyError && <p role="status" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">{historyError}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[690px] text-left text-xs">
              <thead><tr className="border-y border-slate-200 bg-slate-50 text-slate-600">
                <th className="px-3 py-2.5 font-semibold">Date / time</th>
                <th className="px-3 py-2.5 font-semibold">Meal</th>
                <th className="px-3 py-2.5 font-semibold">Quantity</th>
                <th className="px-3 py-2.5 font-semibold">Meal time</th>
                <th className="px-3 py-2.5 font-semibold">Estimated carbs</th>
                <th className="px-3 py-2.5 font-semibold">Carb ratio</th>
                <th className="px-3 py-2.5 font-semibold">Estimated dose</th>
              </tr></thead>
              <tbody>
                {predictions.map((entry) => <tr key={entry.id || entry.created_at} className="border-b border-slate-100 text-slate-700">
                  <td className="whitespace-nowrap px-3 py-2.5">{formatDateTime(entry.created_at || entry.timestamp)}</td>
                  <td className="px-3 py-2.5">{entry.food_query || entry.meal_query}</td>
                  <td className="px-3 py-2.5">{entry.quantity ?? "—"}</td>
                  <td className="px-3 py-2.5">{entry.meal_time || "—"}</td>
                  <td className="px-3 py-2.5">{Number.isFinite(Number(entry.carbs_g)) ? `${Number(entry.carbs_g)} g` : "—"}</td>
                  <td className="px-3 py-2.5">{Number.isFinite(Number(entry.effective_icr)) ? `1 : ${entry.effective_icr} g/U` : "—"}</td>
                  <td className="px-3 py-2.5 font-semibold">{Number.isFinite(Number(entry.predicted_units)) ? `${Number(entry.predicted_units).toFixed(2)} U (estimate)` : "—"}</td>
                </tr>)}
                {!historyLoading && !predictions.length && <tr><td colSpan={7} className="px-3 py-5 text-center text-slate-500">No saved meal insulin estimates.</td></tr>}
                {historyLoading && <tr><td colSpan={7} className="px-3 py-5 text-center text-slate-500">Loading insulin history…</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="border-t border-slate-200 bg-slate-50 px-7 py-5">
          <p className="text-xs leading-relaxed text-slate-600">
            Clinical review notice: this report is generated from information entered into DiaCare. Glucose summaries and meal insulin estimates are informational only and are not a diagnosis, prescription, or record of insulin administration. The patient and treating clinician should verify all information and dosing decisions.
          </p>
          <div className="report-signatures mt-8 grid gap-8 sm:grid-cols-2">
            <div className="border-t border-slate-400 pt-2"><p className="text-xs font-medium text-slate-700">Patient / authorized representative</p><p className="mt-1 text-[11px] text-slate-500">Signature and date</p></div>
            <div className="border-t border-slate-400 pt-2"><p className="text-xs font-medium text-slate-700">Treating clinician</p><p className="mt-1 text-[11px] text-slate-500">Name, signature, and date</p></div>
          </div>
          <p className="mt-5 text-center text-[10px] text-slate-400">Confidential patient information · Generated by DiaCare</p>
        </footer>
      </article>

      <aside className="mt-4 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-blue-900 print:hidden">
        Status bands are descriptive summaries only. Review readings and treatment decisions with the patient's healthcare professional.
      </aside>
    </>
  );
}
