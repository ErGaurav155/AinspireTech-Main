(function () {
  "use strict";

  class ChatbotWidget {
    constructor(config) {
      this.config = {
        userId: config.userId,
        isAuthorized: config.isAuthorized,
        chatbotName: config.chatbotName,
        apiUrl: config.apiUrl,
        chatbotType: config.chatbotType,
        filename: config.filename,
        primaryColor: config.primaryColor || "#00F0FF",
        position: config.position || "bottom-right",
        welcomeMessage:
          config.welcomeMessage || "Hi! How can I help you today?",
        ...config,
      };

      this.isOpen = false;
      this.conversationId = null;
      this.messageCount = 0;
      this.showAppointmentForm = false;
      this.messages = [];
      this.currentTab = "help";
      this.faqQuestions = [];
      this.isDarkTheme = true;
      this.conversationSaved = false;
      this.formData = null;
      this.appointmentQuestions = [];
      this.activeFAQ = null;

      // Token management
      this.availableTokens = 0;
      this.totalTokensUsed = 0;
      this.lastTokenCheck = null;
      this.isTokenCheckInProgress = false;
      this.showTokenAlert = false;
      this.tokenAlertMessage = "";

      this.init();
    }

    async loadFAQ() {
      try {
        const response = await fetch(`${this.config.apiUrl}/api/embed/faq`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": "your_32byte_encryption_key_here_12345",
          },
          body: JSON.stringify({
            userId: this.config.userId,
            chatbotType: this.config.chatbotType,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        this.faqQuestions = data.faq?.questions || [];

        // Update FAQ display after loading
        this.populateFAQ();
      } catch (error) {
        console.error("Failed to load FAQ:", error);
        this.faqQuestions = [];
        this.populateFAQ();
      }
    }

    async checkTokenBalance() {
      if (this.isTokenCheckInProgress) return;

      try {
        this.isTokenCheckInProgress = true;

        const response = await fetch(
          `${this.config.apiUrl}/api/embed/tokens/balance?userId=${this.config.userId}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": "your_32byte_encryption_key_here_12345",
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            this.availableTokens = data.data.availableTokens || 0;
            this.lastTokenCheck = new Date();

            // Show token alert if tokens are low
            if (this.availableTokens < 1000 && this.availableTokens > 0) {
              this.showTokenAlertMessage(
                "Low tokens remaining. Please purchase more tokens to continue."
              );
            } else if (this.availableTokens <= 0) {
              this.showTokenAlertMessage(
                "Tokens exhausted. Please purchase more tokens to continue."
              );
            } else {
              this.hideTokenAlert();
            }

            // Update token display
            this.updateTokenDisplay();
          }
        }
      } catch (error) {
        console.error("Failed to check token balance:", error);
      } finally {
        this.isTokenCheckInProgress = false;
      }
    }

    showTokenAlertMessage(message) {
      this.showTokenAlert = true;
      this.tokenAlertMessage = message;

      // Update the UI to show token alert
      const unauthorizedDiv = document.querySelector(".chatbot-unauthorized");
      if (unauthorizedDiv && this.config.isAuthorized) {
        unauthorizedDiv.innerHTML = `
          <div class="unauthorized-message">
            <p>${message}</p>
            ${
              this.availableTokens > 0
                ? `
              <div class="token-balance-info">
                <p>Tokens remaining: <strong>${this.availableTokens.toLocaleString()}</strong></p>
              </div>
            `
                : ""
            }
            <a href="https://ainspiretech.com/web/TokenDashboard" target="_blank" class="subscription-link">
              Purchase Tokens
            </a>
            <p class="token-notice">If you're not the website owner, please inform them that chatbot tokens need to be replenished.</p>
          </div>
          <div class="chatbot-footer">
            <a href="https://ainspiretech.com/" target="_blank" class="powered-by">
              Powered by AinspireTech
            </a>
          </div>
        `;
        unauthorizedDiv.style.display = "flex";
      }
    }

    hideTokenAlert() {
      this.showTokenAlert = false;
      this.tokenAlertMessage = "";

      // Hide token alert UI if visible
      const unauthorizedDiv = document.querySelector(".chatbot-unauthorized");
      if (unauthorizedDiv) {
        unauthorizedDiv.style.display = "none";
      }
    }

    async trackTokenUsage(tokensUsed, conversationId = null) {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/embed/tokens/usage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": "your_32byte_encryption_key_here_12345",
            },
            body: JSON.stringify({
              userId: this.config.userId,
              chatbotType: this.config.chatbotType,
              tokensUsed: tokensUsed,
              conversationId: conversationId || this.conversationId,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // Refresh token balance after usage
            await this.checkTokenBalance();
            this.totalTokensUsed += tokensUsed;

            return true;
          }
        }
      } catch (error) {
        console.error("Failed to track token usage:", error);
      }
      return false;
    }

    updateTokenDisplay() {
      // Update token info in the chat if available
      const tokenInfoElement = document.getElementById("token-info");
      if (tokenInfoElement) {
        tokenInfoElement.innerHTML = `
          <div style="font-size: 11px; color: #888; text-align: center; padding: 4px; border-top: 1px solid rgba(0, 240, 255, 0.2);">
            Tokens: ${this.availableTokens.toLocaleString()} remaining
          </div>
        `;
      }
    }

    init() {
      this.createStyles();
      this.createWidget();
      this.bindEvents();

      // Check initial token balance
      if (this.config.isAuthorized) {
        setTimeout(() => this.checkTokenBalance(), 500);
      }

      if (this.config.chatbotType === "chatbot-lead-generation") {
        this.loadAppointmentQuestions();
      }

      // Load FAQ will call populateFAQ when done
      this.loadFAQ();
    }

    createStyles() {
      const styles = `
        .chatbot-widget {
          position: fixed;
          ${
            this.config.position.includes("right")
              ? "right: 20px;"
              : "left: 20px;"
          }
          ${
            this.config.position.includes("bottom")
              ? "bottom: 20px;"
              : "top: 20px;"
          }
          z-index: 10000;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .chatbot-toggle-container {
          position: relative;
          display: flex;
          gap: 10px;
          flex-direction: row;
          align-items: center;
        }

        .chatbot-toggle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, ${
            this.config.primaryColor
          }, #B026FF);
          border: none;
          cursor: pointer;
          box-shadow: 0 0 15px rgba(0, 240, 255, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
          animation: pulse 2s infinite;
        }

        .chatbot-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.7);
        }

        .chatbot-toggle svg {
          width: 24px;
          height: 24px;
          fill: white;
        }

        .welcome-bubble {
          background: transparent;
          color: #00F0FF;
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          backdrop-filter: blur(10px);
          white-space: nowrap;
          opacity: 1;
          transform: translateY(0);
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          z-index: 10001;
          display: block;
          transition: opacity 0.3s ease, transform 0.3s ease;

        }
.welcome-bubble.hidden {
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
}
        .welcome-bubble::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 100%; /* Position at right edge */
  transform: translateY(-50%); /* No horizontal translation needed */
  border: 6px solid transparent;
  border-left-color: rgba(0, 240, 255, 0.3); /* Color the LEFT border */
}

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(0, 240, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0); }
        }

        .chatbot-window {
          position: absolute;
          right: 0px;
          bottom: 70px;
          width: 400px;
          height: 550px;
          background: rgba(10, 10, 10, 0.95);
          border-radius: 16px;
          box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(0, 240, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .chatbot-window.open {
          display: flex;
          animation: slideUp 0.3s ease-out;
        }

        /* Light Theme */
        .chatbot-window.light-theme {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .light-theme .chatbot-header {
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          color: white;
        }

        .light-theme .chatbot-tabs {
          background: rgba(248, 248, 248, 0.9);
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .light-theme .chatbot-tab {
          color: #666;
        }

        .light-theme .chatbot-tab.active {
          color: ${this.config.primaryColor};
          background: rgba(0, 240, 255, 0.1);
        }

        .light-theme .help-content,
        .light-theme .chatbot-messages {
          background: #f8f9fa;
        }

        .light-theme .help-search {
          background: rgba(255, 255, 255, 0.9);
        }

        .light-theme .help-search-input {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .light-theme .help-article {
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.2);
          color: #333;
        }

        .light-theme .faq-answer {
          background: rgba(0, 240, 255, 0.05);
          color: #333;
          border-top: 1px solid rgba(0, 240, 255, 0.1);
        }

        .light-theme .chatbot-input {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .light-theme .powered-by {
          color: #666;
        }

        .light-theme .chatbot-message.bot .chatbot-message-content {
          background: rgba(0, 240, 255, 0.1);
          color: #007bff;
        }

        .light-theme .chatbot-message.user .chatbot-message-content {
          background: rgba(176, 38, 255, 0.1);
          color: #6f42c1;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chatbot-header {
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          padding: 16px 20px;
          color: black;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chatbot-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
        }

        .chatbot-header .icon-container {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
        }

        .chatbot-header .icon-container svg {
          width: 14px;
          height: 14px;
          fill: white;
        }

        .chatbot-header-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .chatbot-header-controls button {
          background: none;
          border: none;
          cursor: pointer;
          color: black;
          transition: color 0.2s;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chatbot-header-controls button:hover {
          color: white;
        }

        .theme-toggle {
          background: none;
          border: none;
          cursor: pointer;
          color: black;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .chatbot-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chatbot-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chatbot-section {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }

        .chatbot-section.active {
          display: flex;
        }

        .chatbot-tabs {
          display: flex;
          background: rgba(26, 26, 26, 0.8);
          border-top: 1px solid rgba(0, 240, 255, 0.2);
        }

        .chatbot-tab {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 14px;
          font-family: monospace;
          transition: all 0.2s;
        }

        .chatbot-tab.active {
          color: #00F0FF;
          background: rgba(0, 240, 255, 0.1);
          border-top: 2px solid #00F0FF;
        }

        .chatbot-tab:hover {
          background: rgba(0, 240, 255, 0.05);
        }

        /* Help Section Styles */
        .help-search {
          padding: 16px;
          background: rgba(26, 26, 26, 0.8);
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        }

        .help-search-input {
          width: 100%;
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 8px;
          padding: 10px 12px;
          color: #e0e0e0;
          font-size: 14px;
          font-family: monospace;
          outline: none;
        }

        .help-search-input:focus {
          outline: 1px solid #00F0FF;
        }

        .help-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: rgba(10, 10, 10, 0.8);
        }

        .help-category {
          margin-bottom: 20px;
        }

        .help-category-title {
          color: #00F0FF;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .help-category-subtitle {
          color: #888;
          font-size: 12px;
          margin-bottom: 16px;
          font-family: monospace;
        }

        .help-articles {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .help-article {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
          color: #00F0FF;
          cursor: pointer;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .help-article:hover {
          background: rgba(0, 240, 255, 0.2);
        }

        .help-article.active {
          background: rgba(0, 240, 255, 0.2);
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }

        .help-article::after {
          content: '▼';
          margin-left: 8px;
          opacity: 0.7;
          font-size: 12px;
          transition: transform 0.2s;
        }

        .help-article.active::after {
          transform: rotate(180deg);
        }

        .faq-answer {
          background: rgba(0, 240, 255, 0.05);
          color: #00F0FF;
          padding: 12px 16px;
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-top: none;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          font-size: 14px;
          line-height: 1.5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Chat Section Styles */
        .chatbot-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: rgba(10, 10, 10, 0.8);
          scrollbar-width: none;
        }

        .chatbot-messages::-webkit-scrollbar {
          display: none;
        }

        .chatbot-message {
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
        }

        .chatbot-message.user {
          justify-content: flex-end;
        }

        .chatbot-message-content {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.4;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          backdrop-filter: blur(5px);
        }

        .chatbot-message.bot .chatbot-message-content {
          background: rgba(0, 240, 255, 0.1);
          color: #00F0FF;
          border-bottom-left-radius: 4px;
        }

        .chatbot-message.user .chatbot-message-content {
          background: rgba(176, 38, 255, 0.1);
          color: #B026FF;
          border-bottom-right-radius: 4px;
        }

        .chatbot-input-area {
          padding: 8px;
          border-top: 1px solid rgba(0, 240, 255, 0.2);
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }

        .chatbot-input-container {
          display: flex;
          gap: 4px;
          align-items: center;
          width: 100%;
        }

        .chatbot-input {
          flex: 1;
          background: rgba(26, 26, 26, 0.8);
          border: none;
          border-radius: 8px;
          padding: 6px 8px;
          color: #e0e0e0;
          font-size: 14px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          resize: none;
          max-height: 100px;
          min-height: 30px;
          outline: none;
        }

        .chatbot-input:focus {
          outline: 1px solid rgba(0, 240, 255, 0.5);
        }

        .chatbot-send {
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .chatbot-send:hover {
          transform: scale(1.05);
          box-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
        }

        .chatbot-send svg {
          width: 18px;
          height: 18px;
          fill: black;
        }

        .chatbot-footer {
          text-align: center;
          width: 100%;
        }

        .powered-by {
          color: #00F0FF;
          font-size: 12px;
          text-decoration: none;
          transition: color 0.2s;
        }

        .powered-by:hover {
          color: #B026FF;
          text-decoration: underline;
        }

        .chatbot-typing {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #888;
          background: transparent;
          font-size: 12px;
          margin-top: 8px;
          padding: 0 16px;
        }

        .chatbot-typing-dots {
          display: flex;
          gap: 2px;
        }

        .chatbot-typing-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: transparent;
          animation: typing 1.4s infinite;
        }

        .chatbot-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .chatbot-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typing {
          0%, 60%, 100% { opacity: 0.3; }
          30% { opacity: 1; }
        }

        /* Unauthorized message styles */
        .chatbot-unauthorized {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 1rem;
          min-height: 50vh;
          overflow-y: auto;
          color: #d1d5db;
          background: rgba(10, 10, 10, 0.8);
        }

        .unauthorized-message {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          padding: 1rem;
          backdrop-filter: blur(5px);
          background: rgba(10, 10, 10, 0.7);
          border-radius: 8px;
          margin: 16px;
        }

        .unauthorized-message p {
          margin-bottom: 1rem;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .token-balance-info {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 8px;
          padding: 8px 12px;
          margin: 12px 0;
          font-size: 14px;
        }

        .token-balance-info strong {
          color: #00F0FF;
          font-weight: 600;
        }

        .token-notice {
          font-size: 11px;
          color: #888;
          margin-top: 12px;
          font-style: italic;
          max-width: 300px;
        }

        .subscription-link {
          padding: 10px 16px;
          margin-top: 1rem;
          text-align: center;
          font-size: 14px;
          background: linear-gradient(to right, #00F0FF, #B026FF);
          color: black;
          border-radius: 8px;
          transition: opacity 0.2s;
          text-decoration: none;
          font-weight: 500;
          border: none;
          cursor: pointer;
        }

        .subscription-link:hover {
          opacity: 0.9;
        }

        /* Appointment form styles */
        .appointment-form {
          background: rgba(26, 26, 26, 0.8);
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
          border: 1px solid rgba(0, 240, 255, 0.3);
          backdrop-filter: blur(5px);
        }

        .appointment-form h4 {
          color: #00F0FF;
          margin: 0 0 16px 0;
          font-size: 16px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          color: #e0e0e0;
          font-size: 12px;
          font-weight: 500;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          background: rgba(10, 10, 10, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 10px 12px;
          color: white;
          font-size: 14px;
          box-sizing: border-box;
          font-family: monospace;
          outline: none;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: 1px solid #00F0FF;
        }

        .form-buttons {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }

        .btn {
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          font-family: monospace;
        }

        .btn-primary {
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          color: black;
          flex: 1;
        }

        .btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-secondary {
          background: transparent;
          color: #888;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        /* Token info styles */
        .token-info {
          position: absolute;
          top: -30px;
          right: 0;
          background: rgba(10, 10, 10, 0.9);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 8px;
          padding: 6px 12px;
          font-size: 11px;
          color: #00F0FF;
          display: none;
        }

        .token-info.visible {
          display: block;
        }

        @media (max-width: 520px) {
  .chatbot-window { width:calc(100vw - 0px); height: calc(100vh - 75px); right: -20px !important; bottom:60px }
  .chatbot-toggle { width: 50px; height: 50px }
  .welcome-bubble { font-size: 12px; padding: 10px 14px }
}
@media (max-width: 720px) and (min-width: 521px) {
  .chatbot-window { width: calc(100vw - 150px); height: calc(100vh - 90px); right: -10px !important; bottom:60px }
  .chatbot-toggle { width: 50px; height: 50px }
  .welcome-bubble { font-size: 12px; padding: 10px 14px }
}
          
      `;

      const styleSheet = document.createElement("style");
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    createWidget() {
      const widget = document.createElement("div");
      widget.className = "chatbot-widget";

      // Create token info element
      const tokenInfoHtml = this.config.isAuthorized
        ? `
        <div class="token-info" id="token-info">
          Checking tokens...
        </div>
      `
        : "";

      widget.innerHTML = `
        <div class="chatbot-toggle-container">
          <div class="welcome-bubble" id="welcome-bubble">Welcome! How can we help?</div>
          <button class="chatbot-toggle" id="chatbot-toggle">
            <svg viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
            </svg>
          </button>
        </div>
        
        <div class="chatbot-window" id="chatbot-window">
          <div class="chatbot-header">
            <h3>
              <span class="icon-container">
                <svg viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </span>
              ${this.config.chatbotName}
            </h3>
            <div class="chatbot-header-controls">
              <button class="theme-toggle" id="theme-toggle" title="Toggle Theme">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>
              </button>
              <button id="chatbot-restart" title="Restart Conversation">
                <svg viewBox="0 0 24 24">
                  <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
                </svg>
              </button>
              <button id="chatbot-close" title="Close Chat">
                <svg viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
              </button>
            </div>
          </div>
          
          ${
            this.config.isAuthorized
              ? `
            <div class="chatbot-body">
              <div class="chatbot-content">
                <!-- Help Section -->
                <div class="chatbot-section help-section active" id="help-section">
                  <div class="help-search">
                    <input type="text" class="help-search-input" placeholder="Search for help">
                  </div>
                  <div class="help-content">
                    <div class="help-category">
                      <div class="help-category-title">${this.config.chatbotName}</div>
                      <div class="help-category-subtitle" id="faq-count">Loading FAQ articles...</div>
                      <div class="help-articles" id="help-articles">
                        <div class="help-article-placeholder">Loading questions...</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <!-- Chat Section -->
                <div class="chatbot-section chat-section" id="chat-section">
                  <div class="chatbot-messages" id="chatbot-messages">
                    <div class="chatbot-message bot">
                      <div class="chatbot-message-content">${this.config.welcomeMessage}</div>
                    </div>
                  </div>
                  
                  <div class="chatbot-typing" id="chatbot-typing" style="display: none;">
                    <div class="chatbot-typing-dots">
                      <div class="chatbot-typing-dot"></div>
                      <div class="chatbot-typing-dot"></div>
                      <div class="chatbot-typing-dot"></div>
                    </div>
                    <span>AI is typing</span>
                  </div>
                  
                  <div class="chatbot-input-area">
                    ${tokenInfoHtml}
                    <div class="chatbot-input-container">
                      <textarea class="chatbot-input" id="chatbot-input" placeholder="Type your message..." rows="1"></textarea>
                      <button class="chatbot-send" id="chatbot-send">
                        <svg viewBox="0 0 24 24">
                          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                      </button>
                    </div>
                    <div class="chatbot-footer">
                      <a href="https://ainspiretech.com/" target="_blank" class="powered-by">
                        Powered by AinspireTech
                      </a>
                    </div>
                  </div>
                </div>
              </div>
              
              <div class="chatbot-tabs">
                <button class="chatbot-tab active" data-tab="help">Help</button>
                <button class="chatbot-tab" data-tab="chat">Chat</button>
              </div>
            </div>
          `
              : `
            <div class="chatbot-unauthorized">
              <div class="unauthorized-message">
                <p>Unauthorized access. Please check your monthly subscription. If you are a user, please notify the owner.</p>
                <a href="https://ainspiretech.com/UserDashboard" class="subscription-link">
                  Check Subscription
                </a>
              </div>
              <div class="chatbot-footer">
                <a href="https://ainspiretech.com/" target="_blank" class="powered-by">
                  Powered by AinspireTech
                </a>
              </div>
            </div>
          `
          }
        </div>
      `;

      document.body.appendChild(widget);
      this.widget = widget;
    }

    populateFAQ() {
      const helpArticles = document.getElementById("help-articles");
      const faqCount = document.getElementById("faq-count");

      if (faqCount) {
        if (this.faqQuestions.length > 0) {
          faqCount.textContent = `${this.faqQuestions.length} articles available`;
        } else {
          faqCount.textContent = "No FAQ articles available";
        }
      }

      if (helpArticles) {
        if (this.faqQuestions.length > 0) {
          helpArticles.innerHTML = this.faqQuestions
            .map(
              (faq, index) => `
                <div class="faq-item">
                  <div class="help-article" data-index="${index}">
                    ${faq.question}
                  </div>
                </div>
              `
            )
            .join("");

          // Re-bind FAQ events
          this.bindFAQEvents();
        } else {
          helpArticles.innerHTML = `
            <div class="help-article-placeholder">
              No FAQ questions available at the moment.
            </div>
          `;
        }
      }
    }

    bindFAQEvents() {
      // Help article clicks
      const helpArticles = document.querySelectorAll(".help-article");
      helpArticles.forEach((article) => {
        article.addEventListener("click", (e) => {
          e.stopPropagation();
          const index = parseInt(article.getAttribute("data-index"));
          this.toggleFAQ(index, article);
        });
      });

      // Help search functionality
      const searchInput = document.querySelector(".help-search-input");
      if (searchInput) {
        searchInput.addEventListener("input", (e) => {
          this.filterFAQ(e.target.value);
        });
      }
    }

    toggleFAQ(index, clickedArticle) {
      const faqItem = clickedArticle.closest(".faq-item");
      const faq = this.faqQuestions[index];

      // Close currently active FAQ if different from clicked one
      if (this.activeFAQ !== null && this.activeFAQ !== index) {
        const currentActive = document.querySelector(
          `.help-article[data-index="${this.activeFAQ}"]`
        );
        if (currentActive) {
          currentActive.classList.remove("active");
          const currentAnswer =
            currentActive.parentNode.querySelector(".faq-answer");
          if (currentAnswer) {
            currentAnswer.remove();
          }
        }
      }

      // Toggle clicked FAQ
      if (clickedArticle.classList.contains("active")) {
        // Close the FAQ
        clickedArticle.classList.remove("active");
        const answerDiv = faqItem.querySelector(".faq-answer");
        if (answerDiv) {
          answerDiv.remove();
        }
        this.activeFAQ = null;
      } else {
        // Open the FAQ
        clickedArticle.classList.add("active");

        // Remove any existing answer
        const existingAnswer = faqItem.querySelector(".faq-answer");
        if (existingAnswer) {
          existingAnswer.remove();
        }

        // Create and insert answer
        const answerDiv = document.createElement("div");
        answerDiv.className = "faq-answer";
        answerDiv.innerHTML = faq.answer;
        faqItem.appendChild(answerDiv);
        this.activeFAQ = index;
      }
    }

    bindEvents() {
      const toggle = document.getElementById("chatbot-toggle");
      const close = document.getElementById("chatbot-close");
      const input = document.getElementById("chatbot-input");
      const send = document.getElementById("chatbot-send");
      const restart = document.getElementById("chatbot-restart");
      const tabs = document.querySelectorAll(".chatbot-tab");
      const themeToggle = document.getElementById("theme-toggle");

      if (toggle) toggle.addEventListener("click", () => this.toggleWidget());
      if (close) close.addEventListener("click", () => this.closeWidget());
      if (send) send.addEventListener("click", () => this.sendMessage());
      if (restart) restart.addEventListener("click", () => this.restartChat());
      if (themeToggle)
        themeToggle.addEventListener("click", () => this.toggleTheme());

      // Tab switching
      if (tabs) {
        tabs.forEach((tab) => {
          tab.addEventListener("click", () => {
            const tabName = tab.getAttribute("data-tab");
            this.switchTab(tabName);
          });
        });
      }

      if (input) {
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });

        input.addEventListener("input", () => {
          input.style.height = "auto";
          input.style.height = Math.min(input.scrollHeight, 100) + "px";
        });
      }

      // Bind FAQ events after a short delay to ensure DOM is ready
      setTimeout(() => {
        this.bindFAQEvents();
      }, 100);
    }

    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      const window = document.getElementById("chatbot-window");
      const themeToggle = document.getElementById("theme-toggle");

      if (this.isDarkTheme) {
        window.classList.remove("light-theme");
        themeToggle.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
          </svg>
        `;
      } else {
        window.classList.add("light-theme");
        themeToggle.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z"/>
          </svg>
        `;
      }
    }

    filterFAQ(searchTerm) {
      const helpArticles = document.querySelectorAll(".faq-item");
      let visibleCount = 0;

      helpArticles.forEach((item) => {
        const article = item.querySelector(".help-article");
        const text = article.textContent.toLowerCase();
        if (text.includes(searchTerm.toLowerCase())) {
          item.style.display = "block";
          visibleCount++;
        } else {
          item.style.display = "none";
        }
      });

      // Update the count display
      const faqCount = document.getElementById("faq-count");
      if (faqCount) {
        if (searchTerm) {
          faqCount.textContent = `${visibleCount} of ${this.faqQuestions.length} articles match your search`;
        } else {
          faqCount.textContent = `${this.faqQuestions.length} articles available`;
        }
      }
    }

    switchTab(tabName) {
      this.currentTab = tabName;

      document.querySelectorAll(".chatbot-tab").forEach((tab) => {
        tab.classList.toggle(
          "active",
          tab.getAttribute("data-tab") === tabName
        );
      });

      document.querySelectorAll(".chatbot-section").forEach((section) => {
        section.classList.toggle("active", section.id === `${tabName}-section`);
      });
    }

    toggleWidget() {
      const window = document.getElementById("chatbot-window");
      const welcomeBubble = document.getElementById("welcome-bubble");

      this.isOpen = !this.isOpen;

      if (this.isOpen) {
        window.classList.add("open");
        // Hide welcome bubble when window opens
        welcomeBubble.style.display = "none";
        this.switchTab("help");

        // Check token balance when opening widget
        if (this.config.isAuthorized) {
          this.checkTokenBalance();
        }
      } else {
        window.classList.remove("open");
        // Show welcome bubble when window closes
        welcomeBubble.style.display = "block";
      }
    }
    closeWidget() {
      const window = document.getElementById("chatbot-window");
      const welcomeBubble = document.getElementById("welcome-bubble");

      window.classList.remove("open");
      this.isOpen = false;
      // Show welcome bubble when window closes
      welcomeBubble.style.display = "block";
    }

    restartChat() {
      this.messages = [];
      const messagesContainer = document.getElementById("chatbot-messages");
      messagesContainer.innerHTML = `
        <div class="chatbot-message bot">
          <div class="chatbot-message-content">${this.config.welcomeMessage}</div>
        </div>
      `;
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendMessage() {
      const input = document.getElementById("chatbot-input");
      const message = input.value.trim();

      if (!message) return;

      // Check token balance before sending
      if (this.availableTokens <= 0) {
        this.showTokenAlertMessage(
          "No tokens remaining. Please purchase more tokens to continue."
        );
        return;
      }

      this.addMessage(message, "user");
      input.value = "";
      input.style.height = "auto";

      this.messageCount++;

      this.showTyping();

      const response = await this.getBotResponse(message);
      this.hideTyping();

      if (response.error === "insufficient_tokens") {
        this.addMessage(
          "I'm unable to process your request due to insufficient tokens. Please purchase more tokens to continue.",
          "bot"
        );
        this.showTokenAlertMessage(
          "Tokens exhausted. Please purchase more tokens to continue."
        );
      } else {
        this.addMessage(response.text, "bot");

        // Track token usage using actual token count from API
        if (response.tokensUsed) {
          await this.trackTokenUsage(response.tokensUsed);
        }
      }

      if (this.config.chatbotType === "chatbot-lead-generation") {
        if (this.messageCount >= 2 && !this.showAppointmentForm) {
          this.showAppointmentForm = true;
          setTimeout(() => {
            this.addAppointmentForm();
          }, 1000);
        }

        if (this.messageCount >= 3) {
          this.saveConversation();
        }
      }
    }

    addMessage(content, type) {
      const messagesContainer = document.getElementById("chatbot-messages");
      const messageDiv = document.createElement("div");
      messageDiv.className = `chatbot-message ${type}`;

      messageDiv.innerHTML = `
        <div class="chatbot-message-content">${content}</div>
      `;

      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      this.messages.push({
        id: Date.now().toString(),
        type,
        content,
        timestamp: new Date(),
      });
    }

    showTyping() {
      const typingIndicator = document.getElementById("chatbot-typing");
      if (typingIndicator) {
        typingIndicator.style.display = "flex";
      }
    }

    hideTyping() {
      const typingIndicator = document.getElementById("chatbot-typing");
      if (typingIndicator) typingIndicator.style.display = "none";
    }

    async getBotResponse(message) {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/embed/chatbot`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": "your_32byte_encryption_key_here_12345",
            },
            body: JSON.stringify({
              userId: this.config.userId,
              agentId: this.config.chatbotType,
              userInput: message,
              fileData: this.config.filename,
            }),
          }
        );

        if (!response.ok) {
          if (response.status === 402) {
            return {
              error: "insufficient_tokens",
              text: "Insufficient tokens",
            };
          }
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        // Extract token usage from response if available
        let tokensUsed = 0;
        if (data.response.tokens) {
          tokensUsed = data.response.tokens || 0;
        }

        return {
          text: data.response.response || "I couldn't process your request.",
          tokensUsed: tokensUsed,
        };
      } catch (error) {
        console.error("Chatbot error:", error);
        return {
          text: "I'm having some technical difficulties. Please try again later.",
        };
      }
    }

    async loadAppointmentQuestions() {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/embed/webQuestion`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": "your_32byte_encryption_key_here_12345",
            },
            body: JSON.stringify({
              userId: this.config.userId,
              chatbotType: this.config.chatbotType,
            }),
          }
        );
        const data = await response.json();
        this.appointmentQuestions = data.appointmentQuestions?.questions || [
          {
            id: 1,
            question: "What is your full name?",
            type: "text",
            required: true,
          },
          {
            id: 2,
            question: "What is your email address?",
            type: "email",
            required: true,
          },
          {
            id: 3,
            question: "What is your phone number?",
            type: "tel",
            required: true,
          },
          {
            id: 4,
            question: "What service are you interested in?",
            type: "select",
            options: ["Consultation", "Service A", "Service B"],
            required: true,
          },
          {
            id: 5,
            question: "Preferred appointment date?",
            type: "date",
            required: true,
          },
        ];
      } catch (error) {
        console.error("Failed to load appointment questions:", error);
        this.appointmentQuestions = [
          {
            id: 1,
            question: "What is your full name?",
            type: "text",
            required: true,
          },
          {
            id: 2,
            question: "What is your email address?",
            type: "email",
            required: true,
          },
          {
            id: 3,
            question: "What is your phone number?",
            type: "tel",
            required: true,
          },
          {
            id: 4,
            question: "What service are you interested in?",
            type: "select",
            options: ["Consultation", "Service A", "Service B"],
            required: true,
          },
          {
            id: 5,
            question: "Preferred appointment date?",
            type: "date",
            required: true,
          },
        ];
      }
    }

    addAppointmentForm() {
      const messagesContainer = document.getElementById("chatbot-messages");
      const formDiv = document.createElement("div");
      formDiv.className = "chatbot-message bot";

      let formFields = "";
      this.appointmentQuestions.forEach((question) => {
        let fieldHtml = "";

        switch (question.type) {
          case "select":
            fieldHtml = `
                  <select id="field-${question.id}" ${
                    question.required ? "required" : ""
                  }>
                    <option value="">Select an option</option>
                    ${
                      question.options
                        ?.map(
                          (option) =>
                            `<option value="${option}">${option}</option>`
                        )
                        .join("") || ""
                    }
                  </select>
                `;
            break;
          case "textarea":
            fieldHtml = `<textarea id="field-${question.id}" ${
              question.required ? "required" : ""
            } rows="3"></textarea>`;
            break;
          default:
            fieldHtml = `<input type="${question.type}" id="field-${
              question.id
            }" ${question.required ? "required" : ""}>`;
        }

        formFields += `
              <div class="form-group">
                <label for="field-${question.id}">${question.question}${
                  question.required ? " *" : ""
                }</label>
                ${fieldHtml}
              </div>
            `;
      });

      formDiv.innerHTML = `
            <div class="chatbot-message-content">
              <div class="appointment-form">
                <h4>📅 Book an Appointment</h4>
                <form id="appointment-form">
                  ${formFields}
                  <div class="form-buttons">
                    <button type="submit" class="btn btn-primary">Submit</button>
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.chatbot-message').remove()">Cancel</button>
                  </div>
                </form>
              </div>
            </div>
          `;

      messagesContainer.appendChild(formDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Bind form submit
      const form = document.getElementById("appointment-form");
      if (form)
        form.addEventListener("submit", (e) => this.submitAppointmentForm(e));
    }

    async submitAppointmentForm(e) {
      e.preventDefault();

      const formData = [];
      this.appointmentQuestions.forEach((question, index) => {
        const field = document.getElementById(`field-${question.id}`);
        if (field) {
          formData[index] = {
            question: question.question,
            answer: field.value,
          };
        }
      });
      try {
        // Save form data to conversation
        this.formData = formData;

        // Show success message
        this.addMessage(
          "Thank you! Your appointment request has been submitted. We'll contact you soon to confirm the details.",
          "bot"
        );

        // Remove form
        const form = e.target.closest(".chatbot-message");
        if (form) form.remove();

        // Save conversation with form data
        await this.saveConversation();
      } catch (error) {
        console.error("Failed to submit appointment form:", error);
        this.addMessage(
          "Sorry, there was an error submitting your appointment. Please try again.",
          "bot"
        );
      }
    }

    async saveConversation() {
      if (this.conversationSaved) return;

      try {
        const conversationData = {
          chatbotType: this.config.chatbotType,
          userId: this.config.userId,
          messages: this.messages,
          formData: this.formData || null,
          customerName:
            this.formData && this.formData[0]
              ? this.formData[0].answer
              : "Anonymous",
          customerEmail:
            this.formData && this.formData[1]
              ? this.formData[1].answer
              : "Anonymous",
          status: this.formData ? "pending" : "active",
        };

        const response = await fetch(
          `${this.config.apiUrl}/api/embed/conversation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": "your_32byte_encryption_key_here_12345",
            },
            body: JSON.stringify(conversationData),
          }
        );

        if (response.ok) {
          const result = await response.json();
          this.conversationId = result.conversationId;
          this.conversationSaved = true;

          // Track token usage for the conversation if available
          if (result.tokenUsage) {
            await this.trackTokenUsage(result.tokenUsage, this.conversationId);
          }
        }
      } catch (error) {
        console.error("Failed to save conversation:", error);
      }
    }
  }

  // Initialize widget when DOM is ready
  function initChatbot() {
    const script =
      document.currentScript ||
      document.querySelector("script[data-chatbot-config]");
    if (!script) return;

    const configAttr = script.getAttribute("data-chatbot-config");
    if (!configAttr) return;

    try {
      const config = JSON.parse(configAttr);
      new ChatbotWidget(config);
    } catch (error) {
      console.error("Failed to initialize chatbot:", error);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initChatbot);
  } else {
    initChatbot();
  }
})();
