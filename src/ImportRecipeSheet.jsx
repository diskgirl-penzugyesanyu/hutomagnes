import React, { useEffect, useRef, useState } from "react";
import { X, Loader2, ClipboardPaste, Camera, Images } from "lucide-react";
import { C, TextAreaField } from "./shared.jsx";
import { extractRecipeFromText, extractRecipeFromPhoto, extractRecipeFromSharedImage } from "./recipeImport.js";

export default function ImportRecipeSheet({ mode, onClose, onExtracted, onFallbackManual, initialText, initialImage }) {
  const [pasteText, setPasteText] = useState(initialText || "");
  const [stage, setStage] = useState(
    initialImage || initialText ? "loading" : mode === "photo" ? "pick" : "input"
  ); // "pick" | "input" | "loading" | "error"
  const [error, setError] = useState("");
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  async function runPaste(text) {
    const value = (text ?? pasteText).trim();
    if (!value) return;
    setStage("loading");
    setError("");
    try {
      const draft = await extractRecipeFromText(value);
      onExtracted(draft);
    } catch (e) {
      setError(e.message || "Nem sikerült feldolgozni.");
      setStage("error");
    }
  }

  async function runSharedImage() {
    setStage("loading");
    setError("");
    try {
      const draft = await extractRecipeFromSharedImage(initialImage.value, initialImage.mimeType);
      onExtracted(draft);
    } catch (err) {
      setError(err.message || "Nem sikerült feldolgozni a képet.");
      setStage("error");
    }
  }

  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setStage("loading");
    setError("");
    try {
      const draft = await extractRecipeFromPhoto(file);
      onExtracted(draft);
    } catch (err) {
      setError(err.message || "Nem sikerült feldolgozni a fotót.");
      setStage("error");
    }
  }

  useEffect(() => {
    if (mode === "photo" && initialImage) {
      runSharedImage();
    } else if (mode === "paste" && initialText) {
      runPaste(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: C.ink }}>
            {mode === "photo" ? "Recept fotóból" : "Recept beillesztése"}
          </span>
          <button onClick={onClose} style={{ color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>

        {stage === "loading" && (
          <div className="flex flex-col items-center py-10">
            <Loader2 size={28} className="animate-spin" style={{ color: C.sage }} />
            <div style={{ color: C.inkSoft, fontSize: 13, marginTop: 12 }}>Recept feldolgozása...</div>
          </div>
        )}

        {stage === "error" && (
          <>
            <div className="rounded-xl p-3 mb-4" style={{ background: C.coralBg, color: C.coral, fontSize: 13, lineHeight: 1.5 }}>
              {error}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStage(mode === "photo" ? "pick" : "input")}
                className="flex-1 rounded-xl py-2.5 kn-tap"
                style={{ background: C.cardAlt, color: C.ink, fontWeight: 600 }}
              >
                Újra
              </button>
              <button
                onClick={onFallbackManual}
                className="flex-1 rounded-xl py-2.5 kn-tap"
                style={{ background: C.sage, color: "white", fontWeight: 600 }}
              >
                Inkább kézzel
              </button>
            </div>
          </>
        )}

        {stage === "pick" && mode === "photo" && (
          <>
            <div style={{ color: C.inkSoft, fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
              Fotózd le vagy válaszd ki a receptet (kézzel írt is lehet) -- az AI megpróbálja kiolvasni a hozzávalókat és a leírást.
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => cameraRef.current && cameraRef.current.click()}
                className="w-full rounded-xl py-3 kn-tap flex items-center justify-center gap-2"
                style={{ background: C.sage, color: "white", fontWeight: 600 }}
              >
                <Camera size={18} /> Fénykép készítése
              </button>
              <button
                onClick={() => galleryRef.current && galleryRef.current.click()}
                className="w-full rounded-xl py-3 kn-tap flex items-center justify-center gap-2"
                style={{ background: C.cardAlt, color: C.ink, fontWeight: 600 }}
              >
                <Images size={18} /> Kiválasztás galériából
              </button>
            </div>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </>
        )}

        {stage === "input" && mode === "paste" && (
          <>
            <TextAreaField
              label="Illeszd be a linket vagy a receptleírást"
              value={pasteText}
              onChange={setPasteText}
              placeholder="pl. https://... vagy egy Instagram-poszt leírása"
              rows={6}
            />
            <button
              onClick={runPaste}
              className="w-full rounded-xl py-3 kn-tap flex items-center justify-center gap-2"
              style={{ background: C.sage, color: "white", fontWeight: 600 }}
            >
              <ClipboardPaste size={17} /> Feldolgozás
            </button>
          </>
        )}
      </div>
    </div>
  );
}
