//@line 2 "c:\mozilla-code\mozilla-prism\mozilla\xul-explorer\app\explorer-prefs.js"

pref("toolkit.defaultChromeURI", "chrome://explorer/content/explorer.xul");

/* prefwindow prefs (see: MDC - Preferences System and bug 350528) */
pref("browser.preferences.animateFadeIn", "false");
pref("browser.preferences.instantApply", "false");

/* debugging prefs */
pref("browser.dom.window.dump.enabled", true);
pref("javascript.options.showInConsole", true);
pref("javascript.options.strict", true);
pref("nglayout.debug.disable_xul_cache", true);
pref("nglayout.debug.disable_xul_fastload", true);

/* added to allow <label class="text-links" ... /> to work */
pref("network.protocol-handler.expose.http", false);
pref("network.protocol-handler.warn-external.http", false);

/* extension prefs - turn off extension updating for now */
pref("extensions.update.enabled", false);

/* explorer prefs */
pref("explorer.startup.script", "Window");
pref("explorer.startup.category", "");
pref("explorer.startup.sidebar", "");
pref("explorer.preview.autorefresh", false);
pref("explorer.snippets.user", "");
pref("explorer.manifest.locations", "");
pref("explorer.extension.locations", "");
pref("explorer.application.locations", "");

/* application update prefs */
pref("app.update.channel", "default");
pref("app.update.enabled", true);
pref("app.update.auto", true); // auto download updates
pref("app.update.mode", 1); // prompt for incompatible add-ons
pref("app.update.url", "http://www.starkravingfinkle.org/aus/update/3/%PRODUCT%/%VERSION%/%BUILD_ID%/%BUILD_TARGET%/%LOCALE%/%CHANNEL%/%OS_VERSION%/%DISTRIBUTION%/%DISTRIBUTION_VERSION%/update.xml");
pref("app.update.url.manual", "http://developer.mozilla.org/en/XUL_Explorer");
pref("app.update.url.details", "http://developer.mozilla.org/en/XUL_Explorer");
pref("app.update.interval", 86400); // check once a day
pref("app.update.nagTimer.download", 86400);
pref("app.update.nagTimer.restart", 600);
pref("app.update.timer", 60000); // 1 minute
pref("app.update.showInstalledUI", false); // broken?
