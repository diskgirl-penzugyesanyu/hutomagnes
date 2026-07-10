import React from "react";
import { X, Pencil, Camera, ClipboardPaste } from "lucide-react";
import { C } from "./shared.jsx";

export default function RecipeSourcePicker({ onClose, onPickManual, onPickPhoto, onPickPaste }) {
  const options = [
    { icon: <Pencil size={20} />, label: "Kézi hozzáadás", subtitle: "Írd be a receptet magad", onClick: onPickManual },
    { icon: <Camera size={20} />, label: "Fotóból", subtitle: "Kézzel írt vagy nyomtatott recept fotója", onClick: onPickPhoto },
    { icon: <ClipboardPaste size={20} />, label: "Link vagy szöveg beillesztése", subtitle: "Recept-link, vagy másolt leírás egy posztból", onClick: onPickPaste },
  ];

  return (
    <div
      className="fixed inset-0 flex items-end justify-center z-50"
      style={{ background: "rgba(0,0,0,0.5)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-3xl p-5 pb-8 kn-sheet" style={{ background: C.bg }}>
        <div className="flex justify-between items-center mb-4">
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 18, color: C.ink }}>
            Új recept
          </span>
          <button onClick={onClose} style={{ color: C.inkSoft }}>
            <X size={22} />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {options.map((o) => (
            <button key={o.label} onClick={o.onClick} className="rounded-xl p-3 kn-card kn-tap flex items-center gap-3 text-left">
              <div style={{ color: C.sage }}>{o.icon}</div>
              <div>
                <div style={{ color: C.ink, fontSize: 14, fontWeight: 600 }}>{o.label}</div>
                <div style={{ color: C.inkSoft, fontSize: 12, marginTop: 1 }}>{o.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
