/**
 * RocketReplAI Lead Generation Bot
 * Usage:
 *   <script src="https://cdn.rocketreplai.com/website-bot.js" defer>
 *     userId,chatbot-lead-generation
 *   </script>
 */
(function () {
  "use strict";

  var CDN_ORIGIN = "https://cdn.rocketreplai.com";

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

  var rawContent = (
    currentScript.textContent ||
    currentScript.innerHTML ||
    ""
  ).trim();

  if (!rawContent) {
    console.warn("[RocketReplAI] Script tag must contain: userId,chatbotType");
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

  if (window.__rocketreplai_loaded) return;
  window.__rocketreplai_loaded = true;

  if (window.self !== window.top) return;

  var PROMPT_WIDTH = "276px";
  var PROMPT_HEIGHT = "132px";
  var COMPACT_WIDTH = "60px";
  var COMPACT_HEIGHT = "60px";
  var CLOSED_WIDTH_MOBILE = "260px";
  var CLOSED_HEIGHT_MOBILE = "124px";
  var closedTransition =
    "width 0.3s cubic-bezier(0.4,0,0.2,1)," +
    "height 0.3s cubic-bezier(0.4,0,0.2,1)," +
    "border-radius 0.3s cubic-bezier(0.4,0,0.2,1)," +
    "box-shadow 0.3s ease";

  var embedUrl =
    CDN_ORIGIN +
    "/lead/embed/" +
    encodeURIComponent(userId) +
    "/" +
    encodeURIComponent(chatbotType);

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

  var s = iframe.style;
  s.position = "fixed";
  s.bottom = "20px";
  s.right = "20px";
  s.width = "0";
  s.height = "0";
  s.border = "none";
  s.borderRadius = "0";
  s.zIndex = "2147483647";
  s.overflow = "hidden";
  s.background = "transparent";
  s.colorScheme = "none";
  s.transition = closedTransition;
  s.boxShadow = "none";
  s.opacity = "0";
  s.pointerEvents = "none";

  function applyViewportSize() {
    if (window.innerWidth < 640) {
      s.right = "12px";
      s.bottom = "12px";
      if (!isOpen) applyClosedFrameSize();
    } else {
      s.right = "20px";
      s.bottom = "20px";
      if (!isOpen) applyClosedFrameSize();
    }
  }

  var isOpen = false;
  var closedMode = "hidden";

  function showFrame() {
    s.opacity = "1";
    s.pointerEvents = "auto";
  }

  function applyClosedFrameSize() {
    if (closedMode === "prompt") {
      s.width = window.innerWidth < 640 ? CLOSED_WIDTH_MOBILE : PROMPT_WIDTH;
      s.height = window.innerWidth < 640 ? CLOSED_HEIGHT_MOBILE : PROMPT_HEIGHT;
    } else if (closedMode === "compact") {
      s.width = COMPACT_WIDTH;
      s.height = COMPACT_HEIGHT;
    } else {
      s.width = "0";
      s.height = "0";
    }
  }

  function inject() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", inject);
      return;
    }
    var existing = document.getElementById("rocketreplai-iframe");
    if (existing) existing.remove();
    document.body.appendChild(iframe);
    applyViewportSize();
  }
  inject();

  function openFrame() {
    isOpen = true;
    showFrame();
    s.transition = closedTransition;
    if (window.innerWidth < 640) {
      s.width = "calc(100vw - 24px)";
      s.height = "min(720px, calc(100vh - 24px))";
      s.right = "12px";
      s.bottom = "12px";
    } else {
      s.width = "430px";
      s.height = "690px";
      s.right = "20px";
      s.bottom = "20px";
    }
    s.borderRadius = "24px";
    s.boxShadow = "0 24px 80px rgba(15,23,42,0.24)";
  }

  function closeFrame() {
    isOpen = false;
    s.transition = "none";
    closedMode = "compact";
    showFrame();
    applyClosedFrameSize();
    s.borderRadius = "0";
    s.boxShadow = "none";
    applyViewportSize();
    requestAnimationFrame(function () {
      s.transition = closedTransition;
    });
  }

  window.addEventListener("resize", function () {
    applyViewportSize();
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== CDN_ORIGIN) return;

    var d = event.data;
    if (!d || d.source !== "rocketreplai") return;

    switch (d.type) {
      case "open":
        openFrame();
        break;
      case "close":
        closeFrame();
        break;
      case "closed-prompt":
        isOpen = false;
        closedMode = "prompt";
        showFrame();
        applyClosedFrameSize();
        break;
      case "closed-compact":
        isOpen = false;
        closedMode = "compact";
        showFrame();
        applyClosedFrameSize();
        break;
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
      case "navigate":
        if (d.url) window.open(d.url, "_blank", "noopener,noreferrer");
        break;
    }
  });

  window.RocketReplAI = {
    open: function () {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-parent", type: "open" },
          CDN_ORIGIN,
        );
      }
    },
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
