// Natív "Megosztás" (Share) intent fogadása -- Chrome-ból link, Galériából kép,
// vagy bármilyen appból social media poszt megosztható közvetlenül a Hűtőmágnesbe.
// A natív oldal: android/app/src/main/java/hu/heni/hutomagnes/ShareReceiverPlugin.java

import { Capacitor, registerPlugin } from "@capacitor/core";

const ShareReceiver = registerPlugin("ShareReceiver");

// Visszaad egy { type: "text"|"image", value } objektumot, vagy null-t, ha nem
// natív platformon fut, vagy nem volt éppen megosztás. A natív oldal a hívás
// után törli a "várakozó" tartalmat, tehát ez csak egyszer ad vissza találatot
// megosztásonként.
export async function consumePendingShare() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const res = await ShareReceiver.getSharedContent();
    if (res && res.type && res.type !== "none") {
      return { type: res.type, value: res.value, mimeType: res.mimeType || "image/jpeg" };
    }
  } catch {}
  return null;
}
