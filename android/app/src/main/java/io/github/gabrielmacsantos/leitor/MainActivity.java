package io.github.gabrielmacsantos.leitor;

import android.Manifest;
import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.util.TypedValue;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/** Setup screen: grant notification access, choose banks and wallets, see and send the queue. */
public class MainActivity extends Activity {
    // Apps whose name suggests a bank or wallet are suggested on first run, besides Store.KNOWN_APPS.
    private static final Pattern FINANCE_NAME = Pattern.compile(
            "(?i)(banco|bank|carteira|wallet|caixa|sicredi|sicoob|picpay|mercado pago|pagbank|nubank|ita[uú]|bradesco|santander|c6)");

    private Store store;
    private TextView accessStatus;
    private Button accessButton;
    private TextView queueStatus;
    private EditText siteInput;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        store = new Store(this);
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
        setContentView(buildScreen());
    }

    @Override
    protected void onResume() {
        super.onResume();
        refresh();
    }

    @Override
    protected void onPause() {
        super.onPause();
        String site = siteInput.getText().toString().trim();
        if (site.startsWith("https://")) store.setSite(site);
    }

    private void refresh() {
        boolean on = hasNotificationAccess();
        accessStatus.setText(on
                ? "✓ Acesso às notificações ativo. As movimentações dos apps marcados abaixo entram na fila."
                : "Falta dar acesso às notificações. Sem ele o leitor não vê nada.");
        accessButton.setText(on ? "Ver acesso às notificações" : "Dar acesso às notificações");
        int n = store.count();
        queueStatus.setText(n == 0 ? "Nenhuma movimentação na fila." : n == 1 ? "1 movimentação na fila." : n + " movimentações na fila.");
    }

    private boolean hasNotificationAccess() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        String me = new ComponentName(this, BankListener.class).flattenToString();
        return enabled != null && enabled.contains(me);
    }

    private View buildScreen() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(20);
        root.setPadding(pad, pad, pad, pad);

        root.addView(text("Leva as notificações de Pix, compras e depósitos para o Minhas Finanças. Você confere tudo no site antes de salvar.", 15, false));

        root.addView(title("1. Acesso às notificações"));
        accessStatus = text("", 15, false);
        root.addView(accessStatus);
        accessButton = button("", v -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        root.addView(accessButton);
        root.addView(text("Se a opção aparecer bloqueada (cinza), toque em \"Abrir informações do app\", depois no menu ⋮ do canto e em \"Permitir configurações restritas\". Volte e tente de novo.", 13, false));
        root.addView(button("Abrir informações do app", v -> startActivity(
                new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())))));

        root.addView(title("2. Fila"));
        queueStatus = text("", 15, false);
        root.addView(queueStatus);
        root.addView(button("Enviar para o site agora", v -> { SendActivity.sendQueue(this); refresh(); }));
        root.addView(button("Reenviar o último envio", v -> {
            String url = store.lastUrl();
            if (url != null) SendActivity.open(this, url);
        }));
        root.addView(text("Quando chega uma movimentação, aparece a notificação \"movimentações para enviar\". Um toque abre o site com tudo; entre na sua conta se ele pedir.", 13, false));

        root.addView(title("3. Bancos e carteiras"));
        root.addView(text("Marque os apps que avisam suas movimentações. Só as notificações deles com valor em R$ entram na fila.", 13, false));
        addAppList(root);

        root.addView(title("Endereço do site"));
        siteInput = new EditText(this);
        siteInput.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        siteInput.setText(store.site());
        root.addView(siteInput);

        root.addView(title("Privacidade"));
        root.addView(text("Este app não tem permissão de internet: ele não envia nada para lugar nenhum. A fila fica só neste celular e vai para o site pelo navegador, quando você toca para enviar.", 13, false));

        ScrollView scroll = new ScrollView(this);
        scroll.addView(root);
        return scroll;
    }

    private void addAppList(LinearLayout root) {
        PackageManager pm = getPackageManager();
        Intent launcher = new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> found = pm.queryIntentActivities(launcher, 0);
        List<String[]> apps = new ArrayList<>(); // {package, label}
        Set<String> seen = new HashSet<>();
        for (ResolveInfo info : found) {
            String pkg = info.activityInfo.packageName;
            if (pkg.equals(getPackageName()) || !seen.add(pkg)) continue;
            apps.add(new String[]{pkg, String.valueOf(info.loadLabel(pm))});
        }

        boolean firstRun = !store.hasChosenApps();
        Set<String> chosen = firstRun ? new HashSet<>() : store.apps();
        if (firstRun) {
            for (String[] app : apps) {
                if (Store.KNOWN_APPS.contains(app[0]) || FINANCE_NAME.matcher(app[1]).find()) chosen.add(app[0]);
            }
            store.setApps(chosen);
        }
        // Checked apps first, then by name.
        apps.sort((a, b) -> {
            boolean ca = chosen.contains(a[0]), cb = chosen.contains(b[0]);
            if (ca != cb) return ca ? -1 : 1;
            return a[1].toLowerCase(Locale.ROOT).compareTo(b[1].toLowerCase(Locale.ROOT));
        });

        for (String[] app : apps) {
            CheckBox box = new CheckBox(this);
            box.setText(app[1]);
            box.setChecked(chosen.contains(app[0]));
            box.setOnCheckedChangeListener((view, checked) -> {
                Set<String> now = store.apps();
                if (checked) now.add(app[0]); else now.remove(app[0]);
                store.setApps(now);
            });
            root.addView(box);
        }
    }

    private TextView title(String s) {
        TextView t = text(s, 18, true);
        t.setPadding(0, dp(24), 0, dp(4));
        return t;
    }

    private TextView text(String s, int sp, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setPadding(0, dp(4), 0, dp(4));
        return t;
    }

    private Button button(String s, View.OnClickListener onClick) {
        Button b = new Button(this);
        b.setText(s);
        b.setAllCaps(false);
        b.setOnClickListener(onClick);
        return b;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
