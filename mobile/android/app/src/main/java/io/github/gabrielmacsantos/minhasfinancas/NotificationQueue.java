package io.github.gabrielmacsantos.minhasfinancas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Bank notifications waiting for the app, plus the user's choices (on/off and which apps), kept only on the phone.
 * The web side (index.html) takes the queue when the app opens and runs it through the same review as the site.
 */
final class NotificationQueue {
    private static final String PREFS = "bank-notifications";
    private static final String KEY_WATCHING = "watching";
    private static final String KEY_APPS = "apps";
    private static final String KEY_QUEUE = "queue";
    private static final int MAX_QUEUE = 200;
    private static final String CHANNEL = "movimentacoes";
    private static final int NOTIFICATION_ID = 1001;

    /** Common Brazilian banks and wallets, suggested the first time the list is shown. */
    static final Set<String> KNOWN_APPS = new HashSet<>(Arrays.asList(
            "com.nu.production",                      // Nubank
            "com.itau",                               // Itaú
            "br.com.intermedium",                     // Inter
            "com.bradesco",                           // Bradesco
            "br.com.bradesco.next",                   // next
            "br.com.gabba.Caixa",                     // Caixa
            "br.gov.caixa.tem",                       // Caixa Tem
            "br.com.bb.android",                      // Banco do Brasil
            "com.santander.app",                      // Santander
            "com.c6bank.app",                         // C6 Bank
            "com.picpay",                             // PicPay
            "com.mercadopago.wallet",                 // Mercado Pago
            "br.com.uol.ps.myaccount",                // PagBank
            "br.com.neon",                            // Neon
            "com.google.android.apps.walletnfcrel",   // Carteira do Google
            "com.samsung.android.spay"                // Samsung Wallet
    ));

    private final Context context;
    private final SharedPreferences prefs;

    NotificationQueue(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Off until the user says yes in the app; the listener ignores everything while off. */
    boolean watching() {
        return prefs.getBoolean(KEY_WATCHING, false);
    }

    void setWatching(boolean on) {
        prefs.edit().putBoolean(KEY_WATCHING, on).apply();
        if (!on) cancelNotification();
    }

    boolean hasChosenApps() {
        return prefs.contains(KEY_APPS);
    }

    Set<String> apps() {
        return new HashSet<>(prefs.getStringSet(KEY_APPS, Collections.emptySet()));
    }

    void setApps(Set<String> apps) {
        prefs.edit().putStringSet(KEY_APPS, new HashSet<>(apps)).apply();
    }

    synchronized int count() {
        return queue().length();
    }

    /** Adds a notification; the same text already waiting (apps re-post notifications) is skipped. */
    synchronized void add(long postedAt, String text) {
        JSONArray q = queue();
        for (int i = 0; i < q.length(); i++) {
            JSONObject item = q.optJSONObject(i);
            if (item != null && text.equals(item.optString("text"))) return;
        }
        JSONArray next = new JSONArray();
        for (int i = Math.max(0, q.length() - MAX_QUEUE + 1); i < q.length(); i++) next.put(q.opt(i));
        try {
            next.put(new JSONObject().put("at", postedAt).put("text", text));
        } catch (JSONException e) {
            return;
        }
        prefs.edit().putString(KEY_QUEUE, next.toString()).apply();
    }

    /** Hands the whole queue to the app and clears it. */
    synchronized JSArray take() {
        JSONArray q = queue();
        JSArray out = new JSArray();
        for (int i = 0; i < q.length(); i++) {
            JSONObject item = q.optJSONObject(i);
            if (item == null) continue;
            JSObject o = new JSObject();
            o.put("at", item.optLong("at"));
            o.put("text", item.optString("text"));
            out.put(o);
        }
        prefs.edit().remove(KEY_QUEUE).apply();
        cancelNotification();
        return out;
    }

    /** "N movimentações para revisar": a tap opens the app, which takes the queue. */
    void showNotification() {
        int n = count();
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (n == 0) {
            nm.cancel(NOTIFICATION_ID);
            return;
        }
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Movimentações do banco", NotificationManager.IMPORTANCE_DEFAULT));
        Intent launch = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        if (launch == null) return;
        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent open = PendingIntent.getActivity(context, 0, launch,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification = new Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_queue)
                .setContentTitle(n == 1 ? "1 movimentação do banco" : n + " movimentações do banco")
                .setContentText("Toque para conferir no Minhas Finanças")
                .setContentIntent(open)
                .setAutoCancel(true)
                .setOnlyAlertOnce(true)
                .build();
        nm.notify(NOTIFICATION_ID, notification);
    }

    private void cancelNotification() {
        context.getSystemService(NotificationManager.class).cancel(NOTIFICATION_ID);
    }

    private JSONArray queue() {
        try {
            return new JSONArray(prefs.getString(KEY_QUEUE, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }
}
