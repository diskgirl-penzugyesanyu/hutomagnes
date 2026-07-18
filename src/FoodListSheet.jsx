import React, { useState } from "react";
import { X, Copy, Check } from "lucide-react";
import { C } from "./shared.jsx";

export default function FoodListSheet({ names, rangeStart, rangeEnd, onClose }) {
  const [copied, setCopied] = useState(false);
  const rangeLabel = rangeStart === rangeEnd ? rangeStart : `${rangeStart} – ${rangeEnd}`;

  async function copyList() {
    const text = names.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 kn-sheet" style={{ background: C.bg, maxHeight: "85vh", overflowY: "auto" }}>
        <div className="flex justify-between items-center mb-1">
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>
            Kaja lista
          </span>
          <button onClick={onClose} style={{ color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>
        <div style={{ color: C.inkSoft, fontSize: 12.5, marginBottom: 14 }}>{rangeLabel}</div>

        {names.length === 0 && (
          <div style={{ color: C.inkSoft, fontSize: 13, marginBottom: 16 }}>
            Erre az időszakra nincs betervezve recept.
          </div>
        )}

        {names.length > 0 && (
          <div className="rounded-xl p-3 kn-card mb-4">
            <div className="flex flex-col gap-1.5">
              {names.map((n) => (
                <div key={n} style={{ color: C.ink, fontSize: 14.5 }}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        )}

        {names.length > 0 && (
          <button
            onClick={copyList}
            className="w-full rounded-xl py-3 kn-tap flex items-center justify-center gap-2"
            style={{ background: copied ? C.sageDeep : C.sage, color: "white", fontWeight: 600 }}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
            {copied ? "Vágólapra másolva" : "Másolás vágólapra"}
          </button>
        )}
      </div>
    </div>
  );
}
