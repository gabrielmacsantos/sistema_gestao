package io.github.gabrielmacsantos.leitor;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * Settings and the queue of bank notifications, kept only on the phone (SharedPreferences).
 * The queue goes to the site as "#/notificacao?t=[yyyy-MM-dd] text\n---\n..." (see splitNotifications in index.html).
 */
final class Store {
    private static final String PREFS = "leitor";
    private static final String KEY_APPS = "apps";
    private static final String KEY_QUEUE = "queue";
    private static final String KEY_LAST = "last";
    private static final String KEY_SITE = "site";
    private static final int MAX_QUEUE = 200;
    private static final String CHANNEL = "fila";
    private static final int NOTIFICATION_ID = 1;

    /** Common Brazilian banks and wallets, checked on first run. Users can change the list in the app. */
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

    Store(Context context) {
        this.context = context.getApplicationContext();
        this.prefs = this.context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
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

    String site() {
        return prefs.getString(KEY_SITE, context.getString(R.string.default_site));
    }

    void setSite(String site) {
        prefs.edit().putString(KEY_SITE, site.trim()).apply();
    }

    synchronized int count() {
        return queue().length();
    }

    /** Adds a notification; an identical text already waiting (apps re-post the same notification) is skipped. */
    synchronized void add(long postedAt, String text) {
        JSONArray q = queue();
        for (int i = 0; i < q.length(); i++) {
            if (text.equals(q.optJSONObject(i).optString("text"))) return;
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

    /** Address that hands the whole queue to the site, or null when the queue is empty. */
    synchronized String queueUrl() {
        return urlFor(batch(queue()));
    }

    /** Clears the queue after it was opened in the browser, keeping a copy for "Reenviar o último envio". */
    synchronized void markSent() {
        prefs.edit().putString(KEY_LAST, batch(queue())).remove(KEY_QUEUE).apply();
        cancelNotification();
    }

    String lastUrl() {
        return urlFor(prefs.getString(KEY_LAST, ""));
    }

    void showNotification() {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        int n = count();
        if (n == 0) {
            nm.cancel(NOTIFICATION_ID);
            return;
        }
        nm.createNotificationChannel(new NotificationChannel(CHANNEL, "Movimentações para enviar", NotificationManager.IMPORTANCE_LOW));
        PendingIntent open = PendingIntent.getActivity(context, 0, new Intent(context, SendActivity.class),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification notification = new Notification.Builder(context, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_queue)
                .setContentTitle(n == 1 ? "1 movimentação para enviar" : n + " movimentações para enviar")
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

    private static String batch(JSONArray q) {
        SimpleDateFormat day = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < q.length(); i++) {
            JSONObject item = q.optJSONObject(i);
            if (item == null) continue;
            if (sb.length() > 0) sb.append("\n---\n");
            sb.append('[').append(day.format(new Date(item.optLong("at")))).append("] ").append(item.optString("text"));
        }
        return sb.toString();
    }

    private String urlFor(String batch) {
        if (batch == null || batch.isEmpty()) return null;
        try {
            String base = site().replaceAll("#.*$", "");
            return base + "#/notificacao?t=" + URLEncoder.encode(batch, "UTF-8").replace("+", "%20");
        } catch (UnsupportedEncodingException e) {
            return null;
        }
    }
}
