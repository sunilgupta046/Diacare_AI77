import { useState } from "react";
import { User, Phone, Mail, HeartPulse, Calendar, Weight, Ruler, Save, CheckCircle2 } from "lucide-react";
import Header from "../components/Header";
import { Field } from "../components/Shared";

// profile + updateProfile(newProfile) come from App.jsx shared state.
export default function Profile({ profile, updateProfile }) {
  const [form, setForm] = useState(profile);
  const [saved, setSaved] = useState(false);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, [field]: ["age", "weight", "height"].includes(field) ? Number(value) : value }));
  };

  const handleSave = () => {
    updateProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <Header title="Profile" subtitle="Keep your personal and contact details up to date." userName={profile.name} />

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
            {form.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="font-semibold text-slate-900">{form.name}</div>
            <div className="text-xs text-slate-400">Diagnosed {new Date(form.diagnosedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full Name" icon={User}>
            <input value={form.name} onChange={handleChange("name")} className="input" />
          </Field>
          <Field label="Age (Years)" icon={Calendar}>
            <input type="number" value={form.age} onChange={handleChange("age")} className="input" />
          </Field>
          <Field label="Gender" icon={User}>
            <select value={form.gender} onChange={handleChange("gender")} className="input">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Diagnosed On" icon={HeartPulse}>
            <input type="date" value={form.diagnosedDate} onChange={handleChange("diagnosedDate")} className="input" />
          </Field>
          <Field label="Phone Number" icon={Phone}>
            <input value={form.phone} onChange={handleChange("phone")} className="input" />
          </Field>
          <Field label="Email" icon={Mail}>
            <input type="email" value={form.email} onChange={handleChange("email")} className="input" />
          </Field>
          <Field label="Emergency Contact" icon={Phone}>
            <input value={form.emergencyContact} onChange={handleChange("emergencyContact")} className="input" />
          </Field>
          <Field label="Weight (kg)" icon={Weight}>
            <input type="number" value={form.weight} onChange={handleChange("weight")} className="input" />
          </Field>
          <Field label="Height (cm)" icon={Ruler}>
            <input type="number" value={form.height} onChange={handleChange("height")} className="input" />
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl px-5 py-2.5 shadow-sm"
          >
            <Save size={15} /> Save Changes
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 size={15} /> Profile updated
            </span>
          )}
        </div>
      </section>
    </>
  );
}
