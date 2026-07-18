// Közös design-tokenek és UI-atomok — a Kalórianapló app mintájára,
// hogy a két testvérapp egységes vizuális nyelvet használjon.

import { useState } from "react";

export const C = {
  bg: "#1B1230",
  card: "rgba(255,255,255,0.06)",
  cardAlt: "rgba(255,255,255,0.10)",
  ink: "#F5F1FF",
  inkSoft: "#B6A8DB",
  sage: "#9B6BFF",
  sageDeep: "#7C3AED",
  sageBg: "rgba(155,107,255,0.18)",
  coral: "#FF5FA2",
  coralBg: "rgba(255,95,162,0.18)",
  amber: "#FFB648",
  amberBg: "rgba(255,182,72,0.18)",
  border: "rgba(255,255,255,0.12)",
};

export function Field({ label, value, onChange, placeholder }) {
  return (
    <div className="mb-3">
      <label style={{ color: C.inkSoft, fontSize: 12 }}>{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2 mt-1"
        style={{ border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 15 }}
      />
    </div>
  );
}

export function NumField({ label, value, onChange, placeholder }) {
  return (
    <div className="mb-3">
      <label style={{ color: C.inkSoft, fontSize: 12 }}>{label}</label>
      <input
        type="number"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2 mt-1"
        style={{ border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 15 }}
      />
    </div>
  );
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div className="mb-3">
      <label style={{ color: C.inkSoft, fontSize: 12 }}>{label}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2 mt-1"
        style={{ border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 15, resize: "vertical" }}
      />
    </div>
  );
}

export function SelectField({ label, value, onChange, options }) {
  return (
    <div className="mb-3">
      <label style={{ color: C.inkSoft, fontSize: 12 }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl px-3 py-2 mt-1"
        style={{ border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 15 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: "#111" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Szabad szöveges mező, ami a "suggestions" listából felkínálja a hozzá
// hasonló, korábban már használt értékeket -- a felhasználó mindig maga írja
// be/választja ki, semmi nem kerül automatikusan kitöltésre.
export function CategoryField({ label, value, onChange, suggestions, placeholder }) {
  const [open, setOpen] = useState(false);
  const filtered = (suggestions || []).filter((s) => {
    const v = (value || "").trim().toLowerCase();
    return s.toLowerCase() !== v && (!v || s.toLowerCase().includes(v));
  });

  return (
    <div className="mb-3" style={{ position: "relative" }}>
      <label style={{ color: C.inkSoft, fontSize: 12 }}>{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-xl px-3 py-2 mt-1"
        style={{ border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 15 }}
      />
      {open && filtered.length > 0 && (
        <div
          className="kn-card rounded-xl mt-1"
          style={{ position: "absolute", left: 0, right: 0, zIndex: 20, maxHeight: 160, overflowY: "auto" }}
        >
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={() => {
                onChange(s);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 kn-tap"
              style={{ color: C.ink, fontSize: 14 }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-8" style={{ paddingTop: 64, paddingBottom: 64 }}>
      {icon}
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: C.ink, marginTop: 14 }}>
        {title}
      </div>
      {subtitle && (
        <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{subtitle}</div>
      )}
    </div>
  );
}

export function FadeIn({ keyProp, children }) {
  return (
    <div key={keyProp} className="kn-fade">
      {children}
    </div>
  );
}

export function ConfirmDeleteModal({ title, message, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 px-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="w-full max-w-xs rounded-2xl p-5 kn-sheet" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: C.ink, marginBottom: 8 }}>
          {title || "Biztosan törlöd?"}
        </div>
        <div style={{ color: C.inkSoft, fontSize: 14, marginBottom: 18, lineHeight: 1.5 }}>{message}</div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 kn-tap"
            style={{ background: C.cardAlt, color: C.ink, fontWeight: 600 }}
          >
            Mégse
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl py-2.5 kn-tap"
            style={{ background: C.coral, color: "white", fontWeight: 600 }}
          >
            Törlés
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Dátum-segédfüggvények (a naptár/menütervező fázisban bővül) ---

export function pad(n) {
  return String(n).padStart(2, "0");
}

export function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDs(ds) {
  const [y, m, d] = ds.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(ds, n) {
  const d = parseDs(ds);
  d.setDate(d.getDate() + n);
  return dateStr(d);
}

export function todayStr() {
  return dateStr(new Date());
}
