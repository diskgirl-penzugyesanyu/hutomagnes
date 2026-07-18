import React, { useState } from "react";
import { X, Pencil, Trash2, Check } from "lucide-react";
import { C, ConfirmDeleteModal } from "./shared.jsx";
import { getAllCategories } from "./recipes.js";

export default function CategoryManagerSheet({ recipes, onRename, onClear, onClose }) {
  const categories = getAllCategories(recipes);
  const counts = {};
  for (const r of Object.values(recipes)) {
    const c = (r.category || "").trim();
    if (c) counts[c] = (counts[c] || 0) + 1;
  }

  const [editingName, setEditingName] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [clearingName, setClearingName] = useState(null);

  function startEdit(name) {
    setEditingName(name);
    setDraftName(name);
  }

  function saveEdit() {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== editingName) onRename(editingName, trimmed);
    setEditingName(null);
  }

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
            Kategóriák kezelése
          </span>
          <button onClick={onClose} style={{ color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>

        <div className="px-5 pb-8" style={{ overflowY: "auto", flex: 1, minHeight: 0 }}>
          {categories.length === 0 && (
            <div style={{ color: C.inkSoft, fontSize: 13 }}>Még nincs egyetlen kategória sem megadva.</div>
          )}
          <div className="flex flex-col gap-2">
            {categories.map((name) => (
              <div key={name} className="rounded-xl p-3 kn-card flex items-center gap-2">
                {editingName === name ? (
                  <>
                    <input
                      autoFocus
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      className="flex-1 min-w-0 rounded-lg px-2 py-1.5"
                      style={{ border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 14 }}
                    />
                    <button onClick={saveEdit} className="kn-tap" style={{ color: C.sage }} aria-label="Mentés">
                      <Check size={18} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0" style={{ color: C.ink, fontSize: 14 }}>
                      {name}
                      <span style={{ color: C.inkSoft, fontSize: 12 }}> · {counts[name]} recept</span>
                    </div>
                    <button onClick={() => startEdit(name)} className="kn-tap" style={{ color: C.inkSoft }} aria-label="Átnevezés">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => setClearingName(name)} className="kn-tap" style={{ color: C.coral }} aria-label="Törlés">
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {clearingName && (
        <ConfirmDeleteModal
          title="Kategória eltávolítása"
          message={`A(z) "${clearingName}" kategória eltűnik mind a(z) ${counts[clearingName]} érintett receptről (a receptek maguk megmaradnak).`}
          onCancel={() => setClearingName(null)}
          onConfirm={() => {
            onClear(clearingName);
            setClearingName(null);
          }}
        />
      )}
    </div>
  );
}
