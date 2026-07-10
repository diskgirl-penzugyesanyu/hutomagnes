package hu.heni.hutomagnes;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Elkapja a más appokból (Chrome, Instagram, Galéria stb.) érkező
 * "Megosztás" (ACTION_SEND) intenteket, és a JS oldal lekérdezheti
 * a getSharedContent() hívással -- szöveg/link esetén a nyers szöveget,
 * kép esetén base64-kódolt JPEG/PNG adatot ad vissza.
 */
@CapacitorPlugin(name = "ShareReceiver")
public class ShareReceiverPlugin extends Plugin {

    private static String pendingType = null;
    private static String pendingValue = null;
    private static String pendingMimeType = null;

    public static void handleIntent(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        String type = intent.getType();

        if (!Intent.ACTION_SEND.equals(action) || type == null) return;

        if ("text/plain".equals(type)) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null && !text.trim().isEmpty()) {
                pendingType = "text";
                pendingValue = text;
            }
        } else if (type.startsWith("image/")) {
            Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            if (imageUri != null) {
                String b64 = readUriAsBase64(context, imageUri);
                if (b64 != null) {
                    pendingType = "image";
                    pendingValue = b64;
                    pendingMimeType = type;
                }
            }
        }
    }

    private static String readUriAsBase64(Context context, Uri uri) {
        try (InputStream is = context.getContentResolver().openInputStream(uri)) {
            if (is == null) return null;
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int n;
            while ((n = is.read(chunk)) != -1) {
                buffer.write(chunk, 0, n);
            }
            return Base64.encodeToString(buffer.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    @PluginMethod
    public void getSharedContent(PluginCall call) {
        JSObject ret = new JSObject();
        if (pendingType != null && pendingValue != null) {
            ret.put("type", pendingType);
            ret.put("value", pendingValue);
            if (pendingMimeType != null) ret.put("mimeType", pendingMimeType);
            pendingType = null;
            pendingValue = null;
            pendingMimeType = null;
        } else {
            ret.put("type", "none");
        }
        call.resolve(ret);
    }
}
