import React, { useEffect, useState } from "react";
import { BookOpen, Plus, ChevronRight, Users, CalendarDays, ShoppingCart, Download } from "lucide-react";
import { C, EmptyState, FadeIn, ConfirmDeleteModal } from "./shared.jsx";
import { kvGet, kvSet } from "./storage.js";
import { emptyRecipe, formatIngredientLine, getAllCategories } from "./recipes.js";
import { downloadRecipesCsv } from "./csv.js";
import RecipeForm from "./RecipeForm.jsx";
import RecipeSourcePicker from "./RecipeSourcePicker.jsx";
import ImportRecipeSheet from "./ImportRecipeSheet.jsx";
import CalendarView from "./CalendarView.jsx";
import ShoppingListView from "./ShoppingListView.jsx";
import TransferReviewSheet from "./TransferReviewSheet.jsx";
import { getEntriesInRange } from "./mealPlanCalendar.js";
import { buildTransferPreview, mergeIntoShoppingList, addAdhocItem, setLineStatus, formatLineForExport, mergeDuplicateLines } from "./shoppingList.js";
import { consumePendingShare } from "./nativeShareReceiver.js";
import { syncToOurGroceries } from "./ourGroceries.js";

const RECIPES_KEY = "recipes";
const MEAL_PLAN_KEY = "meal-plan";
const SHOPPING_LIST_KEY = "shopping-list";

const SECTIONS = [
  { id: "library", label: "Könyvtár", icon: <BookOpen size={14} /> },
  { id: "calendar", label: "Naptár", icon: <CalendarDays size={14} /> },
  { id: "shopping", label: "Bevásárlás", icon: <ShoppingCart size={14} /> },
];

