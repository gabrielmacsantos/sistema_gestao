package io.github.gabrielmacsantos.leitor;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.regex.Pattern;

/**
 * Receives the phone's notifications (after the user grants "acesso às notificações") and keeps only the ones from
 * the chosen banks and wallets that mention money. Everything else is ignored and never stored.
 */
public class BankListener extends NotificationListenerService {
    private static final Pattern MONEY = Pattern.compile("R\\$|BRL|\\d,\\d{2}\\b");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        Store store = new Store(this);
        if (!store.apps().contains(sbn.getPackageName())) return;
        Notification n = sbn.getNotification();
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        Bundle extras = n.extras;
        if (extras == null) return;
        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (text == null) text = extras.getCharSequence(Notification.EXTRA_TEXT);
        String body = ((title == null ? "" : title + " ") + (text == null ? "" : text)).replaceAll("\\s+", " ").trim();
        if (body.isEmpty() || !MONEY.matcher(body).find()) return;
        store.add(sbn.getPostTime(), body);
        store.showNotification();
    }
}
