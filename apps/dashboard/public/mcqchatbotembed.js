(function () {
  "use strict";

  class EnhancedMcqChatbotWidget {
    constructor(config) {
      this.config = {
        userId: config.userId,
        isAuthorized: config.isAuthorized,
        chatbotName: config.chatbotName,
        apiUrl: config.apiUrl,
        chatbotType: config.chatbotType,
        primaryColor: config.primaryColor || "#143796",
        position: config.position || "bottom-right",
        welcomeMessage: config.welcomeMessage || "Hello! How can I help you?",
        ...config,
      };

      this.isOpen = false;
      this.currentTab = "mcq";
      this.messages = [
        {
          sender: "AI Bot",
          text: "Hello, cosmic traveler! I am your AI assistant. How can I help you navigate our services today?",
        },
        { sender: "You", text: "What services did you provide?" },
      ];
      this.quizData = null;
      this.selectedAnswers = [];
      this.isQuizSubmitted = false;
      this.score = 0;
      this.isLoading = false;
      this.isSending = false;
      this.faqQuestions = [];
      this.activeFAQ = null;
      this.isTyping = false;

      // Token management
      this.availableTokens = 0;
      this.totalTokensUsed = 0;
      this.lastTokenCheck = null;
      this.isTokenCheckInProgress = false;
      this.showTokenAlert = false;
      this.tokenAlertMessage = "";
      this.isDarkTheme = true;

      this.init();
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
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            this.availableTokens = data.data.availableTokens || 0;
            this.lastTokenCheck = new Date();

            // Show token alert if tokens are low
            if (this.availableTokens < 1000 && this.availableTokens > 0) {
              this.showTokenAlertMessage(
                "Low tokens remaining. Please purchase more tokens to continue.",
              );
            } else if (this.availableTokens <= 0) {
              this.showTokenAlertMessage(
                "Tokens exhausted. Please purchase more tokens to continue.",
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
      const unauthorizedDiv = document.querySelector(".mcq-unauthorized");
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
          <div class="mcq-footer">
            <a href="https://ainspiretech.com/" target="_blank" class="powered-by">
              Powered by AinspireTech
            </a>
          </div>
        `;
      }
    }

    hideTokenAlert() {
      this.showTokenAlert = false;
      this.tokenAlertMessage = "";

      // Restore original unauthorized message if needed
      if (!this.config.isAuthorized) {
        const unauthorizedDiv = document.querySelector(".mcq-unauthorized");
        if (unauthorizedDiv) {
          unauthorizedDiv.innerHTML = `
            <p>Unauthorized access. Please check your monthly subscription. If you are a user, please contact the owner.</p>
            <a href="https://ainspiretech.com/UserDashboard" target="_blank">Check Subscription</a>
          `;
        }
      }
    }

    async trackTokenUsage(tokensUsed) {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/embed/tokens/usage?userId=${this.config.userId}`,
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
            }),
          },
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
        this.populateFAQ();
      } catch (error) {
        console.error("Failed to load FAQ:", error);
        this.faqQuestions = [];
        this.populateFAQ();
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

      this.loadFAQ();
    }

    createStyles() {
      const styles = `
        .mcq-chatbot-widget {
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

        .mcq-toggle-container {
          position: relative;
          display: flex;
          gap: 10px;
          flex-direction: row;
          align-items: center;
        }

        .mcq-toggle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .mcq-toggle:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 25px rgba(0, 0, 0, 0.4);
        }

        .mcq-toggle::before {
          content: '';
          position: absolute;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background: inherit;
          animation: pulse 2s infinite;
          z-index: -1;
        }

        .welcome-bubble {
          background: transparent;
          color: #00F0FF;
          padding: 8px 10px;
          border-radius: 12px;
          font-size: 14px;
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
          left: 100%;
          transform: translateY(-50%);
          border: 6px solid transparent;
          border-left-color: rgba(0, 240, 255, 0.3);
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(0, 240, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 240, 255, 0); }
        }

        .mcq-window {
          position: absolute;
          right: 0;
          bottom: 45px;
          width: 400px;
          height: calc(100vh - 90px);
          background: rgba(10, 10, 10, 0.95);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          display: none;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(0, 240, 255, 0.3);
          backdrop-filter: blur(10px);
        }

        .mcq-window.open {
          display: flex;
          animation: slideUp 0.3s ease-out;
        }

        /* Light Theme */
        .mcq-window.light-theme {
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        .light-theme .mcq-header {
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          color: white;
        }

        .light-theme .mcq-tabs {
          background: rgba(248, 248, 248, 0.9);
          border-top: 1px solid rgba(0, 0, 0, 0.1);
        }

        .light-theme .mcq-tab {
          color: #666;
        }

        .light-theme .mcq-tab.active {
          color: ${this.config.primaryColor};
          background: rgba(0, 240, 255, 0.1);
        }

        .light-theme .mcq-content,
        .light-theme .chat-messages,
        .light-theme .faq-content {
          background: #f8f9fa;
        }

        .light-theme .faq-search-input {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .light-theme .faq-article {
          background: rgba(0, 240, 255, 0.08);
          border: 1px solid rgba(0, 240, 255, 0.2);
          color: #333;
        }

        .light-theme .faq-answer {
          background: rgba(0, 240, 255, 0.05);
          color: #333;
          border-top: 1px solid rgba(0, 240, 255, 0.1);
        }

        .light-theme .chat-input {
          background: rgba(255, 255, 255, 0.9);
          color: #333;
          border: 1px solid rgba(0, 0, 0, 0.1);
        }

        .light-theme .powered-by {
          color: #666;
        }

        .light-theme .chat-message.bot .chat-message-content {
          background: rgba(0, 240, 255, 0.1);
          color: #007bff;
        }

        .light-theme .chat-message.user .chat-message-content {
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

        .mcq-header {
          height: 56px;
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          color: #000;
        }

        .mcq-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
        }

        .mcq-header-icon {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mcq-header-icon svg {
          width: 16px;
          height: 16px;
          fill: white;
        }

        .mcq-header-controls {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .mcq-header-button {
          background: transparent;
          border: none;
          color: #000;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
          width: 24px;
          height: 24px;
        }

        .mcq-header-button:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .theme-toggle {
          background: none;
          border: none;
          cursor: pointer;
          color: #000;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .mcq-tabs {
          display: flex;
          background: rgba(26, 26, 26, 0.8);
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        }

        .mcq-tab {
          flex: 1;
          padding: 12px;
          background: none;
          border: none;
          color: #888;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          position: relative;
        }

        .mcq-tab.active {
          color: #00F0FF;
          background: rgba(0, 240, 255, 0.1);
        }

        .mcq-tab.active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: #00F0FF;
        }

        .mcq-tab:hover {
          background: rgba(0, 240, 255, 0.05);
        }

        .mcq-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mcq-section {
          flex: 1;
          display: none;
          flex-direction: column;
          overflow: hidden;
        }

        .mcq-section.active {
          display: flex;
        }

        /* FAQ Section */
        .faq-search {
          padding: 16px;
          background: rgba(26, 26, 26, 0.8);
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        }

        .faq-search-input {
          width: 100%;
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 8px;
          padding: 10px 12px;
          color: #e0e0e0;
          font-size: 14px;
          outline: none;
        }

        .faq-content {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: rgba(10, 10, 10, 0.8);
          scrollbar-width: none;
        }

        .faq-content::-webkit-scrollbar {
          display: none;
        }

        .faq-category-title {
          color: #00F0FF;
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .faq-category-subtitle {
          color: #888;
          font-size: 12px;
          margin-bottom: 16px;
        }

        .faq-articles {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .faq-item {
          margin-bottom: 8px;
        }

        .faq-article {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-radius: 8px;
          padding: 12px;
          color: #00F0FF;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .faq-article:hover {
          background: rgba(0, 240, 255, 0.2);
        }

        .faq-article.active {
          background: rgba(0, 240, 255, 0.2);
          border-bottom-left-radius: 0;
          border-bottom-right-radius: 0;
        }

        .faq-article::after {
          content: '▼';
          margin-left: 8px;
          opacity: 0.7;
          font-size: 12px;
          transition: transform 0.2s;
        }

        .faq-article.active::after {
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
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Chat Section */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: rgba(10, 10, 10, 0.8);
          scrollbar-width: none;
          background-image: url("https://readdy.ai/api/search-image?query=deep%20space%20starfield%20with%20distant%20stars%20and%20subtle%20nebula%2C%20dark%20cosmic%20background%20with%20tiny%20stars%2C%20perfect%20for%20chat%20background&width=320&height=300&seq=chatbg&orientation=squarish");
          background-size: cover;
          background-position: center;
        }

        .chat-messages::-webkit-scrollbar {
          display: none;
        }

        .chat-message {
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
        }

        .chat-message.user {
          justify-content: flex-end;
        }

        .chat-message-content {
          max-width: 85%;
          padding: 12px 16px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.4;
          backdrop-filter: blur(5px);
        }

        .chat-message.bot .chat-message-content {
          background: rgba(0, 240, 255, 0.1);
          color: #00F0FF;
          border: 1px solid rgba(0, 240, 255, 0.3);
          border-bottom-left-radius: 4px;
        }

        .chat-message.user .chat-message-content {
          background: rgba(176, 38, 255, 0.1);
          color: #B026FF;
          border: 1px solid rgba(176, 38, 255, 0.3);
          border-bottom-right-radius: 4px;
        }

        .chat-input-area {
          padding: 12px;
          background: rgba(10, 10, 10, 0.8);
          border-top: 1px solid rgba(0, 240, 255, 0.2);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-input-container {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .chat-input {
          flex: 1;
          background: rgba(26, 26, 26, 0.8);
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 20px;
          padding: 12px 16px;
          color: #f0f0f0;
          font-size: 14px;
          resize: none;
          outline: none;
          max-height: 100px;
          min-height: 40px;
        }

        .chat-input:focus {
          border-color: rgba(0, 240, 255, 0.5);
        }

        .chat-send {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .chat-send:hover {
          transform: scale(1.05);
        }

        .chat-send svg {
          width: 16px;
          height: 16px;
          fill: #000;
        }

        /* MCQ Section */
        .mcq-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .mcq-form {
          padding: 16px;
          background: rgba(26, 26, 26, 0.8);
          border-bottom: 1px solid rgba(0, 240, 255, 0.2);
        }

        .mcq-form p {
          font-size: 14px;
          font-weight: 500;
          color: #00F0FF;
          margin-bottom: 12px;
        }

        .mcq-form input,
        .mcq-form textarea {
          width: 100%;
          padding: 12px;
          margin-bottom: 12px;
          border: 1px solid rgba(0, 240, 255, 0.2);
          border-radius: 8px;
          font-size: 14px;
          background: rgba(10, 10, 10, 0.8);
          color: #f0f0f0;
          outline: none;
        }

        .mcq-form textarea {
          min-height: 80px;
          resize: vertical;
        }

        .mcq-form button {
          width: 100%;
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          color: #000;
          border: none;
          border-radius: 8px;
          padding: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .mcq-form button:hover {
          opacity: 0.9;
        }

        .mcq-questions-container {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          background: rgba(10, 10, 10, 0.8);
        }

        .mcq-question {
          margin-bottom: 20px;
          padding: 16px;
          background: rgba(26, 26, 26, 0.8);
          border-radius: 8px;
          border: 1px solid rgba(0, 240, 255, 0.2);
        }

        .mcq-question h3 {
          font-size: 15px;
          font-weight: 500;
          margin-bottom: 12px;
          color: #f0f0f0;
        }

        .mcq-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .mcq-option {
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(10, 10, 10, 0.5);
          color: #f0f0f0;
        }

        .mcq-option:hover {
          border-color: rgba(0, 240, 255, 0.5);
        }

        .mcq-option.selected {
          background: rgba(0, 240, 255, 0.1);
          border-color: #00F0FF;
          color: #00F0FF;
        }

        .mcq-option.correct {
          background: rgba(76, 175, 80, 0.1);
          border-color: #4CAF50;
          color: #4CAF50;
        }

        .mcq-option.incorrect {
          background: rgba(244, 67, 54, 0.1);
          border-color: #F44336;
          color: #F44336;
        }

        .mcq-explanation {
          margin-top: 12px;
          padding: 12px;
          background: rgba(26, 26, 26, 0.8);
          border-radius: 8px;
          font-size: 13px;
          color: #f0f0f0;
          border: 1px solid rgba(0, 240, 255, 0.2);
        }

        .mcq-quiz-controls {
          padding: 16px;
          text-align: center;
          background: rgba(10, 10, 10, 0.8);
          border-top: 1px solid rgba(0, 240, 255, 0.2);
        }

        .mcq-quiz-btn {
          background: linear-gradient(to right, ${
            this.config.primaryColor
          }, #B026FF);
          color: #000;
          border: none;
          border-radius: 20px;
          padding: 12px 24px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: opacity 0.3s;
        }

        .mcq-quiz-btn:hover {
          opacity: 0.9;
        }

        .mcq-score {
          background: rgba(26, 26, 26, 0.8);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 16px;
          border: 1px solid rgba(0, 240, 255, 0.2);
        }

        .mcq-score h3 {
          font-size: 18px;
          margin-bottom: 12px;
          color: #00F0FF;
        }

        /* Token info styles */
        .token-info {
          font-size: 11px;
          color: #888;
          text-align: center;
          padding: 4px;
          border-top: 1px solid rgba(0, 240, 255, 0.2);
          background: rgba(10, 10, 10, 0.9);
        }

        /* Unauthorized message styles */
        .mcq-unauthorized {
          display: flex;
          flex-direction: column;
          flex: 1;
          justify-content: center;
          align-items: center;
          padding: 40px 20px;
          color: #f0f0f0;
          text-align: center;
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

        /* Typing Indicator */
        .chatbot-typing {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #888;
          font-size: 14px;
          padding: 8px 16px;
          background: rgba(10, 10, 10, 0.8);
          border-top: 1px solid rgba(0, 240, 255, 0.2);
        }

        .chatbot-typing-dots {
          display: flex;
          gap: 4px;
        }

        .chatbot-typing-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #00F0FF;
          animation: typing 1.4s infinite;
        }

        .chatbot-typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .chatbot-typing-dot:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typing {
          0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
          30% { opacity: 1; transform: translateY(-2px); }
        }

        /* Footer */
        .mcq-footer {
          padding: 8px;
          text-align: center;
          background: rgba(10, 10, 10, 0.8);
          border-top: 1px solid rgba(0, 240, 255, 0.2);
        }

        .powered-by {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          text-decoration: none;
          transition: color 0.3s;
        }

        .powered-by:hover {
          color: #00F0FF;
        }

        /* Message formatting */
        .chat-message-content a,
        .mcq-question a {
          color: inherit;
          text-decoration: underline;
          word-break: break-all;
        }

        .chat-message-content a:hover,
        .mcq-question a:hover {
          opacity: 0.8;
        }

        /* Responsive */
        @media (max-width: 480px) {
          .mcq-window {
            width: calc(100vw - 10px);
            height: 85vh;
            right: 0px !important;
            bottom:45px;
          }
          
          .mcq-chatbot-widget {
            ${
              this.config.position.includes("right")
                ? "right: 10px;"
                : "left: 10px;"
            }
            ${
              this.config.position.includes("bottom")
                ? "bottom: 10px;"
                : "top: 10px;"
            }
          }
        }

        @media (max-width: 768px) and (min-width: 481px) {
          .mcq-window {
            width: calc(100vw - 150px); height: calc(100vh - 90px); right: -10px !important; bottom:45px 
          }
        }
      `;

      const styleSheet = document.createElement("style");
      styleSheet.textContent = styles;
      document.head.appendChild(styleSheet);
    }

    createWidget() {
      const widget = document.createElement("div");
      widget.className = "mcq-chatbot-widget";
      widget.innerHTML = `
        <div class="mcq-toggle-container">
          <div class="welcome-bubble" id="welcome-bubble">Welcome! How can we help?</div>
          <button class="mcq-toggle" id="mcq-toggle">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="24" height="24">
              <path d="M19 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h4l3 3 3-3h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-3 12H8v-2h8v2zm0-3H8V9h8v2zm0-3H8V6h8v2z"/>
            </svg>
          </button>
        </div>
        
        <div class="mcq-window" id="mcq-window">
          <div class="mcq-header">
            <div class="mcq-header-title">
              <div class="mcq-header-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clip-rule="evenodd" />
                </svg>
              </div>
              <span>${this.config.chatbotName}</span>
            </div>
            <div class="mcq-header-controls">
              <button class="theme-toggle" id="theme-toggle" title="Toggle Theme">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/>
                </svg>
              </button>
              <button class="mcq-header-button" id="mcq-reset" title="Reset Chat">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z" clip-rule="evenodd" />
                </svg>
              </button>
              <button class="mcq-header-button" id="mcq-close" title="Close Chat">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path fill-rule="evenodd" d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" clip-rule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          <div class="mcq-body">
            ${
              this.config.isAuthorized
                ? this.renderBody()
                : this.renderUnauthorized()
            }
          </div>

          <div class="chatbot-typing" id="chatbot-typing" style="display: none;">
            <div class="chatbot-typing-dots">
              <div class="chatbot-typing-dot"></div>
              <div class="chatbot-typing-dot"></div>
              <div class="chatbot-typing-dot"></div>
            </div>
            <span>AI is typing...</span>
          </div>

          ${this.config.isAuthorized ? this.renderFooter() : ""}
          <div class="mcq-tabs">
            <button class="mcq-tab active" data-tab="mcq">MCQ Test</button>
            <button class="mcq-tab" data-tab="chat">Chat</button>
            <button class="mcq-tab" data-tab="faq">FAQ</button>
          </div>
        </div>
      `;

      document.body.appendChild(widget);
      this.widget = widget;
    }

    renderBody() {
      const tokenInfoHtml = this.config.isAuthorized
        ? `
        <div class="token-info" id="token-info">
          Checking tokens...
        </div>
      `
        : "";

      return `
        <!-- FAQ Section -->
        <div class="mcq-section faq-section" id="faq-section">
          <div class="faq-search">
            <input type="text" class="faq-search-input" placeholder="Search FAQ..." id="faq-search">
          </div>
          <div class="faq-content" id="faq-content">
            <div class="faq-category">
              <div class="faq-category-title">${
                this.config.chatbotName
              } FAQ</div>
              <div class="faq-category-subtitle" id="faq-count">Loading FAQ...</div>
              <div class="faq-articles" id="faq-articles">
                <div class="loading">Loading questions...</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Chat Section -->
        <div class="mcq-section chat-section" id="chat-section">
          <div class="chat-messages" id="chat-messages">
            ${this.messages
              .map(
                (msg) => `
              <div class="chat-message ${
                msg.sender === "You" ? "user" : "bot"
              }">
                <div class="chat-message-content">${this.formatMessage(
                  msg.text,
                )}</div>
              </div>
            `,
              )
              .join("")}
          </div>
          <div class="chat-input-area">
            ${tokenInfoHtml}
            <div class="chat-input-container">
              <textarea class="chat-input" id="chat-input" placeholder="Type your message..." rows="1"></textarea>
              <button class="chat-send" id="chat-send">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- MCQ Section -->
        <div class="mcq-section mcq-section active" id="mcq-section">
          <div class="mcq-content">
            ${this.quizData ? this.renderQuiz() : this.renderMCQForm()}
          </div>
        </div>
      `;
    }

    renderUnauthorized() {
      return `
        <div class="mcq-unauthorized">
          <p>Unauthorized access. Please check your monthly subscription. If you are a user, please contact the owner.</p>
          <a href="https://ainspiretech.com/UserDashboard" target="_blank">Check Subscription</a>
        </div>
      `;
    }

    renderFooter() {
      return `
        <div class="mcq-footer">
          <a href="https://ainspiretech.com/" target="_blank" class="powered-by">
            Powered by AinspireTech
          </a>
        </div>
      `;
    }

    renderMCQForm() {
      return `
        <div class="mcq-form">
          <p>Fill The Form To Generate MCQ Test</p>
          <form id="mcq-gen-form">
            <input 
              type="text" 
              id="mcq-topic" 
              placeholder="Topic Name *" 
              required
              ${this.isSending ? "disabled" : ""}
            />
            <input 
              type="text" 
              id="mcq-level" 
              placeholder="Level (Easy, Medium, Hard) *" 
              required
              ${this.isSending ? "disabled" : ""}
            />
            <input 
              type="text" 
              id="mcq-exam" 
              placeholder="Related Exam (e.g., NEET, JEE)"
              ${this.isSending ? "disabled" : ""}
            />
            <textarea 
              id="mcq-info" 
              placeholder="Additional Information"
              ${this.isSending ? "disabled" : ""}
            ></textarea>
            <button type="submit" ${this.isSending ? "disabled" : ""}>
              ${this.isSending ? "Generating..." : "Generate MCQ Test"}
            </button>
          </form>
        </div>
        <div class="mcq-questions-container" id="mcq-questions-container">
          <!-- MCQ questions will appear here -->
        </div>
      `;
    }

    renderQuiz() {
      if (!this.quizData || !this.quizData.questions) {
        return this.renderMCQForm();
      }

      return `
        <div class="mcq-questions-container">
          ${this.quizData.questions
            .map(
              (q, qIndex) => `
            <div class="mcq-question">
              <h3>${qIndex + 1}. ${this.formatMessage(q.question)}</h3>
              <div class="mcq-options">
                ${q.options
                  .map((opt, optIndex) => {
                    let cls = "mcq-option";
                    if (this.selectedAnswers[qIndex] === optIndex)
                      cls += " selected";
                    if (this.isQuizSubmitted) {
                      if (optIndex === q.correctAnswer) cls += " correct";
                      else if (this.selectedAnswers[qIndex] === optIndex)
                        cls += " incorrect";
                    }
                    return `
                    <div 
                      class="${cls}" 
                      data-qindex="${qIndex}" 
                      data-optindex="${optIndex}"
                      ${this.isQuizSubmitted ? 'style="cursor: default;"' : ""}
                    >
                      ${String.fromCharCode(
                        65 + optIndex,
                      )}. ${this.formatMessage(opt)}
                    </div>
                  `;
                  })
                  .join("")}
              </div>
              ${
                this.isQuizSubmitted
                  ? `
                <div class="mcq-explanation">
                  <strong>Explanation:</strong> ${this.formatMessage(
                    q.explanation || "No explanation provided.",
                  )}
                </div>
              `
                  : ""
              }
            </div>
          `,
            )
            .join("")}
        </div>
        <div class="mcq-quiz-controls">
          ${
            !this.isQuizSubmitted
              ? `
            <button class="mcq-quiz-btn" id="mcq-submit">
              Submit Answers (${
                this.selectedAnswers.filter((a) => a !== -1).length
              }/${this.quizData.questions.length})
            </button>
          `
              : `
            <div class="mcq-score">
              <h3>Your Score: ${this.score}/${this.quizData.questions.length}</h3>
              <button class="mcq-quiz-btn" id="mcq-try-again">
                Generate New Test
              </button>
            </div>
          `
          }
        </div>
      `;
    }

    bindEvents() {
      // Toggle and close
      document
        .getElementById("mcq-toggle")
        .addEventListener("click", () => this.toggleWidget());
      document
        .getElementById("mcq-close")
        .addEventListener("click", () => this.closeWidget());
      document
        .getElementById("mcq-reset")
        .addEventListener("click", () => this.resetChat());
      document
        .getElementById("theme-toggle")
        .addEventListener("click", () => this.toggleTheme());

      // Tab switching
      document.querySelectorAll(".mcq-tab").forEach((tab) => {
        tab.addEventListener("click", () => {
          const tabName = tab.getAttribute("data-tab");
          this.switchTab(tabName);
        });
      });

      // FAQ search
      const faqSearch = document.getElementById("faq-search");
      if (faqSearch) {
        faqSearch.addEventListener("input", (e) =>
          this.filterFAQ(e.target.value),
        );
      }

      // Chat input
      const chatSend = document.getElementById("chat-send");
      const chatInput = document.getElementById("chat-input");

      if (chatSend && chatInput) {
        chatSend.addEventListener("click", () => this.sendChatMessage());
        chatInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.sendChatMessage();
          }
        });
        chatInput.addEventListener("input", () => {
          chatInput.style.height = "auto";
          chatInput.style.height = Math.min(chatInput.scrollHeight, 100) + "px";
        });
      }

      // MCQ form submission
      const mcqForm = document.getElementById("mcq-gen-form");
      if (mcqForm) {
        mcqForm.addEventListener("submit", (e) => this.handleMCQFormSubmit(e));
      }

      // Delegated event handling
      document.addEventListener("click", (e) => {
        // FAQ article clicks
        if (e.target.classList.contains("faq-article")) {
          const index = parseInt(e.target.getAttribute("data-index"));
          this.toggleFAQ(index, e.target);
        }

        // MCQ option selection
        if (
          e.target.classList.contains("mcq-option") &&
          !this.isQuizSubmitted
        ) {
          const qIndex = parseInt(e.target.dataset.qindex);
          const optIndex = parseInt(e.target.dataset.optindex);
          this.handleOptionSelect(qIndex, optIndex);
        }

        // Quiz submission
        if (e.target.id === "mcq-submit") {
          this.handleQuizSubmit();
        }

        // Try again
        if (e.target.id === "mcq-try-again") {
          this.resetQuiz();
        }
      });
    }

    toggleTheme() {
      this.isDarkTheme = !this.isDarkTheme;
      const window = document.getElementById("mcq-window");
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

    switchTab(tabName) {
      this.currentTab = tabName;

      // Update active tab
      document.querySelectorAll(".mcq-tab").forEach((tab) => {
        tab.classList.toggle(
          "active",
          tab.getAttribute("data-tab") === tabName,
        );
      });

      // Update active section
      document.querySelectorAll(".mcq-section").forEach((section) => {
        section.classList.toggle("active", section.id === `${tabName}-section`);
      });
    }

    populateFAQ() {
      const faqArticles = document.getElementById("faq-articles");
      const faqCount = document.getElementById("faq-count");

      if (!faqArticles || !faqCount) return;

      if (this.faqQuestions.length > 0) {
        faqCount.textContent = `${this.faqQuestions.length} FAQ articles available`;
        faqArticles.innerHTML = this.faqQuestions
          .map(
            (faq, index) => `
          <div class="faq-item">
            <div class="faq-article" data-index="${index}">
              ${faq.question}
            </div>
          </div>
        `,
          )
          .join("");
      } else {
        faqCount.textContent = "No FAQ articles available";
        faqArticles.innerHTML = `
          <div class="loading">No FAQ questions available at the moment.</div>
        `;
      }
    }

    toggleFAQ(index, clickedArticle) {
      const faqItem = clickedArticle.closest(".faq-item");
      const faq = this.faqQuestions[index];

      // Close currently active FAQ if different
      if (this.activeFAQ !== null && this.activeFAQ !== index) {
        const currentActive = document.querySelector(
          `.faq-article[data-index="${this.activeFAQ}"]`,
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
        clickedArticle.classList.remove("active");
        const answerDiv = faqItem.querySelector(".faq-answer");
        if (answerDiv) {
          answerDiv.remove();
        }
        this.activeFAQ = null;
      } else {
        clickedArticle.classList.add("active");

        // Remove existing answer
        const existingAnswer = faqItem.querySelector(".faq-answer");
        if (existingAnswer) {
          existingAnswer.remove();
        }

        // Create and insert answer
        const answerDiv = document.createElement("div");
        answerDiv.className = "faq-answer";
        answerDiv.innerHTML = faq.answer || "No answer provided.";
        faqItem.appendChild(answerDiv);
        this.activeFAQ = index;
      }
    }

    filterFAQ(searchTerm) {
      const faqItems = document.querySelectorAll(".faq-item");
      let visibleCount = 0;

      faqItems.forEach((item) => {
        const article = item.querySelector(".faq-article");
        const text = article.textContent.toLowerCase();
        if (text.includes(searchTerm.toLowerCase())) {
          item.style.display = "block";
          visibleCount++;
        } else {
          item.style.display = "none";
        }
      });

      const faqCount = document.getElementById("faq-count");
      if (faqCount) {
        if (searchTerm) {
          faqCount.textContent = `${visibleCount} of ${this.faqQuestions.length} articles match`;
        } else {
          faqCount.textContent = `${this.faqQuestions.length} FAQ articles available`;
        }
      }
    }

    async handleMCQFormSubmit(e) {
      e.preventDefault();

      // Check token balance before generating MCQ
      if (this.availableTokens <= 0) {
        this.showTokenAlertMessage(
          "No tokens remaining. Please purchase more tokens to continue.",
        );
        return;
      }

      this.isSending = true;

      const topic = document.getElementById("mcq-topic").value;
      const level = document.getElementById("mcq-level").value;
      const exam = document.getElementById("mcq-exam").value;
      const info = document.getElementById("mcq-info").value;

      // Show typing indicator
      this.showTyping();

      // Switch to chat tab to show conversation
      this.switchTab("chat");

      // Add user message to chat
      const userMessage = `Generate MCQ test for ${topic} (Level: ${level})${
        exam ? ` based on ${exam} syllabus` : ""
      }${info ? `. Additional info: ${info}` : ""}`;
      this.addChatMessage(userMessage, "user");

      try {
        const response = await this.generateMCQResponse(userMessage, true);

        // Hide typing indicator
        this.hideTyping();

        // Track token usage
        if (response.tokensUsed) {
          await this.trackTokenUsage(response.tokensUsed);
        }

        // Handle insufficient tokens
        if (response.error === "insufficient_tokens") {
          this.addChatMessage(
            "I'm unable to process your request due to insufficient tokens. Please purchase more tokens to continue.",
            "bot",
          );
          this.showTokenAlertMessage(
            "Tokens exhausted. Please purchase more tokens to continue.",
          );
          return;
        }

        // Add AI response to chat
        this.addChatMessage(
          "I've generated an MCQ test for you! Switching to MCQ tab...",
          "bot",
        );

        // Parse the response to get quiz data
        try {
          const jsonMatch = response.text.match(/```json\s*([\s\S]*?)\s*```/);
          const jsonString = jsonMatch ? jsonMatch[1] : response.text;
          const quizData = JSON.parse(jsonString);

          // Validate quiz data structure
          if (
            quizData &&
            quizData.questions &&
            Array.isArray(quizData.questions)
          ) {
            this.quizData = quizData;
            this.selectedAnswers = new Array(quizData.questions.length).fill(
              -1,
            );
            this.isQuizSubmitted = false;
            this.score = 0;

            // Update MCQ section
            this.updateMCQSection();

            // Switch to MCQ tab after a short delay
            setTimeout(() => {
              this.switchTab("mcq");
            }, 1000);
          } else {
            throw new Error("Invalid quiz data structure");
          }
        } catch (parseError) {
          console.error("Failed to parse quiz data:", parseError);
          this.addChatMessage(
            "Failed to generate quiz. Please try again with different parameters.",
            "bot",
          );
        }
      } catch (error) {
        console.error("Error generating MCQ:", error);
        this.hideTyping();
        this.addChatMessage(
          "Sorry, I encountered an error while generating the MCQ test. Please try again.",
          "bot",
        );
      } finally {
        this.isSending = false;
      }
    }

    async sendChatMessage() {
      const input = document.getElementById("chat-input");
      const message = input.value.trim();

      if (!message) return;

      // Check token balance before sending
      if (this.availableTokens <= 0) {
        this.showTokenAlertMessage(
          "No tokens remaining. Please purchase more tokens to continue.",
        );
        return;
      }

      // Add user message
      this.addChatMessage(message, "user");
      input.value = "";
      input.style.height = "auto";

      // Show typing indicator
      this.showTyping();

      try {
        const response = await this.generateMCQResponse(message, false);
        this.hideTyping();

        // Track token usage
        if (response.tokensUsed) {
          await this.trackTokenUsage(response.tokensUsed);
        }

        // Handle insufficient tokens
        if (response.error === "insufficient_tokens") {
          this.addChatMessage(
            "I'm unable to process your request due to insufficient tokens. Please purchase more tokens to continue.",
            "bot",
          );
          this.showTokenAlertMessage(
            "Tokens exhausted. Please purchase more tokens to continue.",
          );
        } else {
          this.addChatMessage(response.text, "bot");
        }
      } catch (error) {
        console.error("Error in chat:", error);
        this.hideTyping();
        this.addChatMessage(
          "Sorry, I encountered an error. Please try again.",
          "bot",
        );
      }
    }

    async generateMCQResponse(userInput, isMCQRequest) {
      try {
        const response = await fetch(
          `${this.config.apiUrl}/api/embed/mcqchatbot`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": "your_32byte_encryption_key_here_12345",
            },
            body: JSON.stringify({
              userInput,
              userId: this.config.userId,
              chatbotType: this.config.chatbotType,
              isMCQRequest,
            }),
          },
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
          text: data.response.content || "I couldn't process your request.",
          tokensUsed: tokensUsed,
        };
      } catch (error) {
        console.error("API Error:", error);
        throw error;
      }
    }

    addChatMessage(content, type) {
      const messagesContainer = document.getElementById("chat-messages");
      if (!messagesContainer) return;

      const messageDiv = document.createElement("div");
      messageDiv.className = `chat-message ${type}`;
      messageDiv.innerHTML = `
        <div class="chat-message-content">${this.formatMessage(content)}</div>
      `;

      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      // Add to messages array
      this.messages.push({
        sender: type === "user" ? "You" : "AI Bot",
        text: content,
      });
    }

    handleOptionSelect(questionIndex, optionIndex) {
      if (this.isQuizSubmitted) return;

      this.selectedAnswers[questionIndex] = optionIndex;

      // Update the submit button count
      const submitBtn = document.getElementById("mcq-submit");
      if (submitBtn) {
        const answeredCount = this.selectedAnswers.filter(
          (a) => a !== -1,
        ).length;
        submitBtn.textContent = `Submit Answers (${answeredCount}/${this.quizData.questions.length})`;
      }

      // Update UI
      this.updateMCQSection();
    }

    handleQuizSubmit() {
      if (!this.quizData || !this.quizData.questions) {
        console.error("No quiz data available");
        return;
      }

      try {
        let correct = 0;
        this.quizData.questions.forEach((q, i) => {
          if (this.selectedAnswers[i] === q.correctAnswer) {
            correct++;
          }
        });

        this.score = correct;
        this.isQuizSubmitted = true;
        this.updateMCQSection();
      } catch (error) {
        console.error("Quiz submission failed:", error);
      }
    }

    resetQuiz() {
      this.quizData = null;
      this.selectedAnswers = [];
      this.isQuizSubmitted = false;
      this.score = 0;
      this.updateMCQSection();
    }

    resetChat() {
      this.messages = [
        {
          sender: "AI Bot",
          text: "Hello! How can I help you today?",
        },
      ];

      const messagesContainer = document.getElementById("chat-messages");
      if (messagesContainer) {
        messagesContainer.innerHTML = `
          <div class="chat-message bot">
            <div class="chat-message-content">Hello! How can I help you today?</div>
          </div>
        `;
      }
    }

    updateMCQSection() {
      const mcqSection = document.getElementById("mcq-section");
      if (mcqSection) {
        mcqSection.innerHTML = `
          <div class="mcq-content">
            ${this.quizData ? this.renderQuiz() : this.renderMCQForm()}
          </div>
        `;
      }
    }

    showTyping() {
      this.isTyping = true;
      const typingIndicator = document.getElementById("chatbot-typing");
      if (typingIndicator) {
        typingIndicator.style.display = "flex";
      }
    }

    hideTyping() {
      this.isTyping = false;
      const typingIndicator = document.getElementById("chatbot-typing");
      if (typingIndicator) {
        typingIndicator.style.display = "none";
      }
    }

    formatMessage(text) {
      if (!text) return "";

      // Escape HTML
      let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      // Convert URLs to links
      formatted = formatted.replace(
        /(https?:\/\/[^\s<>"']+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>',
      );

      // Convert markdown-style links
      formatted = formatted.replace(
        /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
      );

      // Convert line breaks
      formatted = formatted.replace(/\n\n/g, "<br><br>");
      formatted = formatted.replace(/\n/g, "<br>");

      // Convert bold and italic
      formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      formatted = formatted.replace(/\*(.*?)\*/g, "<em>$1</em>");

      return formatted;
    }

    toggleWidget() {
      const window = document.getElementById("mcq-window");
      const welcomeBubble = document.getElementById("welcome-bubble");

      this.isOpen = !this.isOpen;

      if (this.isOpen) {
        window.classList.add("open");
        // Hide welcome bubble when window opens
        welcomeBubble.style.display = "none";
        this.switchTab("mcq");

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
      const window = document.getElementById("mcq-window");
      const welcomeBubble = document.getElementById("welcome-bubble");

      window.classList.remove("open");
      this.isOpen = false;
      // Show welcome bubble when window closes
      welcomeBubble.style.display = "block";
    }
  }

  function initEnhancedMcqChatbot() {
    const script =
      document.currentScript ||
      document.querySelector("script[data-mcq-chatbot]");

    if (!script) return;

    const configAttr = script.getAttribute("data-mcq-chatbot");
    if (!configAttr) return;

    try {
      const config = JSON.parse(configAttr);
      new EnhancedMcqChatbotWidget(config);
    } catch (error) {
      console.error("Failed to initialize enhanced MCQ chatbot:", error);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initEnhancedMcqChatbot);
  } else {
    initEnhancedMcqChatbot();
  }
})();