export default function App() {
  const [section, setSection] = useState("library");
  const [recipes, setRecipes] = useState({});
  const [mealPlan, setMealPlan] = useState({});
  const [shoppingList, setShoppingList] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [importMode, setImportMode] = useState(null); // null | "photo" | "paste"
  const [importedDraft, setImportedDraft] = useState(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [editingRecipe, setEditingRecipe] = useState(null);
  const [deletingRecipe, setDeletingRecipe] = useState(null);
  const [transferRange, setTransferRange] = useState(null); // {start, end}
  const [nativeShare, setNativeShare] = useState(null); // {type, value, mimeType} | null
  const [categoryFilter, setCategoryFilter] = useState(null); // null = "Mind"

  useEffect(() => {
    async function checkShare() {
      const shared = await consumePendingShare();
      if (shared) setNativeShare(shared);
    }
    checkShare();

    let sub;
    (async () => {
      try {
        const { App: CapacitorApp } = await import("@capacitor/app");
        sub = await CapacitorApp.addListener("appStateChange", ({ isActive }) => {
          if (isActive) checkShare();
        });
      } catch {}
    })();
    return () => {
      if (sub) sub.remove();
    };
  }, []);

  useEffect(() => {
    (async () => {
      const [storedRecipes, storedMealPlan, storedShoppingList] = await Promise.all([
        kvGet(RECIPES_KEY),
        kvGet(MEAL_PLAN_KEY),
        kvGet(SHOPPING_LIST_KEY),
      ]);
      if (storedRecipes) setRecipes(storedRecipes);
      if (storedMealPlan) setMealPlan(storedMealPlan);
      if (storedShoppingList) setShoppingList(storedShoppingList);
      setLoading(false);
    })();
  }, []);

  async function persistRecipes(next) {
    setRecipes(next);
    try {
      await kvSet(RECIPES_KEY, next);
    } catch {}
  }

  async function persistMealPlan(next) {
    setMealPlan(next);
    try {
      await kvSet(MEAL_PLAN_KEY, next);
    } catch {}
  }

  async function persistShoppingList(next) {
    setShoppingList(next);
    try {
      await kvSet(SHOPPING_LIST_KEY, next);
    } catch {}
  }

  async function saveRecipe(recipe) {
    await persistRecipes({ ...recipes, [recipe.id]: recipe });
    setShowForm(false);
    setEditingRecipe(null);
    setImportedDraft(null);
  }

  const affectedEntryCount = deletingRecipe
    ? Object.values(mealPlan).filter((e) => e.recipeId === deletingRecipe.id).length
    : 0;

  async function deleteRecipe(recipe) {
    const nextRecipes = { ...recipes };
    delete nextRecipes[recipe.id];
    await persistRecipes(nextRecipes);

    const nextMealPlan = { ...mealPlan };
    for (const entry of Object.values(mealPlan)) {
      if (entry.recipeId === recipe.id) delete nextMealPlan[entry.id];
    }
    if (Object.keys(nextMealPlan).length !== Object.keys(mealPlan).length) {
      await persistMealPlan(nextMealPlan);
    }

    setDeletingRecipe(null);
  }

  async function saveMealPlanEntry(entry) {
    await persistMealPlan({ ...mealPlan, [entry.id]: entry });
  }

  async function deleteMealPlanEntry(entryId) {
    const next = { ...mealPlan };
    delete next[entryId];
    await persistMealPlan(next);
  }

  function openTransferReview(start, end) {
    setTransferRange({ start, end });
  }

  async function confirmTransfer(confirmedLines) {
    const nextShoppingList = mergeIntoShoppingList(shoppingList, confirmedLines);
    await persistShoppingList(nextShoppingList);

    const coveredEntries = getEntriesInRange(mealPlan, transferRange.start, transferRange.end);
    if (coveredEntries.length > 0) {
      const now = new Date().toISOString();
      const nextMealPlan = { ...mealPlan };
      for (const entry of coveredEntries) {
        nextMealPlan[entry.id] = { ...entry, addedToShoppingListAt: now };
      }
      await persistMealPlan(nextMealPlan);
    }

    setTransferRange(null);
    setSection("shopping");
  }

  async function updateLineAmount(lineId, amount) {
    if (!shoppingList[lineId]) return;
    await persistShoppingList({ ...shoppingList, [lineId]: { ...shoppingList[lineId], amount: Number(amount) || 0 } });
  }

  async function deleteLine(lineId) {
    const next = { ...shoppingList };
    delete next[lineId];
    await persistShoppingList(next);
  }

  async function addAdhocLine(item) {
    await persistShoppingList(addAdhocItem(shoppingList, item));
  }

  async function sendPending(lineIds) {
    setSendError("");
    const items = lineIds.flatMap((id) => formatLineForExport(shoppingList[id])).filter(Boolean);
    setSending(true);
    try {
      await syncToOurGroceries(items);
      await persistShoppingList(setLineStatus(shoppingList, lineIds, "sent"));
    } catch (e) {
      setSendError(e.message || "Nem sikerült elküldeni.");
    } finally {
      setSending(false);
    }
  }

  async function reopenLine(lineId) {
    await persistShoppingList(setLineStatus(shoppingList, [lineId], "pending"));
  }

  async function mergeDuplicates(lineIds, canonicalName) {
    await persistShoppingList(mergeDuplicateLines(shoppingList, lineIds, canonicalName));
  }

  const categorySuggestions = getAllCategories(recipes);
  const allRecipeList = Object.values(recipes).sort((a, b) => (a.name || "").localeCompare(b.name || "", "hu"));
  const recipeList = categoryFilter ? allRecipeList.filter((r) => (r.category || "") === categoryFilter) : allRecipeList;
  const transferLines = transferRange ? buildTransferPreview(mealPlan, recipes, transferRange.start, transferRange.end) : [];
  const transferLabel = transferRange
    ? transferRange.start === transferRange.end
      ? transferRange.start
      : `${transferRange.start} – ${transferRange.end}`
    : "";

  return (
    <div
      className="w-full"
      style={{
        minHeight: "100dvh",
        color: C.ink,
        fontFamily: "Inter, sans-serif",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)",
      }}
    >
      <div className="px-5 pt-6 pb-3">
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: C.ink }}>
          Hűtőmágnes
        </div>
        <div className="flex rounded-full mt-3 kn-card p-1" style={{ gap: 2 }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="flex-1 rounded-full py-2 kn-tap flex items-center justify-center gap-1.5"
              style={{
                background: section === s.id ? C.sage : "transparent",
                color: section === s.id ? "white" : C.inkSoft,
                fontWeight: 600,
                fontSize: 12.5,
              }}
            >
              {s.icon}
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {section === "library" && (
        <FadeIn keyProp="library">
          <div className="px-5">
            {!loading && allRecipeList.length === 0 && (
              <EmptyState
                icon={<BookOpen size={40} color={C.sage} />}
                title="Még nincs recept felvéve"
                subtitle="Koppints a jobb alsó gombra az első recept hozzáadásához."
              />
            )}

            {allRecipeList.length > 0 && (
              <button
                onClick={() => downloadRecipesCsv(recipes)}
                className="w-full rounded-xl py-2.5 kn-tap flex items-center justify-center gap-2 mb-3"
                style={{ background: C.cardAlt, color: C.ink, fontWeight: 600, fontSize: 13 }}
              >
                <Download size={15} /> Receptek mentése CSV-be
              </button>
            )}

            {categorySuggestions.length > 0 && (
              <div className="flex gap-2 mb-3" style={{ overflowX: "auto" }}>
                <button
                  onClick={() => setCategoryFilter(null)}
                  className="rounded-full px-3 py-1.5 kn-tap"
                  style={{
                    background: !categoryFilter ? C.sage : C.cardAlt,
                    color: !categoryFilter ? "white" : C.inkSoft,
                    fontSize: 12.5,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  Mind
                </button>
                {categorySuggestions.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className="rounded-full px-3 py-1.5 kn-tap"
                    style={{
                      background: categoryFilter === c ? C.sage : C.cardAlt,
                      color: categoryFilter === c ? "white" : C.inkSoft,
                      fontSize: 12.5,
                      fontWeight: 600,
                      flexShrink: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {categoryFilter && recipeList.length === 0 && (
              <div style={{ color: C.inkSoft, fontSize: 13, marginBottom: 12 }}>
                Nincs recept ebben a kategóriában.
              </div>
            )}

            <div className="flex flex-col gap-2">
              {recipeList.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setEditingRecipe(r)}
                  className="rounded-2xl p-4 kn-card kn-tap text-left w-full"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 15, color: C.ink }}>
                          {r.name}
                        </div>
                        {r.category && (
                          <span
                            className="rounded-full px-2 py-0.5"
                            style={{ background: C.sageBg, color: C.sage, fontSize: 10.5, fontWeight: 600, flexShrink: 0 }}
                          >
                            {r.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1" style={{ color: C.inkSoft, fontSize: 12 }}>
                        <Users size={12} style={{ flexShrink: 0 }} />
                        <span style={{ flexShrink: 0 }}>{r.baseServings} adag</span>
                        <span style={{ flexShrink: 0 }}>·</span>
                        <span style={{ flexShrink: 0 }}>{r.ingredients.length} hozzávaló</span>
                      </div>
                      {r.ingredients[0] && (
                        <div
                          className="truncate"
                          style={{ color: C.inkSoft, fontSize: 11.5, marginTop: 3, opacity: 0.75 }}
                        >
                          {r.ingredients.map((i) => formatIngredientLine(i)).join(", ")}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={18} color={C.inkSoft} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </FadeIn>
      )}

      {section === "calendar" && (
        <FadeIn keyProp="calendar">
          {recipeList.length === 0 ? (
            <div className="px-5">
              <EmptyState
                icon={<CalendarDays size={40} color={C.sage} />}
                title="Előbb vegyél fel recepteket"
                subtitle="A naptárban csak a könyvtárban már meglévő receptekből tudsz választani."
              />
            </div>
          ) : (
            <CalendarView
              recipes={recipes}
              mealPlan={mealPlan}
              onSaveEntry={saveMealPlanEntry}
              onDeleteEntry={deleteMealPlanEntry}
              onTransferRange={openTransferReview}
            />
          )}
        </FadeIn>
      )}

      {section === "shopping" && (
        <FadeIn keyProp="shopping">
          <ShoppingListView
            shoppingList={shoppingList}
            recipes={recipes}
            mealPlan={mealPlan}
            sending={sending}
            sendError={sendError}
            onUpdateAmount={updateLineAmount}
            onDeleteLine={deleteLine}
            onAddAdhoc={addAdhocLine}
            onSend={sendPending}
            onReopen={reopenLine}
            onMergeDuplicates={mergeDuplicates}
          />
        </FadeIn>
      )}

      {section === "library" && (
        <button
          onClick={() => setSourcePickerOpen(true)}
          className="fixed rounded-full flex items-center justify-center kn-tap"
          style={{
            width: 58,
            height: 58,
            right: 20,
            bottom: "calc(env(safe-area-inset-bottom) + 20px)",
            background: C.coral,
            boxShadow: "0 8px 24px rgba(255,95,162,0.45)",
          }}
        >
          <Plus size={26} color="white" />
        </button>
      )}

      {sourcePickerOpen && (
        <RecipeSourcePicker
          onClose={() => setSourcePickerOpen(false)}
          onPickManual={() => {
            setSourcePickerOpen(false);
            setShowForm(true);
          }}
          onPickPhoto={() => {
            setSourcePickerOpen(false);
            setImportMode("photo");
          }}
          onPickPaste={() => {
            setSourcePickerOpen(false);
            setImportMode("paste");
          }}
        />
      )}

      {importMode && (
        <ImportRecipeSheet
          mode={importMode}
          categorySuggestions={categorySuggestions}
          onClose={() => setImportMode(null)}
          onExtracted={(draft) => {
            setImportMode(null);
            setImportedDraft(draft);
          }}
          onFallbackManual={() => {
            setImportMode(null);
            setShowForm(true);
          }}
        />
      )}

      {nativeShare && (
        <ImportRecipeSheet
          mode={nativeShare.type === "image" ? "photo" : "paste"}
          initialText={nativeShare.type === "text" ? nativeShare.value : undefined}
          initialImage={nativeShare.type === "image" ? nativeShare : undefined}
          categorySuggestions={categorySuggestions}
          onClose={() => setNativeShare(null)}
          onExtracted={(draft) => {
            setNativeShare(null);
            setImportedDraft(draft);
          }}
          onFallbackManual={() => {
            setNativeShare(null);
            setShowForm(true);
          }}
        />
      )}

      {importedDraft && (
        <RecipeForm
          recipe={importedDraft}
          categorySuggestions={categorySuggestions}
          onClose={() => setImportedDraft(null)}
          onSave={saveRecipe}
        />
      )}

      {showForm && (
        <RecipeForm
          recipe={emptyRecipe()}
          categorySuggestions={categorySuggestions}
          onClose={() => setShowForm(false)}
          onSave={saveRecipe}
        />
      )}

      {editingRecipe && (
        <RecipeForm
          recipe={editingRecipe}
          categorySuggestions={categorySuggestions}
          onClose={() => setEditingRecipe(null)}
          onSave={saveRecipe}
          onDelete={() => {
            setDeletingRecipe(editingRecipe);
            setEditingRecipe(null);
          }}
        />
      )}

      {deletingRecipe && (
        <ConfirmDeleteModal
          title="Recept törlése"
          message={
            affectedEntryCount > 0
              ? `„${deletingRecipe.name}” véglegesen törlődik, és ezzel együtt ${affectedEntryCount} naptári bejegyzés is törlődik, ami erre a receptre hivatkozik.`
              : `„${deletingRecipe.name}” véglegesen törlődik.`
          }
          onCancel={() => setDeletingRecipe(null)}
          onConfirm={() => deleteRecipe(deletingRecipe)}
        />
      )}

      {transferRange && (
        <TransferReviewSheet
          lines={transferLines}
          rangeLabel={transferLabel}
          onCancel={() => setTransferRange(null)}
          onConfirm={confirmTransfer}
        />
      )}
    </div>
  );
}
