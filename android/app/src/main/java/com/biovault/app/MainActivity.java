package com.biovault.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Initialize the bridge and load the web app
        this.getBridge().getWebView().getSettings().setJavaScriptEnabled(true);
        this.getBridge().getWebView().getSettings().setDomStorageEnabled(true);
    }
}
