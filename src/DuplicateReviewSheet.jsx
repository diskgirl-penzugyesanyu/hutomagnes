import React, { useState } from "react";
import { X, Wand2 } from "lucide-react";
import { C, Field } from "./shared.jsx";
import { formatLineAmount, pickCanonicalName } from "./shoppingList.js";

export default function DuplicateReviewSheet({ groups, shoppingList, onMerge, onDismiss, onClose }) {
  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl kn-sheet flex flex-col"
        style={{ background: C.bg, maxHeight: "85vh" }}
      >
        <div className="flex justify-between items-center px-5 pt-5 pb-4" style={{ flexShrink: 0 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>
            Esetleg ugyanaz?
          </span>
          <button onClick={onClose} style={{ color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>

        <div className="px-5 pb-8" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {groups.length === 0 && (
            <div style={{ color: C.inkSoft, fontSize: 13, marginBottom: 16 }}>
              Nem találtunk hasonló nevű, valószínűleg ugyanazt jelentő tételeket.
            </div>
          )}
          <div className="flex flex-col gap-3">
            {groups.map((group, idx) => (
              <DuplicateGroupCard
                key={group.names.join("|")}
                group={group}
                shoppingList={shoppingList}
                onMerge={(canonicalName) => onMerge(idx, canonicalName)}
                onDismiss={() => onDismiss(idx)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DuplicateGroupCard({ group, shoppingList, onMerge, onDismiss }) {
  const [canonicalName, setCanonicalName] = useState(pickCanonicalName(group.names));

  return (
    <div className="rounded-xl p-3 kn-card">
      <div className="flex items-center gap-2 mb-2" style={{ color: C.amber }}>
        <Wand2 size={15} />
        <span style={{ fontSize: 12, fontWeight: 600 }}>Ezek talán ugyanaz</span>
      </div>
      <div className="flex flex-col gap-1 mb-3">
        {group.lineIds.map((id) => {
          const line = shoppingList[id];
          if (!line) return null;
          return (
            <div key={id} style={{ color: C.inkSoft, fontSize: 13 }}>
              {line.name} <span style={{ color: C.ink }}>· {formatLineAmount(line)}</span>
            </div>
          );
        })}
      </div>
      <Field label="Egyesített név" value={canonicalName} onChange={setCanonicalName} />
      <div className="flex gap-2 mt-1">
        <button
          onClick={onDismiss}
          className="flex-1 rounded-xl py-2 kn-tap"
          style={{ background: C.cardAlt, color: C.inkSoft, fontWeight: 600, fontSize: 13 }}
        >
          Nem, különbözőek
        </button>
        <button
          onClick={() => onMerge(canonicalName)}
          className="flex-1 rounded-xl py-2 kn-tap"
          style={{ background: C.sage, color: "white", fontWeight: 600, fontSize: 13 }}
        >
          Egyesítés
        </button>
      </div>
    </div>
  );
}
