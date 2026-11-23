import { useState, useMemo } from "react";
import { Search, Trash2, ArrowUpDown, History as HistoryIcon } from "lucide-react";
import Header from "../components/Header";
import { bandFor } from "../data";

const STATUS_OPTIONS = ["All", "Normal", "Pre-Diabetes", "Fair Control", "Poor Control"];

// readings, removeReading(id), profile all come from App.jsx shared state.
export default function History({ readings, removeReading, profile }) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const filtered = useMemo(() => {
    let rows = readings.map((r) => ({ ...r, band: bandFor(r.hba1c) }));

    if (query.trim()) {
      rows = rows.filter((r) => r.date.toLowerCase().includes(query.trim().toLowerCase()));
    }
    if (statusFilter !== "All") {
      rows = rows.filter((r) => r.band.label === statusFilter);
    }
    rows.sort((a, b) => {
      let av = a[sortKey], bv = b[sortKey];
      if (sortKey === "date") { av = a.id; bv = b.id; } // id order == chronological order
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [readings, query, statusFilter, sortKey, sortDir]);

  const SortHeader = ({ label, sortField }) => (
    <th
      className="text-left font-medium py-2.5 cursor-pointer select-none hover:text-slate-600"
      onClick={() => toggleSort(sortField)}
    >
      <span className="flex items-center gap-1">
        {label} <ArrowUpDown size={11} className={sortKey === sortField ? "text-blue-600" : "text-slate-300"} />
      </span>
    </th>
  );

  return (
    <>
      <Header title="History" subtitle="Every reading you've logged, searchable and sortable." userName={profile.name} />

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <HistoryIcon size={18} className="text-blue-600" />
          </div>
          <div className="font-semibold text-slate-900 text-sm">Reading History ({filtered.length})</div>
        </div>

        <div className="flex flex-wrap gap-3 mb-4">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
            <Search size={14} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by date (e.g. May 2025)"
              className="bg-transparent outline-none text-sm w-full text-slate-700 placeholder:text-slate-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600 bg-white"
          >
            {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100">
                <SortHeader label="Date" sortField="date" />
                <SortHeader label="Fasting (mg/dL)" sortField="fasting" />
                <SortHeader label="Postprandial (mg/dL)" sortField="postprandial" />
                <SortHeader label="HbA1c (%)" sortField="hba1c" />
                <th className="text-left font-medium py-2.5">Status</th>
                <th className="text-left font-medium py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center text-slate-400 py-8">No readings match your filters.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                  <td className="py-2.5 text-slate-600">{r.date}</td>
                  <td className="py-2.5 text-slate-600">{r.fasting}</td>
                  <td className="py-2.5 text-slate-600">{r.postprandial}</td>
                  <td className="py-2.5 text-slate-600">{r.hba1c.toFixed(1)}</td>
                  <td className="py-2.5"><span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${r.band.chip}`}>{r.band.label}</span></td>
                  <td className="py-2.5">
                    <button
                      onClick={() => removeReading(r.id)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      title="Delete this reading"
                    >
                      <Trash2 size={14} />
                    </button>
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
