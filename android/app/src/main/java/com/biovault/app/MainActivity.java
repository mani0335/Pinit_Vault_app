package com.biovault.app;

import android.os.Bundle;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
	@Override
	public void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);

		try {
			// Request runtime CAMERA permission if not already granted
			if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
				ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.CAMERA}, 1001);
			}

			// Attempt to access the underlying Android WebView and grant permission
			WebView webView = this.bridge.getWebView();
			if (webView != null) {
				webView.setWebChromeClient(new WebChromeClient() {
					@Override
					public void onPermissionRequest(final PermissionRequest request) {
						// Grant requested resources (camera, microphone) for the WebView origin
						try {
							request.grant(request.getResources());
						} catch (Exception e) {
							// ignore any grant failures
						}
					}
				});
			}
		} catch (Exception e) {
			// If anything fails, do not crash — Capacitor will continue to function
		}
	}
}
