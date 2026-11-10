package io.github.gabrielmacsantos.minhasfinancas;

import android.Manifest;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Bridge between index.html and the native notification reading (BankListener + NotificationQueue).
 * Nothing starts on its own: the page asks the user first and only then calls setWatching(true).
 */
@CapacitorPlugin(
        name = "BankNotifications",
        permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications") }
)
public class BankNotificationsPlugin extends Plugin {
    /** Separate notification reader app; installed together with this app, both would deliver the same notification. */
    private static final String READER_PACKAGE = "io.github.gabrielmacsantos.leitor";
    // Apps whose name suggests a bank or wallet are suggested on first use, besides NotificationQueue.KNOWN_APPS.
    private static final Pattern FINANCE_NAME = Pattern.compile(
            "(?i)(banco|bank|carteira|wallet|caixa|sicredi|sicoob|picpay|mercado pago|pagbank|nubank|ita[uú]|bradesco|santander|c6)");

    private static volatile BankNotificationsPlugin active;

    @Override
    public void load() {
        active = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (active == this) active = null;
    }

    /** Called by BankListener: lets an open app take the new notification right away. */
    static void queued() {
        BankNotificationsPlugin plugin = active;
        if (plugin != null) plugin.notifyListeners("queued", new JSObject());
    }

    private NotificationQueue queue() {
        return new NotificationQueue(getContext());
    }

    @PluginMethod
    public void status(PluginCall call) {
        NotificationQueue q = queue();
        JSObject ret = new JSObject();
        ret.put("access", hasAccess());
        ret.put("watching", q.watching());
        ret.put("apps", q.apps().size());
        ret.put("pending", q.count());
        ret.put("readerInstalled", isInstalled(READER_PACKAGE));
        call.resolve(ret);
    }

    @PluginMethod
    public void setWatching(PluginCall call) {
        queue().setWatching(Boolean.TRUE.equals(call.getBoolean("on", false)));
        call.resolve();
    }

    @PluginMethod
    public void openAccessSettings(PluginCall call) {
        getActivity().startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS));
        call.resolve();
    }

    /** "Informações do app", where Android 13+ shows "Permitir configurações restritas" for apps outside the Play Store. */
    @PluginMethod
    public void openAppDetails(PluginCall call) {
        getActivity().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName())));
        call.resolve();
    }

    /** Installed apps with a launcher icon: { id, label, checked }, checked first. */
    @PluginMethod
    public void listApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<String[]> apps = new ArrayList<>(); // {package, label}
        Set<String> seen = new HashSet<>();
        for (ResolveInfo info : pm.queryIntentActivities(launcher, 0)) {
            String pkg = info.activityInfo.packageName;
            if (pkg.equals(getContext().getPackageName()) || !seen.add(pkg)) continue;
            apps.add(new String[]{pkg, String.valueOf(info.loadLabel(pm))});
        }

        NotificationQueue q = queue();
        Set<String> chosen;
        if (q.hasChosenApps()) {
            chosen = q.apps();
        } else {
            chosen = new HashSet<>();
            for (String[] app : apps) {
                if (NotificationQueue.KNOWN_APPS.contains(app[0]) || FINANCE_NAME.matcher(app[1]).find()) chosen.add(app[0]);
            }
            q.setApps(chosen);
        }
        apps.sort((a, b) -> {
            boolean ca = chosen.contains(a[0]), cb = chosen.contains(b[0]);
            if (ca != cb) return ca ? -1 : 1;
            return a[1].toLowerCase(Locale.ROOT).compareTo(b[1].toLowerCase(Locale.ROOT));
        });

        JSArray list = new JSArray();
        for (String[] app : apps) {
            JSObject o = new JSObject();
            o.put("id", app[0]);
            o.put("label", app[1]);
            o.put("checked", chosen.contains(app[0]));
            list.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("apps", list);
        call.resolve(ret);
    }

    @PluginMethod
    public void setApps(PluginCall call) {
        JSArray ids = call.getArray("ids", new JSArray());
        Set<String> apps = new HashSet<>();
        try {
            for (Object id : ids.toList()) apps.add(String.valueOf(id));
        } catch (JSONException e) {
            call.reject("Lista de apps inválida.");
            return;
        }
        queue().setApps(apps);
        call.resolve();
    }

    @PluginMethod
    public void takeQueue(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("items", queue().take());
        call.resolve(ret);
    }

    private boolean hasAccess() {
        String enabled = Settings.Secure.getString(getContext().getContentResolver(), "enabled_notification_listeners");
        String me = new ComponentName(getContext(), BankListener.class).flattenToString();
        return enabled != null && enabled.contains(me);
    }

    private boolean isInstalled(String pkg) {
        try {
            getContext().getPackageManager().getPackageInfo(pkg, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }
}
