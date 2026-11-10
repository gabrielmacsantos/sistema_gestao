package io.github.gabrielmacsantos.minhasfinancas;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import java.util.regex.Pattern;

/**
 * Receives the phone's notifications once the user grants "acesso às notificações", and only while they turned the
 * feature on in the app. Keeps just the ones from the chosen banks and wallets that mention money; the rest is
 * ignored and never stored.
 */
public class BankListener extends NotificationListenerService {
    private static final Pattern MONEY = Pattern.compile("R\\$|BRL|\\d,\\d{2}\\b");

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        NotificationQueue queue = new NotificationQueue(this);
        if (!queue.watching() || !queue.apps().contains(sbn.getPackageName())) return;
        Notification n = sbn.getNotification();
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return;
        Bundle extras = n.extras;
        if (extras == null) return;
        CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
        CharSequence text = extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if (text == null) text = extras.getCharSequence(Notification.EXTRA_TEXT);
        String body = ((title == null ? "" : title + " ") + (text == null ? "" : text)).replaceAll("\\s+", " ").trim();
        if (body.isEmpty() || !MONEY.matcher(body).find()) return;
        queue.add(sbn.getPostTime(), body);
        queue.showNotification();
        BankNotificationsPlugin.queued();
    }
}
