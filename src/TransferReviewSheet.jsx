import React, { useState } from "react";
import { X, ShoppingCart } from "lucide-react";
import { C } from "./shared.jsx";
import { unitLabel } from "./recipes.js";

export default function TransferReviewSheet({ lines, rangeLabel, onCancel, onConfirm }) {
  const [rows, setRows] = useState(lines.map((l) => ({ ...l })));

  function toggle(key) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, checked: !r.checked } : r)));
  }

  function setAmount(key, value) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, amount: value } : r)));
  }

  function scaleAll(factor) {
    setRows((rs) => rs.map((r) => ({ ...r, amount: Math.round((Number(r.amount) || 0) * factor * 100) / 100 })));
  }

  const checkedCount = rows.filter((r) => r.checked).length;

  function handleConfirm() {
    const confirmed = rows
      .filter((r) => r.checked && Number(r.amount) > 0)
      .map((r) => ({ ...r, amount: Number(r.amount) }));
    onConfirm(confirmed);
  }

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl kn-sheet flex flex-col"
        style={{ background: C.bg, maxHeight: "88vh" }}
      >
        <div className="px-5 pt-5" style={{ flexShrink: 0 }}>
          <div className="flex justify-between items-center mb-1">
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: C.ink }}>
              Ellenőrzés átvezetés előtt
            </span>
            <button onClick={onCancel} style={{ color: C.inkSoft }}>
              <X size={22} />
            </button>
          </div>
          <div style={{ color: C.inkSoft, fontSize: 12.5, marginBottom: 10 }}>
            {rangeLabel} · vedd ki a pipát, ami már megvan itthon, a mennyiséget pedig csökkentheted, ha van otthon egy kicsi.
          </div>
        </div>

        <div className="px-5 pb-8" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
        {rows.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: C.inkSoft, fontSize: 11.5 }}>Mind szorzása:</span>
            {[2, 3, 4].map((f) => (
              <button
                key={f}
                onClick={() => scaleAll(f)}
                className="rounded-full px-3 py-1 kn-tap"
                style={{ background: C.cardAlt, color: C.ink, fontSize: 12, fontWeight: 600 }}
              >
                ×{f}
              </button>
            ))}
          </div>
        )}

        {rows.length === 0 && (
          <div style={{ color: C.inkSoft, fontSize: 13, marginBottom: 16 }}>
            Nincs hozzávaló ebben az időszakban betervezett receptekből.
          </div>
        )}

        <div className="flex flex-col gap-2 mb-5">
          {rows.map((r) => (
            <div key={r.key} className="rounded-xl p-3 kn-card flex items-center gap-3">
              <input
                type="checkbox"
                checked={r.checked}
                onChange={() => toggle(r.key)}
                style={{ width: 20, height: 20, accentColor: C.sage, flexShrink: 0 }}
              />
              <div className="flex-1 min-w-0" style={{ opacity: r.checked ? 1 : 0.45 }}>
                <div style={{ color: C.ink, fontSize: 14 }}>{r.name}</div>
              </div>
              <input
                type="number"
                value={r.amount}
                onChange={(e) => setAmount(r.key, e.target.value)}
                disabled={!r.checked}
                className="rounded-lg px-2 py-1.5 text-right"
                style={{ width: 64, border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 14 }}
              />
              <span style={{ color: C.inkSoft, fontSize: 12, width: 40 }}>
                {r.unit === "db" || !r.unit ? "" : unitLabel(r.unit)}
              </span>
            </div>
          ))}
        </div>
        </div>

        <div className="px-5 pt-3 pb-8" style={{ flexShrink: 0 }}>
          <button
            onClick={handleConfirm}
            disabled={checkedCount === 0}
            className="w-full rounded-xl py-3 kn-tap flex items-center justify-center gap-2"
            style={{
              background: checkedCount === 0 ? C.cardAlt : C.sage,
              color: checkedCount === 0 ? C.inkSoft : "white",
              fontWeight: 600,
            }}
          >
            <ShoppingCart size={17} />
            {checkedCount} tétel hozzáadása a listához
          </button>
        </div>
      </div>
    </div>
  );
}
