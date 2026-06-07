package com.ultra.cardbattle;

import android.Manifest;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * 奥特曼卡片大战 - 主Activity
 *
 * 核心特性：
 * 1. WebView 容器加载本地 HTML5 游戏
 * 2. 完整的摄像头权限处理（onPermissionRequest）
 * 3. ✅ 动态更新机制：从远程服务器拉取新版本游戏文件，无需重新打包 APK
 *
 * 动态更新流程：
 *   APK 打包 → 安装到手机 → 启动时检查版本号 → 如服务器有新版本
 *   → 下载新的 index.html + CSS/JS → 存入本地缓存 → WebView 加载新版
 *
 * 这样，在 Trae 中修改代码后 → 上传到更新服务器（或内网HTTP服务）→
 * 手机用户重启游戏即自动更新，无需重新下载 APK。
 */
public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ProgressBar progressBar;
    private static final int REQUEST_CAMERA_PERMISSION = 1001;
    private PermissionRequest pendingPermissionRequest;

    // ============ 动态更新配置（在此修改即可） ============

    /** 更新服务器地址（指向游戏文件根目录）
     *  - Vercel / GitHub Pages / 任何静态托管都可以
     *  - 首次部署 Vercel 后得到的地址例如：https://cardfight.vercel.app
     *  - 然后在游戏代码中修改 CSS/JS，更新 version.txt 中的版本号即可
     *  - 手机端重新打开游戏时会自动下载新版本，无需重新安装 APK
     */
    private static final String UPDATE_BASE_URL = "https://cardfight.vercel.app";

    /** 是否启用远程更新（true=优先从远程加载新内容，false=仅用本地 assets） */
    private static final boolean ENABLE_REMOTE_UPDATE = true;

    /** 远程版本检查文件（一个纯文本文件，内容为版本号，如 "1.0.1"） */
    private static final String REMOTE_VERSION_FILE = "version.txt";

    /** 本地缓存目录名 */
    private static final String LOCAL_CACHE_DIR = "ultra_battle_cache";

    /** SharedPreferences 存储名 */
    private static final String PREFS_NAME = "ultra_battle_prefs";
    private static final String KEY_LOCAL_VERSION = "local_version";

    private SharedPreferences prefs;

    // =====================================================

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ✅ 沉浸式全屏
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            getWindow().getDecorView().setSystemUiVisibility(
                android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                    | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        }

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        // 构建布局
        RelativeLayout layout = new RelativeLayout(this);
        layout.setBackgroundColor(0xFF0A0A1A);

        // 进度条（更新/加载时显示）
        progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleLarge);
        RelativeLayout.LayoutParams pbParams = new RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.WRAP_CONTENT,
            RelativeLayout.LayoutParams.WRAP_CONTENT);
        pbParams.addRule(RelativeLayout.CENTER_IN_PARENT);
        progressBar.setVisibility(android.view.View.GONE);
        layout.addView(progressBar, pbParams);

        // WebView
        webView = new WebView(this);
        RelativeLayout.LayoutParams wvParams = new RelativeLayout.LayoutParams(
            RelativeLayout.LayoutParams.MATCH_PARENT,
            RelativeLayout.LayoutParams.MATCH_PARENT);
        layout.addView(webView, wvParams);

        setContentView(layout);

        setupWebView();

        // ✅ 启动时检查更新，然后加载页面
        if (ENABLE_REMOTE_UPDATE) {
            checkAndApplyUpdate();
        } else {
            loadGameFromAssets();
        }

        // ✅ 主动请求摄像头权限（用户进入扫描页时也会再次请求）
        requestCameraPermissionIfNeeded();
    }

    // ============ WebView 配置 ============

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setTextZoom(100);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // 允许调试（发布版可关闭）
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            WebView.setWebContentsDebuggingEnabled(true);
        }

        // 页面内跳转不打开外部浏览器
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                view.loadUrl(request.getUrl().toString());
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                progressBar.setVisibility(android.view.View.GONE);
            }
        });

        // ✅ 关键：处理 getUserMedia 摄像头权限请求
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    pendingPermissionRequest = request;

                    // 检查系统级摄像头权限
                    boolean hasCamera = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.CAMERA)
                            == PackageManager.PERMISSION_GRANTED;
                    boolean hasAudio = ContextCompat.checkSelfPermission(
                        MainActivity.this, Manifest.permission.RECORD_AUDIO)
                            == PackageManager.PERMISSION_GRANTED;

                    if (hasCamera && hasAudio) {
                        // 已有权限，直接授予 WebView
                        request.grant(request.getResources());
                        pendingPermissionRequest = null;
                    } else {
                        // 向用户请求权限
                        ActivityCompat.requestPermissions(MainActivity.this,
                            new String[]{
                                Manifest.permission.CAMERA,
                                Manifest.permission.RECORD_AUDIO
                            },
                            REQUEST_CAMERA_PERMISSION);
                    }
                }
            }

            @Override
            public void onPermissionRequestCanceled(PermissionRequest request) {
                super.onPermissionRequestCanceled(request);
                if (pendingPermissionRequest != null &&
                        pendingPermissionRequest.getOrigin().equals(request.getOrigin())) {
                    pendingPermissionRequest = null;
                }
            }
        });
    }

    // ============ 权限请求处理 ============

    private void requestCameraPermissionIfNeeded() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this,
                new String[]{
                    Manifest.permission.CAMERA,
                    Manifest.permission.RECORD_AUDIO
                },
                REQUEST_CAMERA_PERMISSION);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode,
                                           @NonNull String[] permissions,
                                           @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == REQUEST_CAMERA_PERMISSION) {
            boolean granted = grantResults.length > 0
                && grantResults[0] == PackageManager.PERMISSION_GRANTED;

            if (granted && pendingPermissionRequest != null
                    && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                // ✅ 用户授予权限，授予给 WebView
                pendingPermissionRequest.grant(pendingPermissionRequest.getResources());
                pendingPermissionRequest = null;
                // 重新加载，确保摄像头初始化链完整
                webView.reload();
            } else if (pendingPermissionRequest != null
                    && Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                // 用户拒绝，deny
                pendingPermissionRequest.deny();
                pendingPermissionRequest = null;
            }
        }
    }

    // ============ 动态更新机制 ============

    /**
     * 检查远程版本号，如比本地新，则下载新文件到缓存目录
     * 然后从缓存目录加载游戏
     */
    private void checkAndApplyUpdate() {
        progressBar.setVisibility(android.view.View.VISIBLE);

        new Thread(() -> {
            try {
                // 1. 读取远程版本号
                String remoteVersion = fetchRemoteVersion();
                String localVersion = prefs.getString(KEY_LOCAL_VERSION, "0");

                // 2. 版本比较（简单字符串比较，建议用数字版本号如 1.0.0）
                boolean needUpdate = !localVersion.equals(remoteVersion)
                    && remoteVersion != null && !remoteVersion.trim().isEmpty();

                if (needUpdate) {
                    // 3. 下载新游戏文件到本地缓存
                    downloadGameFiles();
                    prefs.edit().putString(KEY_LOCAL_VERSION, remoteVersion).apply();
                }

                // 4. 加载游戏
                runOnUiThread(() -> {
                    File cacheDir = new File(getFilesDir(), LOCAL_CACHE_DIR);
                    File index = new File(cacheDir, "index.html");
                    if (index.exists()) {
                        // 有缓存，从缓存加载
                        webView.loadUrl("file://" + index.getAbsolutePath());
                    } else {
                        // 无缓存（首次启动、或下载失败），从 assets 加载内置版本
                        loadGameFromAssets();
                    }
                });

            } catch (Exception e) {
                e.printStackTrace();
                // 更新失败，fallback 到本地 assets
                runOnUiThread(this::loadGameFromAssets);
            }
        }).start();
    }

    /** 从远程 HTTP 服务器读取 version.txt */
    private String fetchRemoteVersion() {
        HttpURLConnection conn = null;
        try {
            URL url = new URL(UPDATE_BASE_URL + "/" + REMOTE_VERSION_FILE);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestMethod("GET");

            int code = conn.getResponseCode();
            if (code != 200) return null;

            BufferedReader reader = new BufferedReader(
                new InputStreamReader(conn.getInputStream()));
            String line = reader.readLine();
            reader.close();
            return line != null ? line.trim() : null;
        } catch (Exception e) {
            return null;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    /**
     * 下载远程游戏文件到本地缓存目录。
     * 递归下载以下文件列表（可按需扩展）：
     *   index.html, css/style.css, js/*.js, data/*.js
     *
     * 实现方式：逐个文件下载，简单直接。
     */
    private void downloadGameFiles() {
        // 需要下载的文件列表（和您在 /workspace/ 中的文件结构一致）
        String[] files = new String[] {
            "index.html",
            "css/style.css",
            "js/animation.js",
            "js/app.js",
            "js/battle.js",
            "js/audio.js",
            "data/cards.js"
        };

        File cacheDir = new File(getFilesDir(), LOCAL_CACHE_DIR);
        cacheDir.mkdirs();

        // 子目录也要创建
        new File(cacheDir, "css").mkdirs();
        new File(cacheDir, "js").mkdirs();
        new File(cacheDir, "data").mkdirs();

        for (String path : files) {
            try {
                downloadFile(UPDATE_BASE_URL + "/" + path,
                    new File(cacheDir, path));
            } catch (Exception e) {
                // 某个文件失败不影响其他
                e.printStackTrace();
            }
        }
    }

    /** 单个文件下载 */
    private void downloadFile(String remoteUrl, File localFile) throws Exception {
        HttpURLConnection conn = null;
        InputStream in = null;
        FileOutputStream out = null;
        try {
            URL url = new URL(remoteUrl);
            conn = (HttpURLConnection) url.openConnection();
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(15000);
            conn.setRequestMethod("GET");

            int code = conn.getResponseCode();
            if (code != 200) return;

            in = conn.getInputStream();
            out = new FileOutputStream(localFile);
            byte[] buffer = new byte[8192];
            int n;
            while ((n = in.read(buffer)) != -1) {
                out.write(buffer, 0, n);
            }
            out.flush();
        } finally {
            if (in != null) try { in.close(); } catch (Exception ignored) {}
            if (out != null) try { out.close(); } catch (Exception ignored) {}
            if (conn != null) conn.disconnect();
        }
    }

    /** 从内置 assets 目录加载游戏（作为 fallback，或远程更新不可用时） */
    private void loadGameFromAssets() {
        // 检查 assets/www/index.html 是否存在
        // 注意：WebView 支持直接加载 file:///android_asset/... URL
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    // ============ 生命周期 ============

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            // 沉浸式
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
                getWindow().getDecorView().setSystemUiVisibility(
                    android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | android.view.View.SYSTEM_UI_FLAG_FULLSCREEN
                        | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
            }
        }
    }

    @Override
    protected void onPause() {
        if (webView != null) webView.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.removeAllViews();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
