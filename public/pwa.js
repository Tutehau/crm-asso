/* ============================================================
   pwa.js — Enregistrement du Service Worker + invitation à
   installer l'application (Android/desktop via
   beforeinstallprompt, iOS via instructions manuelles).
   ============================================================ */
(function () {
  "use strict";

  var CONFIG = {
    storageKey: "crm_asso_install_dismissed",
    cookieBannerSelector: "#crm-asso-no-cookie-banner", // pas de bannière cookies dans cette app
    iconSrc: "icons/icon-192.png",
    appName: "le CRM Association",
  };

  /* ---------- Service Worker (installabilité + hors-ligne + màj auto) ---------- */
  function registerSW() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;
    navigator.serviceWorker.register("service-worker.js").catch(function (e) { console.error(e); });
  }

  /* ---------- Invitation à installer ---------- */
  var deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }
  function isIOS() {
    return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }
  function dismissedRecently() {
    try {
      var t = localStorage.getItem(CONFIG.storageKey);
      return t && (Date.now() - Number(t)) < 7 * 24 * 3600 * 1000;
    } catch (e) { return false; }
  }
  function markDismissed() {
    try { localStorage.setItem(CONFIG.storageKey, String(Date.now())); } catch (e) {}
  }

  function maybeShow() {
    if (isStandalone() || dismissedRecently()) return;
    if (document.querySelector(".pwa-install")) return;
    if (document.querySelector(CONFIG.cookieBannerSelector)) return;
    var ios = isIOS();
    if (!deferredPrompt && !ios) return;
    build(ios);
  }

  function scheduleShow() {
    var tries = 0;
    (function attempt() {
      if (document.querySelector(".pwa-install") || isStandalone() || dismissedRecently()) return;
      if (!document.querySelector(CONFIG.cookieBannerSelector)) {
        maybeShow();
        return;
      }
      if (++tries > 30) return;
      setTimeout(attempt, 1500);
    })();
  }

  function build(ios) {
    var banner = document.createElement("div");
    banner.className = "pwa-install";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Installer " + CONFIG.appName);

    var inner = document.createElement("div");
    inner.className = "pwa-install-inner";

    var icon = document.createElement("img");
    icon.className = "pwa-install-icon";
    icon.src = CONFIG.iconSrc;
    icon.alt = "";
    icon.width = 52; icon.height = 52;

    var body = document.createElement("div");
    body.className = "pwa-install-body";
    var title = document.createElement("strong");
    title.textContent = "Installer l'application";
    var sub = document.createElement("span");
    sub.textContent = ios
      ? "Appuyez sur Partager, puis « Sur l'écran d'accueil »."
      : "Accès rapide et hors-ligne, sur votre écran d'accueil.";
    body.appendChild(title); body.appendChild(sub);

    var actions = document.createElement("div");
    actions.className = "pwa-install-actions";

    if (!ios) {
      var go = document.createElement("button");
      go.type = "button";
      go.className = "pwa-install-go";
      go.textContent = "Installer";
      go.addEventListener("click", function () {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        var p = deferredPrompt.userChoice;
        if (p && p.then) { p.then(function () {}).catch(function () {}); }
        deferredPrompt = null;
        close(false);
      });
      actions.appendChild(go);
    }

    var closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = "pwa-install-close";
    closeBtn.setAttribute("aria-label", "Fermer");
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", function () { close(true); });
    actions.appendChild(closeBtn);

    inner.appendChild(icon); inner.appendChild(body); inner.appendChild(actions);
    banner.appendChild(inner);
    document.body.appendChild(banner);

    requestAnimationFrame(function () { banner.classList.add("is-visible"); });

    function close(dismissed) {
      if (dismissed) markDismissed();
      banner.classList.remove("is-visible");
      setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 400);
    }
  }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferredPrompt = e;
    scheduleShow();
  });
  window.addEventListener("appinstalled", function () {
    var el = document.querySelector(".pwa-install");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    deferredPrompt = null;
  });

  function init() {
    registerSW();
    setTimeout(scheduleShow, 1500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
