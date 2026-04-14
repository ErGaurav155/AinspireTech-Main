/**
 * RocketReplAI MCQ/Education Bot
 * Usage:
 *   <script src="https://cdn.rocketreplai.com/mcq-bot.js" defer>
 *     userId,chatbot-education
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
    console.warn("[RocketReplAI MCQ] Could not locate script tag.");
    return;
  }

  var rawContent = (
    currentScript.textContent ||
    currentScript.innerHTML ||
    ""
  ).trim();

  if (!rawContent) {
    console.warn(
      "[RocketReplAI MCQ] Script tag must contain: userId,chatbotType",
    );
    return;
  }

  var parts = rawContent.split(",");
  if (parts.length < 2) {
    console.warn(
      "[RocketReplAI MCQ] Invalid format. Expected: userId,chatbotType",
    );
    return;
  }

  var userId = parts[0].trim();
  var chatbotType = parts[1].trim();

  if (!userId || !chatbotType) {
    console.warn("[RocketReplAI MCQ] userId and chatbotType cannot be empty.");
    return;
  }

  if (window.__rocketreplai_mcq_loaded) return;
  window.__rocketreplai_mcq_loaded = true;

  if (window.self !== window.top) return;

  var embedUrl =
    CDN_ORIGIN +
    "/mcq/embed/" +
    encodeURIComponent(userId) +
    "/" +
    encodeURIComponent(chatbotType);

  var iframe = document.createElement("iframe");
  iframe.id = "rocketreplai-mcq-iframe";
  iframe.src = embedUrl;
  iframe.title = "RocketReplAI MCQ Bot";
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
  s.width = "72px";
  s.height = "72px";
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
  s.boxShadow = "0 8px 30px rgba(15,23,42,0.16)";

  function applyViewportSize() {
    if (window.innerWidth < 640) {
      s.right = "12px";
      s.bottom = "12px";
    }
  }

  function inject() {
    if (!document.body) {
      document.addEventListener("DOMContentLoaded", inject);
      return;
    }
    var existing = document.getElementById("rocketreplai-mcq-iframe");
    if (existing) existing.remove();
    document.body.appendChild(iframe);
    applyViewportSize();
  }
  inject();

  function openFrame() {
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
    s.width = "72px";
    s.height = "72px";
    s.borderRadius = "50%";
    s.boxShadow = "0 8px 30px rgba(15,23,42,0.16)";
    applyViewportSize();
  }

  window.addEventListener("resize", function () {
    applyViewportSize();
  });

  window.addEventListener("message", function (event) {
    if (event.origin !== CDN_ORIGIN) return;

    var d = event.data;
    if (!d || d.source !== "rocketreplai-mcq") return;

    switch (d.type) {
      case "open":
        openFrame();
        break;
      case "close":
        closeFrame();
        break;
      case "ready":
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              source: "rocketreplai-mcq-parent",
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

  window.RocketReplAIMCQ = {
    open: function () {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-mcq-parent", type: "open" },
          CDN_ORIGIN,
        );
      }
    },
    close: function () {
      if (iframe.contentWindow) {
        iframe.contentWindow.postMessage(
          { source: "rocketreplai-mcq-parent", type: "close" },
          CDN_ORIGIN,
        );
      }
    },
  };
})();
