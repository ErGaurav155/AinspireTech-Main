// apps/dashboard/public/chatbotembed.js
// Served by Vercel at: https://app.rocketreplai.com/chatbotembed.js
// Customer installs: <script src="https://app.rocketreplai.com/chatbotembed.js" data-chatbot-id="abc123" async></script>

(function () {
  "use strict";

  // ── Config ─────────────────────────────────────────────────────────────────
  var WIDGET_ORIGIN = "https://app.rocketreplai.com"; // your Vercel dashboard domain
  var WIDGET_PATH = "/embed/chat/"; // new Next.js route (see below)

  // ── Find our script tag ────────────────────────────────────────────────────
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.querySelectorAll("script[data-chatbot-id]");
      return scripts[scripts.length - 1];
    })();

  if (!currentScript) {
    console.warn("[RocketReplAI] Could not find script tag");
    return;
  }

  var chatbotId = currentScript.getAttribute("data-chatbot-id");
  if (!chatbotId) {
    console.warn("[RocketReplAI] data-chatbot-id is missing");
    return;
  }

  // ── Prevent double-init ────────────────────────────────────────────────────
  if (window.__rocketreplai) return;
  window.__rocketreplai = true;

  // ── Create iframe ──────────────────────────────────────────────────────────
  var iframeUrl =
    WIDGET_ORIGIN +
    WIDGET_PATH +
    encodeURIComponent(chatbotId) +
    "?origin=" +
    encodeURIComponent(window.location.href);

  var iframe = document.createElement("iframe");
  iframe.id = "rocketreplai-iframe";
  iframe.src = iframeUrl;
  iframe.title = "Chat Support";
  iframe.setAttribute("aria-label", "Chat support widget");

  // Start as launcher button size (64×64)
  var s = iframe.style;
  s.position = "fixed";
  s.bottom = "20px";
  s.right = "20px";
  s.width = "64px";
  s.height = "64px";
  s.border = "none";
  s.borderRadius = "50%";
  s.zIndex = "2147483647";
  s.overflow = "hidden";
  s.transition = "width 0.3s ease, height 0.3s ease, border-radius 0.3s ease";
  s.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  s.colorScheme = "none";
  s.background = "transparent";

  // ── Wait for body then inject ──────────────────────────────────────────────
  function inject() {
    document.body.appendChild(iframe);
  }
  if (document.body) {
    inject();
  } else {
    document.addEventListener("DOMContentLoaded", inject);
  }

  // ── postMessage bridge ────────────────────────────────────────────────────
  // The iframe can't resize itself — it sends messages to the parent (this script)
  window.addEventListener("message", function (event) {
    if (event.origin !== WIDGET_ORIGIN) return;
    var d = event.data;
    if (!d || d.source !== "rocketreplai-widget") return;

    switch (d.type) {
      case "open":
        s.width = "380px";
        s.height = "580px";
        s.borderRadius = "16px";
        break;

      case "close":
        s.width = "64px";
        s.height = "64px";
        s.borderRadius = "50%";
        break;

      case "ready":
        // Widget loaded — send page context
        iframe.contentWindow &&
          iframe.contentWindow.postMessage(
            {
              source: "rocketreplai-parent",
              type: "context",
              pageTitle: document.title,
              pageUrl: window.location.href,
            },
            WIDGET_ORIGIN,
          );
        break;

      case "navigate":
        if (d.url) window.open(d.url, "_blank", "noopener,noreferrer");
        break;
    }
  });

  // ── Public API ─────────────────────────────────────────────────────────────
  window.RocketReplAI = {
    open: function () {
      iframe.contentWindow &&
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-parent", type: "open" },
          WIDGET_ORIGIN,
        );
    },
    close: function () {
      iframe.contentWindow &&
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-parent", type: "close" },
          WIDGET_ORIGIN,
        );
    },
    // For authenticated apps — pass user identity to personalise chat
    identify: function (user) {
      iframe.contentWindow &&
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-parent", type: "identify", user: user },
          WIDGET_ORIGIN,
        );
    },
  };
})();
