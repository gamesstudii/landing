package com.tankswars.game;

import android.app.Activity;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.MimeTypeMap;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;

public class MainActivity extends Activity {
    private static final String APP_HOST = "appassets.androidplatform.net";
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enterImmersiveMode();

        webView = new WebView(this);
        webView.setBackgroundColor(Color.BLACK);
        webView.setWebViewClient(new LocalAssetClient(getAssets()));

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        setContentView(webView);
        webView.loadUrl("https://" + APP_HOST + "/index.html");
    }

    @Override
    protected void onResume() {
        super.onResume();
        enterImmersiveMode();
        webView.onResume();
    }

    @Override
    protected void onPause() {
        webView.onPause();
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        );
    }

    private static final class LocalAssetClient extends WebViewClient {
        private final AssetManager assets;

        private LocalAssetClient(AssetManager assets) {
            this.assets = assets;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(
            WebView view,
            WebResourceRequest request
        ) {
            Uri uri = request.getUrl();
            if (!APP_HOST.equals(uri.getHost())) {
                return null;
            }

            String encodedPath = uri.getEncodedPath();
            String path = encodedPath == null ? "" : encodedPath.replaceFirst("^/", "");
            try {
                path = URLDecoder.decode(path, "UTF-8");
                if (path.isEmpty()) {
                    path = "index.html";
                }
                InputStream stream = assets.open("www/" + path);
                return new WebResourceResponse(mimeType(path), "UTF-8", stream);
            } catch (IOException error) {
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null, null);
            }
        }

        private static String mimeType(String path) {
            String extension = MimeTypeMap.getFileExtensionFromUrl(path);
            String detected = MimeTypeMap.getSingleton().getMimeTypeFromExtension(extension);
            if (detected != null) {
                return detected;
            }
            if (path.endsWith(".csv")) {
                return "text/csv";
            }
            return "application/octet-stream";
        }
    }
}
