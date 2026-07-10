import React, { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { C, Field, NumField, SelectField, TextAreaField } from "./shared.jsx";
import { UNITS, emptyIngredient, validateRecipe } from "./recipes.js";

export default function RecipeForm({ recipe, onClose, onSave, onDelete }) {
  const isEdit = !!recipe.name;
  const [draft, setDraft] = useState(recipe);
  const [error, setError] = useState("");
  const [hasMacros, setHasMacros] = useState(!!recipe.macros);
  const [macros, setMacros] = useState(recipe.macros || { calories: "", protein_g: "", fat_g: "", fiber_g: "" });

  function setField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function setIngredient(idx, key, value) {
    setDraft((d) => {
      const ingredients = d.ingredients.slice();
      ingredients[idx] = { ...ingredients[idx], [key]: value };
      return { ...d, ingredients };
    });
  }

  function scaleBy(factor) {
    setDraft((d) => ({
      ...d,
      baseServings: Math.round((Number(d.baseServings) || 1) * factor * 10) / 10,
      ingredients: d.ingredients.map((i) => ({
        ...i,
        amount: Math.round((Number(i.amount) || 0) * factor * 100) / 100,
      })),
    }));
  }

  function addIngredientRow() {
    setDraft((d) => ({ ...d, ingredients: [...d.ingredients, emptyIngredient()] }));
  }

  function removeIngredientRow(idx) {
    setDraft((d) => ({ ...d, ingredients: d.ingredients.filter((_, i) => i !== idx) }));
  }

  function handleSave() {
    const clean = {
      ...draft,
      baseServings: Number(draft.baseServings) || 1,
      ingredients: draft.ingredients
        .filter((i) => i.name && i.name.trim())
        .map((i) => ({ name: i.name.trim(), amount: Number(i.amount) || 1, unit: i.unit || "db" })),
      macros: hasMacros
        ? {
            calories: Number(macros.calories) || 0,
            protein_g: Number(macros.protein_g) || 0,
            fat_g: Number(macros.fat_g) || 0,
            fiber_g: Number(macros.fiber_g) || 0,
          }
        : null,
      updatedAt: new Date().toISOString(),
    };
    const err = validateRecipe(clean);
    if (err) {
      setError(err);
      return;
    }
    onSave(clean);
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
        className="w-full max-w-md rounded-t-3xl p-5 pb-8 kn-sheet"
        style={{ background: C.bg, maxHeight: "88vh", overflowY: "auto" }}
      >
        <div className="flex justify-between items-center mb-4">
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: C.ink }}>
            {isEdit ? "Recept szerkesztése" : "Új recept"}
          </span>
          <div className="flex items-center gap-3">
            {isEdit && onDelete && (
              <button onClick={onDelete} className="kn-tap" style={{ color: C.coral }} aria-label="Recept törlése">
                <Trash2 size={20} />
              </button>
            )}
            <button onClick={onClose} style={{ color: C.inkSoft }} aria-label="Bezárás">
              <X size={22} />
            </button>
          </div>
        </div>

        {recipe._warning && (
          <div className="rounded-xl p-3 mb-3" style={{ background: C.amberBg, color: C.amber, fontSize: 12.5, lineHeight: 1.5 }}>
            {recipe._warning}
          </div>
        )}

        <Field label="Recept neve" value={draft.name} onChange={(v) => setField("name", v)} placeholder="pl. Rakott karfiol" />
        <NumField label="Alap adagszám" value={draft.baseServings} onChange={(v) => setField("baseServings", v)} placeholder="4" />
        <div className="flex items-center gap-2 mb-3" style={{ marginTop: -6 }}>
          <span style={{ color: C.inkSoft, fontSize: 11.5 }}>Szorzás:</span>
          {[2, 3, 4].map((f) => (
            <button
              key={f}
              onClick={() => scaleBy(f)}
              className="rounded-full px-3 py-1 kn-tap"
              style={{ background: C.cardAlt, color: C.ink, fontSize: 12, fontWeight: 600 }}
            >
              ×{f}
            </button>
          ))}
        </div>

        <div style={{ color: C.inkSoft, fontSize: 12, marginTop: 8, marginBottom: 6 }}>Hozzávalók</div>
        <div className="flex flex-col gap-2 mb-2">
          {draft.ingredients.map((ing, idx) => (
            <div key={idx} className="rounded-xl p-3 kn-card">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Field label="Név" value={ing.name} onChange={(v) => setIngredient(idx, "name", v)} placeholder="pl. csirkemell" />
                </div>
                <button onClick={() => removeIngredientRow(idx)} className="kn-tap mb-3" style={{ color: C.coral }}>
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex gap-2">
                <div style={{ width: 90 }}>
                  <NumField label="Mennyiség" value={ing.amount} onChange={(v) => setIngredient(idx, "amount", v)} />
                </div>
                <div className="flex-1">
                  <SelectField label="Egység" value={ing.unit} onChange={(v) => setIngredient(idx, "unit", v)} options={UNITS} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addIngredientRow}
          className="w-full rounded-xl py-2.5 kn-tap flex items-center justify-center gap-2 mb-4"
          style={{ background: C.cardAlt, color: C.ink, fontWeight: 600 }}
        >
          <Plus size={16} /> Hozzávaló hozzáadása
        </button>

        <label className="flex items-center gap-2 mb-3 kn-tap" style={{ cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={hasMacros}
            onChange={(e) => setHasMacros(e.target.checked)}
            style={{ width: 18, height: 18, accentColor: C.sage }}
          />
          <span style={{ color: C.inkSoft, fontSize: 13 }}>Ismerem a makrókat ehhez a recepthez (a teljes alap adagszámra)</span>
        </label>

        {hasMacros && (
          <div className="rounded-xl p-3 kn-card mb-4">
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <NumField label="Kalória (kcal)" value={macros.calories} onChange={(v) => setMacros((m) => ({ ...m, calories: v }))} />
              </div>
              <div className="flex-1">
                <NumField label="Fehérje (g)" value={macros.protein_g} onChange={(v) => setMacros((m) => ({ ...m, protein_g: v }))} />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <NumField label="Zsír (g)" value={macros.fat_g} onChange={(v) => setMacros((m) => ({ ...m, fat_g: v }))} />
              </div>
              <div className="flex-1">
                <NumField label="Rost (g)" value={macros.fiber_g} onChange={(v) => setMacros((m) => ({ ...m, fiber_g: v }))} />
              </div>
            </div>
            <div style={{ color: C.inkSoft, fontSize: 11, marginTop: 6 }}>
              A Kalórianaplóba küldéskor ezekből az értékekből automatikusan átskálázza az aznapi adagszámra, és nem hívja meg az AI-becslést.
            </div>
          </div>
        )}

        <TextAreaField label="Elkészítés" value={draft.instructions} onChange={(v) => setField("instructions", v)} placeholder="Lépésről lépésre..." />

        {error && <div style={{ color: C.coral, fontSize: 13, marginBottom: 10 }}>{error}</div>}

        <button
          onClick={handleSave}
          className="w-full rounded-xl py-3 kn-tap"
          style={{ background: C.sage, color: "white", fontWeight: 600 }}
        >
          Mentés
        </button>
      </div>
    </div>
  );
}
