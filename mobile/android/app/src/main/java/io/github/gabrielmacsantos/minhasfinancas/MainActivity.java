package io.github.gabrielmacsantos.minhasfinancas;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(BankNotificationsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
