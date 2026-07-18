import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, ShoppingCart, Search, Utensils, ClipboardList } from "lucide-react";
import { C, NumField, Field } from "./shared.jsx";
import { dateStr, todayStr } from "./shared.jsx";
import { openInKalorianaplo } from "./kalorianaploBridge.js";
import { getAllCategories } from "./recipes.js";
import FoodListSheet from "./FoodListSheet.jsx";
import {
  HU_WEEKDAYS,
  monthLabel,
  addMonths,
  getMonthGrid,
  getEntriesCoveringDay,
  findOverlappingEntries,
  daysBetweenInclusive,
  getDistinctRecipeNamesInRange,
  newEntryId,
} from "./mealPlanCalendar.js";

const DURATIONS = [1, 2, 3];

export default function CalendarView({ recipes, mealPlan, onSaveEntry, onDeleteEntry, onTransferRange }) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const [rangeMode, setRangeMode] = useState(false);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [foodListRange, setFoodListRange] = useState(null);

  const grid = useMemo(() => getMonthGrid(year, month), [year, month]);

  function goMonth(delta) {
    const { year: y, month: m } = addMonths(year, month, delta);
    setYear(y);
    setMonth(m);
  }

  function handleDayTap(ds) {
    if (rangeMode) {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(ds);
        setRangeEnd(null);
      } else {
        if (ds < rangeStart) {
          setRangeEnd(rangeStart);
          setRangeStart(ds);
        } else {
          setRangeEnd(ds);
        }
      }
      return;
    }
    setSelectedDay(ds);
  }

  function exitRangeMode() {
    setRangeMode(false);
    setRangeStart(null);
    setRangeEnd(null);
  }

  const inSelectedRange = (ds) => rangeMode && rangeStart && ds >= rangeStart && ds <= (rangeEnd || rangeStart);

  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => goMonth(-1)} className="kn-tap p-1" style={{ color: C.inkSoft }}>
          <ChevronLeft size={22} />
        </button>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 16, color: C.ink }}>
          {monthLabel(year, month)}
        </div>
        <button onClick={() => goMonth(1)} className="kn-tap p-1" style={{ color: C.inkSoft }}>
          <ChevronRight size={22} />
        </button>
      </div>

      <div className="flex justify-end mb-2">
        <button
          onClick={() => (rangeMode ? exitRangeMode() : setRangeMode(true))}
          className="rounded-full px-3 py-1.5 kn-tap text-xs font-semibold"
          style={{
            background: rangeMode ? C.sage : C.cardAlt,
            color: rangeMode ? "white" : C.inkSoft,
          }}
        >
          {rangeMode ? "Kijelölés kész" : "Tartomány kijelölése"}
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {HU_WEEKDAYS.map((w) => (
          <div key={w} className="text-center" style={{ color: C.inkSoft, fontSize: 11, fontWeight: 600 }}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell) => {
          const entries = getEntriesCoveringDay(mealPlan, cell.ds);
          const selected = inSelectedRange(cell.ds);
          return (
            <button
              key={cell.ds}
              data-ds={cell.ds}
              onClick={() => handleDayTap(cell.ds)}
              className="kn-tap rounded-lg flex flex-col items-center justify-start"
              style={{
                aspectRatio: "1 / 1",
                background: selected ? C.sageBg : C.cardAlt,
                border: cell.isToday ? `1.5px solid ${C.sage}` : "1px solid transparent",
                opacity: cell.inMonth ? 1 : 0.35,
                paddingTop: 4,
              }}
            >
              <span style={{ fontSize: 12, color: C.ink, fontWeight: cell.isToday ? 700 : 400 }}>
                {cell.date.getDate()}
              </span>
              <div className="flex gap-0.5 mt-1">
                {entries.slice(0, 3).map((e) => (
                  <span key={e.id} style={{ width: 4, height: 4, borderRadius: 999, background: C.sage, display: "block" }} />
                ))}
                {entries.length > 3 && <span style={{ fontSize: 8, color: C.inkSoft }}>+{entries.length - 3}</span>}
              </div>
            </button>
          );
        })}
      </div>

      {rangeMode && rangeStart && (
        <div
          className="fixed left-0 right-0 flex flex-col items-center gap-2 z-40"
          style={{ bottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
        >
          <button
            onClick={() => {
              if (onTransferRange) onTransferRange(rangeStart, rangeEnd || rangeStart);
              exitRangeMode();
            }}
            className="rounded-full px-5 py-3 kn-tap flex items-center gap-2"
            style={{ background: C.coral, color: "white", fontWeight: 600, boxShadow: "0 8px 24px rgba(255,95,162,0.45)" }}
          >
            <ShoppingCart size={18} />
            Hozzáadás a bevásárlólistához ({daysBetweenInclusive(rangeStart, rangeEnd || rangeStart)} nap)
          </button>
          <button
            onClick={() => {
              setFoodListRange({ start: rangeStart, end: rangeEnd || rangeStart });
              exitRangeMode();
            }}
            className="rounded-full px-5 py-3 kn-tap flex items-center gap-2"
            style={{ background: C.sage, color: "white", fontWeight: 600, boxShadow: "0 8px 24px rgba(155,107,255,0.45)" }}
          >
            <ClipboardList size={18} />
            Kaja lista ({daysBetweenInclusive(rangeStart, rangeEnd || rangeStart)} nap)
          </button>
        </div>
      )}

      {selectedDay && (
        <DayDetailSheet
          ds={selectedDay}
          recipes={recipes}
          entries={getEntriesCoveringDay(mealPlan, selectedDay)}
          onClose={() => setSelectedDay(null)}
          onAddNew={() => {
            setEditingEntry(null);
            setPickerOpen(true);
          }}
          onEditEntry={(entry) => {
            setEditingEntry(entry);
            setPickerOpen(true);
          }}
          onDeleteEntry={onDeleteEntry}
          onTransferDay={() => onTransferRange && onTransferRange(selectedDay, selectedDay)}
        />
      )}

      {pickerOpen && (
        <RecipePickerSheet
          recipes={recipes}
          mealPlan={mealPlan}
          startDate={selectedDay}
          existingEntry={editingEntry}
          onClose={() => setPickerOpen(false)}
          onSave={(entry) => {
            onSaveEntry(entry);
            setPickerOpen(false);
          }}
        />
      )}

      {foodListRange && (
        <FoodListSheet
          names={getDistinctRecipeNamesInRange(mealPlan, recipes, foodListRange.start, foodListRange.end)}
          rangeStart={foodListRange.start}
          rangeEnd={foodListRange.end}
          onClose={() => setFoodListRange(null)}
        />
      )}
    </div>
  );
}

