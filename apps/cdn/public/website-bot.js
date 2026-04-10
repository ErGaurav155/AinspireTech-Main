/**
 * RocketReplAI Website Bot v2
 * ─────────────────────────────────────────────────────────────────────────────
 * Usage — paste before </body> on any website:
 *
 *   <script src="https://cdn.rocketreplai.com/website-bot.js" defer>
 *     yourClerkUserId,chatbot-lead-generation
 *   </script>
 *
 * The script reads userId and chatbotType from the tag's text content,
 * injects a resizable iframe, and bridges postMessages between the
 * customer's page and the widget.
 *
 * Shareable landing page URL (no script needed):
 *   https://cdn.rocketreplai.com/{userId}/{chatbotType}
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function () {
  "use strict";

  var CDN_ORIGIN = "https://cdn.rocketreplai.com";

  // ── Locate our script tag ────────────────────────────────────────────────
  var currentScript =
    document.currentScript ||
    (function () {
      var all = document.querySelectorAll("script");
      return all[all.length - 1];
    })();

  if (!currentScript) {
    console.warn("[RocketReplAI] Could not locate script tag.");
    return;
  }

  // ── Parse userId,chatbotType from inner text ─────────────────────────────
  var rawContent = (
    currentScript.textContent ||
    currentScript.innerHTML ||
    ""
  ).trim();

  if (!rawContent) {
    console.warn(
      "[RocketReplAI] Script tag must contain: userId,chatbotType\n" +
        '  Example: <script src="...website-bot.js" defer>user_abc,chatbot-lead-generation</script>',
    );
    return;
  }

  var parts = rawContent.split(",");
  if (parts.length < 2) {
    console.warn("[RocketReplAI] Invalid format. Expected: userId,chatbotType");
    return;
  }

  var userId = parts[0].trim();
  var chatbotType = parts[1].trim();

  if (!userId || !chatbotType) {
    console.warn("[RocketReplAI] userId and chatbotType cannot be empty.");
    return;
  }

  // ── Prevent double-init ──────────────────────────────────────────────────
  if (window.__rocketreplai_loaded) return;
  window.__rocketreplai_loaded = true;

  // ── Do not create widget inside another iframe ───────────────────────────
  if (window.self !== window.top) return;

  // ── Build iframe src URL ─────────────────────────────────────────────────
  var embedUrl =
    CDN_ORIGIN +
    "/embed/" +
    encodeURIComponent(userId) +
    "/" +
    encodeURIComponent(chatbotType);

  // ── Create iframe element ─────────────────────────────────────────────────
  var iframe = document.createElement("iframe");
  iframe.id = "rocketreplai-iframe";
  iframe.src = embedUrl;
  iframe.title = "RocketReplAI Chat";
  iframe.setAttribute("frameborder", "0");
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute(
    "sandbox",
    "allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-popups-to-escape-sandbox",
  );

  // ── Initial style: closed bubble ─────────────────────────────────────────
  var s = iframe.style;
  s.position = "fixed";
  s.bottom = "20px";
  s.right = "20px";
  s.width = "68px";
  s.height = "68px";
  s.border = "none";
  s.borderRadius = "50%";
  s.zIndex = "2147483647";
  s.overflow = "hidden";
  s.background = "transparent";
  s.colorScheme = "none";
  s.transition =
    "width 0.3s cubic-bezier(0.4,0,0.2,1)," +
    "height 0.3s cubic-bezier(0.4,0,0.2,1)," +
    "border-radius 0.3s cubic-bezier(0.4,0,0.2,1)," +
    "box-shadow 0.3s ease";
  s.boxShadow = "0 4px 24px rgba(0,0,0,0.15)";

  // ── Inject iframe ────────────────────────────────────────────────────────
  function inject() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", inject);
      return;
    }
    var existing = document.getElementById("rocketreplai-iframe");
    if (existing) existing.remove();
    document.body.appendChild(iframe);
  }
  inject();

  // ── postMessage bridge (parent ↔ widget) ─────────────────────────────────
  window.addEventListener("message", function (event) {
    // Only accept messages from our CDN origin
    if (event.origin !== CDN_ORIGIN) return;

    var d = event.data;
    if (!d || d.source !== "rocketreplai") return;

    switch (d.type) {
      // Widget opened → expand iframe to full chat window
      case "open":
        s.width = "420px";
        s.height = "620px";
        s.borderRadius = "20px";
        s.boxShadow = "0 20px 60px rgba(0,0,0,0.18)";
        break;

      // Widget closed → shrink back to circle button
      case "close":
        s.width = "68px";
        s.height = "68px";
        s.borderRadius = "50%";
        s.boxShadow = "0 4px 24px rgba(0,0,0,0.15)";
        break;

      // Widget is loaded and ready → send page context
      case "ready":
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              source: "rocketreplai-parent",
              type: "context",
              pageUrl: window.location.href,
              pageTitle: document.title,
            },
            CDN_ORIGIN,
          );
        }
        break;

      // Widget asked to navigate in new tab
      case "navigate":
        if (d.url) window.open(d.url, "_blank", "noopener,noreferrer");
        break;
    }
  });

  // ── Public JS API (optional, for manual control) ─────────────────────────
  window.RocketReplAI = {
    /** Programmatically open the chat widget */
    open: function () {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-parent", type: "open" },
          CDN_ORIGIN,
        );
      }
    },
    /** Programmatically close the chat widget */
    close: function () {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-parent", type: "close" },
          CDN_ORIGIN,
        );
      }
    },
  };
})();
