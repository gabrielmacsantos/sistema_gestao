package io.github.gabrielmacsantos.leitor;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.Toast;

/** Invisible screen behind the "movimentações para enviar" notification: opens the site with the queue. */
public class SendActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        sendQueue(this);
        finish();
    }

    /** Opens the queue in the browser and clears it. Returns false when there was nothing to send or no browser. */
    static boolean sendQueue(Context context) {
        Store store = new Store(context);
        String url = store.queueUrl();
        if (url == null) {
            Toast.makeText(context, "Nenhuma movimentação na fila.", Toast.LENGTH_SHORT).show();
            return false;
        }
        if (!open(context, url)) return false;
        store.markSent();
        return true;
    }

    static boolean open(Context context, String url) {
        Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(url)).addCategory(Intent.CATEGORY_BROWSABLE);
        if (!(context instanceof Activity)) view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(view);
            return true;
        } catch (ActivityNotFoundException e) {
            Toast.makeText(context, "Nenhum navegador encontrado para abrir o site.", Toast.LENGTH_LONG).show();
            return false;
        }
    }
}
