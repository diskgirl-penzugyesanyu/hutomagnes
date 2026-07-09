import React, { useState } from "react";
import { Trash2, Plus, Send, RotateCcw } from "lucide-react";
import { C, EmptyState, NumField, Field, SelectField } from "./shared.jsx";
import { UNITS, unitLabel, emptyIngredient } from "./recipes.js";

export default function ShoppingListView({ shoppingList, onUpdateAmount, onDeleteLine, onAddAdhoc, onSend, onReopen }) {
  const [addingOpen, setAddingOpen] = useState(false);
  const [draft, setDraft] = useState(emptyIngredient());

  const all = Object.values(shoppingList);
  const pending = all.filter((l) => l.status === "pending").sort((a, b) => a.name.localeCompare(b.name, "hu"));
  const sent = all.filter((l) => l.status === "sent").sort((a, b) => a.name.localeCompare(b.name, "hu"));

  function submitAdhoc() {
    if (!draft.name.trim()) return;
    onAddAdhoc(draft);
    setDraft(emptyIngredient());
    setAddingOpen(false);
  }

  return (
    <div className="px-5">
      {all.length === 0 ? (
        <EmptyState
          icon={<Send size={40} color={C.sage} />}
          title="Még üres a bevásárlólista"
          subtitle="A naptárban jelölj ki egy napot vagy tartományt, és vezesd át a hozzávalókat, vagy adj hozzá kézzel egy tételt."
        />
      ) : (
        <>
          <div style={{ color: C.inkSoft, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>
            Bevásárlandó ({pending.length})
          </div>
          {pending.length === 0 && (
            <div style={{ color: C.inkSoft, fontSize: 13, marginBottom: 12 }}>Nincs bevásárlandó tétel.</div>
          )}
          <div className="flex flex-col gap-2 mb-3">
            {pending.map((line) => (
              <div key={line.id} className="rounded-xl p-3 kn-card flex items-center gap-3">
                <div className="flex-1 min-w-0" style={{ color: C.ink, fontSize: 14 }}>
                  {line.name}
                </div>
                <input
                  type="number"
                  value={line.amount}
                  onChange={(e) => onUpdateAmount(line.id, e.target.value)}
                  className="rounded-lg px-2 py-1.5 text-right"
                  style={{ width: 60, border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 13 }}
                />
                <span style={{ color: C.inkSoft, fontSize: 12, width: 36 }}>
                  {line.unit === "db" || !line.unit ? "db" : unitLabel(line.unit)}
                </span>
                <button onClick={() => onDeleteLine(line.id)} className="kn-tap" style={{ color: C.coral }}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {addingOpen ? (
        <div className="rounded-xl p-3 kn-card mb-3">
          <Field label="Tétel neve" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} placeholder="pl. mosogatószer" />
          <div className="flex gap-2">
            <div style={{ width: 90 }}>
              <NumField label="Mennyiség" value={draft.amount} onChange={(v) => setDraft((d) => ({ ...d, amount: v }))} />
            </div>
            <div className="flex-1">
              <SelectField label="Egység" value={draft.unit} onChange={(v) => setDraft((d) => ({ ...d, unit: v }))} options={UNITS} />
            </div>
          </div>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setAddingOpen(false)} className="flex-1 rounded-xl py-2 kn-tap" style={{ background: C.cardAlt, color: C.inkSoft, fontWeight: 600 }}>
              Mégse
            </button>
            <button onClick={submitAdhoc} className="flex-1 rounded-xl py-2 kn-tap" style={{ background: C.sage, color: "white", fontWeight: 600 }}>
              Hozzáadás
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingOpen(true)}
          className="w-full rounded-xl py-2.5 kn-tap flex items-center justify-center gap-2 mb-3"
          style={{ background: C.cardAlt, color: C.ink, fontWeight: 600 }}
        >
          <Plus size={16} /> Tétel hozzáadása kézzel
        </button>
      )}

      {pending.length > 0 && (
        <button
          onClick={() => onSend(pending.map((l) => l.id))}
          className="w-full rounded-xl py-3 kn-tap flex items-center justify-center gap-2 mb-6"
          style={{ background: C.coral, color: "white", fontWeight: 600 }}
        >
          <Send size={17} /> Küldés az OurGroceries-be
        </button>
      )}

      {sent.length > 0 && (
        <>
          <div style={{ color: C.inkSoft, fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>
            Elküldve ({sent.length})
          </div>
          <div className="flex flex-col gap-2 mb-4">
            {sent.map((line) => (
              <div key={line.id} className="rounded-xl p-3 flex items-center gap-3" style={{ opacity: 0.6 }}>
                <div className="flex-1 min-w-0" style={{ color: C.ink, fontSize: 13 }}>
                  {line.amount} {line.unit === "db" || !line.unit ? "" : unitLabel(line.unit)} {line.name}
                </div>
                <button
                  onClick={() => onReopen(line.id)}
                  className="kn-tap flex items-center gap-1"
                  style={{ color: C.sage, fontSize: 11 }}
                >
                  <RotateCcw size={13} /> Vissza a listára
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
