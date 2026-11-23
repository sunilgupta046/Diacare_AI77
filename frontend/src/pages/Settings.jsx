import { useEffect, useState } from "react";
import { Target, Ruler, Bell, Moon, Share2, Save, CheckCircle2, Plus, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import Header from "../components/Header";
import { Field } from "../components/Shared";

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-label={label}
      aria-checked={checked}
      className={`relative h-7 w-[68px] shrink-0 rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-slate-200"}`}
    >
      <span className={`absolute top-1/2 -translate-y-1/2 text-[10px] font-bold ${checked ? "left-2 text-blue-100" : "right-2 text-slate-600"}`}>
        {checked ? "On" : "Off"}
      </span>
      <span
        className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-10" : "translate-x-0"}`}
      />
    </button>
  );
}

function Row({ icon: Icon, title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 border-b border-slate-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
          <Icon size={16} className="text-blue-600" />
        </div>
        <div>
          <div className="text-sm font-medium text-slate-800">{title}</div>
          {desc && <div className="text-xs text-slate-400 mt-0.5">{desc}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

function createShareToken() {
  const bytes = new Uint8Array(5);
  window.crypto.getRandomValues(bytes);
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `DCA-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

function isValidShareToken(token) {
  return /^DCA-[A-Z0-9]{5}$/.test(token);
}

// settings + updateSettings(newSettings) come from App.jsx shared state.
export default function Settings({ settings, updateSettings, profile }) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (form.shareWithDoctor && !isValidShareToken(form.shareToken)) {
      const shareToken = createShareToken();
      set({ shareToken });
      updateSettings({ ...settings, shareWithDoctor: true, shareToken });
    }
  }, [form.shareWithDoctor, form.shareToken, settings, updateSettings]);

  const handleSave = () => {
    updateSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleShareToggle = (enabled) => {
    const shareToken = enabled ? form.shareToken || createShareToken() : "";
    set({ shareWithDoctor: enabled, shareToken });
    updateSettings({ ...settings, shareWithDoctor: enabled, shareToken });
  };

  return (
    <>
      <Header title="Settings" subtitle="Set your goals, units, and reminder preferences." userName={profile.name} />

      <section className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm max-w-2xl">
        <Row icon={Target} title="HbA1c goal" desc="Used across Dashboard and Insights to judge how close you are to target.">
          <div className="flex items-center gap-3 w-48">
            <input
              type="range" min="5.5" max="9" step="0.1"
              value={form.hba1cGoal}
              onChange={(e) => set({ hba1cGoal: Number(e.target.value) })}
              className="w-full accent-blue-600"
            />
            <span className="text-sm font-semibold text-blue-600 w-12 text-right">{form.hba1cGoal.toFixed(1)}%</span>
          </div>
        </Row>

        <Row icon={Ruler} title="Blood sugar units" desc="Display unit used on the Dashboard form and stat cards.">
          <select
            value={form.units}
            onChange={(e) => set({ units: e.target.value })}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600"
          >
            <option>mg/dL</option>
            <option>mmol/L</option>
          </select>
        </Row>

        <Row icon={Bell} title="Daily reminders" desc="Get a reminder to log your reading.">
          <Switch label="Daily reminders" checked={form.reminders} onChange={(v) => set({ reminders: v })} />
        </Row>

        {form.reminders && (
          <Row icon={Bell} title="Reminder times" desc="Choose up to 6 times for daily reminders.">
            <div className="flex w-52 flex-col items-stretch gap-2">
              {form.reminderTimes.map((time, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`Reminder time ${index + 1}`}
                    value={time}
                    onChange={(e) => set({ reminderTimes: form.reminderTimes.map((currentTime, currentIndex) => currentIndex === index ? e.target.value : currentTime) })}
                    className="min-w-0 flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600"
                  />
                  {form.reminderTimes.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Remove reminder time ${index + 1}`}
                      title="Remove reminder time"
                      onClick={() => set({ reminderTimes: form.reminderTimes.filter((_, currentIndex) => currentIndex !== index) })}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
              {form.reminderTimes.length < 6 && (
                <button
                  type="button"
                  onClick={() => {
                    const suggestedTimes = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00"];
                    const nextTime = suggestedTimes.find((time) => !form.reminderTimes.includes(time)) || "09:00";
                    set({ reminderTimes: [...form.reminderTimes, nextTime] });
                  }}
                  className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  <Plus size={16} /> Add time
                </button>
              )}
            </div>
          </Row>
        )}

        <Row icon={Moon} title="Dark mode" desc="Apply a darker appearance across the app.">
          <Switch
            label="Dark mode"
            checked={form.darkMode}
            onChange={(v) => {
              set({ darkMode: v });
              updateSettings({ ...settings, darkMode: v });
            }}
          />
        </Row>

        <Row icon={Share2} title="Share reports with doctor" desc="Generate a share code and QR for your doctor.">
          <Switch label="Share reports with doctor" checked={form.shareWithDoctor} onChange={handleShareToggle} />
        </Row>

        {form.shareWithDoctor && form.shareToken && (
          <div className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-white p-5 text-center sm:flex-row sm:text-left">
            <div className="shrink-0 rounded-lg bg-white p-2">
              <QRCodeSVG value={form.shareToken} size={144} level="M" bgColor="#ffffff" fgColor="#0f172a" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-800">Doctor share code</div>
              <code className="mt-1 block break-all text-sm font-medium text-blue-700">{form.shareToken}</code>
              <p className="mt-2 text-xs text-slate-500">This demo generates a code and QR only; provider access is not connected.</p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl px-5 py-2.5 shadow-sm"
          >
            <Save size={16} /> Save Settings
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 size={16} /> Settings saved
            </span>
          )}
        </div>
      </section>
    </>
  );
}