function dayIndexLabel(entry, ds) {
  const start = entry.startDate;
  const idx = Math.round((new Date(ds) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
  const total = entry.durationDays || 1;
  return total > 1 ? `${idx}/${total}. nap` : null;
}

function DayDetailSheet({ ds, recipes, entries, onClose, onAddNew, onEditEntry, onDeleteEntry, onTransferDay }) {
  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 kn-sheet" style={{ background: C.bg, maxHeight: "85vh", overflowY: "auto" }}>
        <div className="flex justify-between items-center mb-4">
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>
            {ds}
          </span>
          <button onClick={onClose} style={{ color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>

        {entries.length === 0 && (
          <div style={{ color: C.inkSoft, fontSize: 13, marginBottom: 16 }}>Erre a napra még nincs recept betervezve.</div>
        )}

        <div className="flex flex-col gap-2 mb-4">
          {entries.map((entry) => {
            const recipe = recipes[entry.recipeId];
            const dayLabel = dayIndexLabel(entry, ds);
            return (
              <div key={entry.id} className="rounded-xl p-3 kn-card flex items-center justify-between">
                <button className="text-left flex-1 min-w-0 kn-tap" onClick={() => onEditEntry(entry)}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: C.ink }}>
                    {recipe ? recipe.name : "(törölt recept)"}
                  </div>
                  <div style={{ color: C.inkSoft, fontSize: 12, marginTop: 2 }}>
                    {entry.servings} adag{dayLabel ? ` · ${dayLabel}` : ""}
                    {entry.addedToShoppingListAt ? " · a listán" : ""}
                  </div>
                </button>
                {recipe && (
                  <button
                    onClick={() => openInKalorianaplo(recipe, entry.servings)}
                    className="kn-tap ml-2"
                    style={{ color: C.sage }}
                    aria-label="Naplózás a Kalórianaplóba"
                    title="Naplózás a Kalórianaplóba"
                  >
                    <Utensils size={17} />
                  </button>
                )}
                <button onClick={() => onDeleteEntry(entry.id)} className="kn-tap ml-2" style={{ color: C.coral }}>
                  <Trash2 size={17} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onAddNew}
            className="flex-1 rounded-xl py-2.5 kn-tap flex items-center justify-center gap-2"
            style={{ background: C.cardAlt, color: C.ink, fontWeight: 600 }}
          >
            <Plus size={16} /> Recept
          </button>
          {entries.length > 0 && (
            <button
              onClick={onTransferDay}
              className="flex-1 rounded-xl py-2.5 kn-tap flex items-center justify-center gap-2"
              style={{ background: C.sage, color: "white", fontWeight: 600 }}
            >
              <ShoppingCart size={16} /> Bevásárlólistához
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function RecipePickerSheet({ recipes, mealPlan, startDate, existingEntry, onClose, onSave }) {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState(existingEntry ? existingEntry.recipeId : null);
  const recipe = selectedRecipeId ? recipes[selectedRecipeId] : null;
  const [servings, setServings] = useState(existingEntry ? existingEntry.servings : recipe ? recipe.baseServings : 2);
  const [duration, setDuration] = useState(existingEntry ? existingEntry.durationDays : 1);

  const categorySuggestions = useMemo(() => getAllCategories(recipes), [recipes]);

  const list = Object.values(recipes)
    .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    .filter((r) => !categoryFilter || (r.category || "") === categoryFilter)
    .sort((a, b) => a.name.localeCompare(b.name, "hu"));

  const overlapping = selectedRecipeId
    ? findOverlappingEntries(mealPlan, startDate, duration, existingEntry ? existingEntry.id : undefined)
    : [];

  function chooseRecipe(r) {
    setSelectedRecipeId(r.id);
    setServings(r.baseServings);
  }

  function handleSave() {
    const entry = {
      id: existingEntry ? existingEntry.id : newEntryId(),
      recipeId: selectedRecipeId,
      startDate,
      durationDays: Number(duration),
      servings: Number(servings) || 1,
      addedToShoppingListAt: existingEntry ? existingEntry.addedToShoppingListAt || null : null,
      createdAt: existingEntry ? existingEntry.createdAt : new Date().toISOString(),
    };
    onSave(entry);
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
        <div className="flex justify-between items-center mb-4">
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 17, color: C.ink }}>
            {recipe ? recipe.name : "Recept választása"}
          </span>
          <button onClick={onClose} style={{ color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>

        {!recipe && (
          <>
            <div className="relative mb-3">
              <Search size={16} style={{ position: "absolute", left: 12, top: 13, color: C.inkSoft }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Keresés..."
                className="w-full rounded-xl pl-9 pr-3 py-2.5"
                style={{ border: `1px solid ${C.border}`, background: C.card, color: C.ink, fontSize: 15 }}
              />
            </div>
            {categorySuggestions.length > 0 && (
              <div className="flex gap-2 mb-3" style={{ overflowX: "auto" }}>
                <button
                  onClick={() => setCategoryFilter(null)}
                  className="rounded-full px-3 py-1.5 kn-tap text-xs font-semibold"
                  style={{ background: !categoryFilter ? C.sage : C.cardAlt, color: !categoryFilter ? "white" : C.inkSoft, whiteSpace: "nowrap" }}
                >
                  Mind
                </button>
                {categorySuggestions.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className="rounded-full px-3 py-1.5 kn-tap text-xs font-semibold"
                    style={{ background: categoryFilter === cat ? C.sage : C.cardAlt, color: categoryFilter === cat ? "white" : C.inkSoft, whiteSpace: "nowrap" }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
            {list.length === 0 && (
              <div style={{ color: C.inkSoft, fontSize: 13 }}>
                {categoryFilter ? "Nincs recept ebben a kategóriában." : "Nincs ilyen nevű recept a könyvtárban."}
              </div>
            )}
            <div className="flex flex-col gap-2">
              {list.map((r) => (
                <button
                  key={r.id}
                  onClick={() => chooseRecipe(r)}
                  className="rounded-xl p-3 kn-card kn-tap text-left"
                  style={{ color: C.ink, fontSize: 14, fontWeight: 600 }}
                >
                  {r.name}
                  <span style={{ color: C.inkSoft, fontWeight: 400, fontSize: 12 }}> · {r.baseServings} adag{r.category ? ` · ${r.category}` : ""}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {recipe && (
          <>
            <NumField label="Hány adagra főzöl" value={servings} onChange={setServings} />

            <div style={{ color: C.inkSoft, fontSize: 12, marginTop: 8, marginBottom: 6 }}>Hány napig tart (maradék)</div>
            <div className="flex gap-2 mb-4">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className="flex-1 rounded-xl py-2.5 kn-tap"
                  style={{
                    background: duration === d ? C.sage : C.cardAlt,
                    color: duration === d ? "white" : C.inkSoft,
                    fontWeight: 600,
                  }}
                >
                  {d} nap
                </button>
              ))}
            </div>

            {overlapping.length > 0 && (
              <div
                className="rounded-xl p-3 mb-4"
                style={{ background: C.amberBg, color: C.amber, fontSize: 12.5, lineHeight: 1.5 }}
              >
                Erre a napra már van tervezve: {overlapping.map((e) => recipes[e.recipeId]?.name || "?").join(", ")}.
                Hozzáadod ezt is?
              </div>
            )}

            <div className="flex gap-2">
              {!existingEntry && (
                <button
                  onClick={() => setSelectedRecipeId(null)}
                  className="flex-1 rounded-xl py-2.5 kn-tap"
                  style={{ background: C.cardAlt, color: C.inkSoft, fontWeight: 600 }}
                >
                  Vissza
                </button>
              )}
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl py-2.5 kn-tap"
                style={{ background: C.sage, color: "white", fontWeight: 600 }}
              >
                Mentés
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
