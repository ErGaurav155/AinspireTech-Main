(function () {
  "use strict";

  var currentScript =
    document.currentScript ||
    (function () {
      var all = document.querySelectorAll("script");
      return all[all.length - 1];
    })();

  if (!currentScript) {
    console.warn("[RocketReplAI MCQ] Could not locate legacy script tag.");
    return;
  }

  var configAttr = currentScript.getAttribute("data-mcq-chatbot");
  if (!configAttr) {
    console.warn(
      "[RocketReplAI MCQ] Missing data-mcq-chatbot config on legacy embed script.",
    );
    return;
  }

  try {
    var config = JSON.parse(configAttr);
    var script = document.createElement("script");
    script.src = "https://cdn.rocketreplai.com/mcq-bot.js";
    script.defer = true;
    script.textContent = [config.userId, config.chatbotType].join(",");
    (document.body || document.head || currentScript.parentNode).appendChild(
      script,
    );
  } catch (error) {
    console.error("[RocketReplAI MCQ] Failed to migrate legacy embed:", error);
  }
})();
