/**
 * @fileoverview
 * This file contains assisitve scripts for the Chat UI interface
 * that is rendered by the DeepSeek extension (using webviews, and other VSCode extension library components).
 *
 * @author DeepSeek R1 & George Price
 *
 * @description
 * The main components are:
 * 1. The chat window
 * 2. The input field at the bottom
 * 3. The send button
 * 4. The stop button
 * 5. The reset button
 *
 * The typical user flow is:
 * 1. User types and sends a message in the Chat UI
 * 2. We send the message to the DeepSeek extension
 * 3. The extension sends back a response
 * 4. We display the response in the chat window
 * 5. We add a "thinking" animation to the chat window
 * 6. We add a "streaming" animation to the chat window
 * 7. We add a retry button
 * 8. We add a reset button
 *
 * @see {@link https://github.com/GeorgeBPrice/DeepSeekR1-VSCode-Extension}
 */
(function () {
  const vscode = acquireVsCodeApi();
  const chat = document.getElementById("chat");
  const input = document.getElementById("input");
  const sendButton = document.getElementById("send");
  const stopButton = document.getElementById("stop");
  const resetButton = document.getElementById("reset");

  let lastUserMessage = "";
  let isStreaming = false;

  // Ollama document link in the landing message
  const ollamaLink = document.getElementById("ollamaLink");
  if (ollamaLink) {
    ollamaLink.addEventListener("click", (e) => {
      e.preventDefault();
      vscode.postMessage({ command: "openOllamaDoc" });
    });
  }

  // Hidden unless a reponse is streaming!
  function setStopButtonVisibility(isVisible = false) {
    stopButton.style.display = isVisible ? "inline-block" : "none";
  }

  /**
   * Send the user's message to the extension to be processed by the
   * DeepSeek AI model. The extension will send a response back to this
   * webview, which will then be displayed in the chat window.
   * @function
   */
  function sendMessage(message, isRetry = false) {
    if (!message.trim()) {
      return;
    }

    if (!isRetry) {
      createUserMessageBubble(message);
      lastUserMessage = message;
      input.value = "";
    }
    isStreaming = true;

    // only display once after the first message
    resetButton.style.display = "inline-block";

    vscode.postMessage({ command: "sendMessage", text: message });
  }

  // Send event listener
  sendButton.addEventListener("click", () => {
    sendMessage(input.value);
  });

  // Reset conversation context + chat area
  resetButton.addEventListener("click", () => {
    // Clear UI
    chat.innerHTML = "";
    input.value = "";
    lastUserMessage = "";
    lastErrorMessage = null;

    // Reset message to " " in the backend state, extension.ts
    vscode.postMessage({ command: "resetConversation" });

    const msgDiv = document.createElement("div");
    msgDiv.textContent =
      "Chat with DeepSeek AI has been reset. You can now start a new conversation.";
    msgDiv.className = "landing-message";
    chat.appendChild(msgDiv);

    // Handle buttons state
    setStopButtonVisibility(false);
    resetButton.style.display = "none";
  });

  // Stop generation
  stopButton.addEventListener("click", () => {
    vscode.postMessage({ command: "stopGeneratingResponse" });
  });

  // Press Enter to send (Shift+Enter => new line)
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendButton.click();
    }
  });

  /**
   * Handles events sent from the extension to the webview.
   *
   * Events:
   * - `addThinking`: adds a thinking indicator to the chat
   * - `startResponse`: removes the thinking indicator and creates a new bubble for the AI response
   * - `streamChunk`: appends a new chunk of text to the last AI message
   * - `streamComplete`: finalizes the AI response and removes the thinking indicator
   * - `error`: handles an error message from the extension
   */
  window.addEventListener("message", (event) => {
    const { command, ...data } = event.data;
    switch (command) {
      case "addThinking":
        addThinkingIndicator();
        break;

      case "startResponse":
        removeThinkingIndicator();
        createAiResponseBubble();
        setStopButtonVisibility(true);
        break;

      case "streamChunk":
        removeThinkingIndicator();
        handleAiStreamChunk(data.chunk || "");
        break;

      case "streamComplete":
        if (data.finalText) {
          const allAiMessages = chat.querySelectorAll(".message.deepseek");
          if (allAiMessages.length) {
            const lastMessage = allAiMessages[allAiMessages.length - 1];
            lastMessage.dataset.fullResponseSoFar = data.finalText;
          }
          setStopButtonVisibility(false);
        }
        finalizeAiResponse();
        finalizeAiResponse();
        finalizeUserMessageTimestamp();
        setStopButtonVisibility(false);
        isStreaming = false;
        break;

      case "error":
        handleError(data.error);
        setStopButtonVisibility(false);
        break;

      case "addDebugLog":
        if (data.text) {
          addDebugLog(data.text);
        }
        break;
    }
  });

  /**
   * Handles an error message from the extension.
   * @param {string} error The error message to display
   */
  function handleError(error) {
    removeThinkingIndicator();
    isStreaming = false;
    lastErrorMessage = error;

    const message = document.createElement("div");
    message.className = "message error";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = error;

    // Add retry button only for errors
    const retryButtonOnError = document.createElement("button");
    retryButtonOnError.className = "retry-button";
    retryButtonOnError.textContent = "Retry";
    retryButtonOnError.onclick = () => {
      if (lastUserMessage) {
        sendMessage(lastUserMessage, true);
      }
    };

    message.appendChild(bubble);
    message.appendChild(retryButtonOnError);
    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;
  }

  /**
   * Creates a user message bubble at the bottom of the chat area.
   * @param {string} text The text to display in the bubble.
   */
  function createUserMessageBubble(text) {
    const message = document.createElement("div");
    message.className = "message user";

    // Add a label for "You"
    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = "User:";
    message.appendChild(label);

    // Create the message bubble
    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Format the text inside the bubble
    formatUserText(bubble, text);

    message.appendChild(bubble);

    // Add a status element
    const status = document.createElement("div");
    status.className = "status";
    status.textContent = "Sending...";
    message.appendChild(status);

    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;
  }

  /**
   * Formats user text by wrapping it in a preformatted block to preserve line breaks.
   *
   * @param {HTMLElement} bubble The container for user text
   * @param {string} text The raw user message
   */
  function formatUserText(bubble, text) {
    const pre = document.createElement("pre");
    pre.textContent = text.trim(); // Use textContent to handle plain text safely
    bubble.appendChild(pre);
  }

  /**
   * Once DeepSeek has finished streaming the response,
   * change the user message from "Sending..." to a timestamp.
   */
  function finalizeUserMessageTimestamp() {
    // Find all user messages, get the last one
    const userMessages = chat.querySelectorAll(".message.user");
    if (!userMessages.length) {
      return;
    }

    const lastUserMsg = userMessages[userMessages.length - 1];
    const status = lastUserMsg.querySelector(".status");

    // Only update if it's still "Sending..."
    if (status && status.textContent === "Sending...") {
      status.textContent = new Date().toLocaleTimeString();
    }
  }

  /**
   * Creates a new DeepSeek response bubble in the chat interface.
   * This function adds a "thinking" indicator, constructs a message element
   * for the DeepSeek response, and appends it to the chat window.
   * The message includes a sender label, a bubble for the main text, and a status line with a timestamp.
   * Also scrolls the chat window to the bottom for that nice feeling!
   */
  function createAiResponseBubble() {
    // thinking in progress!
    addThinkingIndicator();

    // Create a fresh bubble for the AI response
    const message = document.createElement("div");
    message.className = "message deepseek";
    // Store the streaming text so far
    message.dataset.fullResponseSoFar = "";

    // Sender label
    const sender = document.createElement("div");
    sender.className = "sender";
    sender.textContent = "DeepSeek:";
    message.appendChild(sender);

    // Bubble container
    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // The main user-facing text
    const main = document.createElement("div");
    main.className = "ai-main";
    bubble.appendChild(main);

    message.appendChild(bubble);

    // Status line for the AI bubble
    const status = document.createElement("div");
    status.className = "status";
    status.textContent = new Date().toLocaleTimeString();
    message.appendChild(status);

    // Append to chat
    chat.appendChild(message);
    chat.scrollTop = chat.scrollHeight;
  }

  /**
   * Handles a partial stream chunk from DeepSeek's response.
   * We parse out <think>, and add it to the final DeepSeek response, nice formatted and collapsed.
   * @param {string} chunk The partial stream chunk from the DeepSeek.
   */
  function handleAiStreamChunk(chunk) {
    // 1) Grab the last AI message
    const allAiMessages = chat.querySelectorAll(".message.deepseek");
    if (!allAiMessages.length) {
      return;
    }

    const message = allAiMessages[allAiMessages.length - 1];

    // 2) Append chunk to the existing text
    const oldResponse = message.dataset.fullResponseSoFar || "";
    const updated = oldResponse + chunk;
    message.dataset.fullResponseSoFar = updated;

    // 3) Extract <think> but do not display
    const { mainText } = extractThinkContent(updated);

    // 4) Render main text
    const main = message.querySelector(".ai-main");
    if (main) {
      const renderedHtml =
        typeof marked !== "undefined"
          ? marked.parse(mainText)
          : escapeHtml(mainText);
      main.innerHTML = renderedHtml;

      // Post-process code blocks
      postProcessCodeBlocks(main, "deepseek");

      // **Scroll each <pre> to bottom** if they're large
      const codeBlocks = main.querySelectorAll("pre");
      codeBlocks.forEach((block) => {
        block.scrollTop = block.scrollHeight;
      });
    }

    // 5) Remove spinner and scroll chat
    removeThinkingIndicator();
    chat.scrollTop = chat.scrollHeight;
  }

  /**
   * Called once streaming is complete (hide the ugly <think> section):
   * 1) Display final main text (in case last chunk was partial code fence).
   * 2) If <think> content exists, create the "View DeepSeek Thought Process" block now.
   */
  function finalizeAiResponse() {
    const allAiMessages = chat.querySelectorAll(".message.deepseek");
    if (!allAiMessages.length) {
      return;
    }

    const message = allAiMessages[allAiMessages.length - 1];
    const fullText = message.dataset.fullResponseSoFar || "";
    const bubble = message.querySelector(".bubble");
    if (!bubble) {
      return;
    }

    // Remove any existing think section to prevent duplication
    const existingThink = bubble.querySelector(".ai-think");
    if (existingThink) {
      existingThink.remove();
    }

    const { mainText, thinkContent } = extractThinkContent(fullText);

    // Re-render final main text
    const main = bubble.querySelector(".ai-main");
    if (main) {
      const finalMainHtml =
        typeof marked !== "undefined"
          ? marked.parse(mainText)
          : escapeHtml(mainText);
      main.innerHTML = finalMainHtml;
      postProcessCodeBlocks(main, "deepseek");
    }

    // Add thought process section if exists
    if (thinkContent.trim()) {
      const details = document.createElement("details");
      details.className = "ai-think";
      details.open = false;

      const summary = document.createElement("summary");
      summary.textContent = "View Deepseek's Thought Process";
      details.appendChild(summary);

      const thinkDiv = document.createElement("div");
      thinkDiv.className = "ai-think-content";
      const thinkHtml =
        typeof marked !== "undefined"
          ? marked.parse(thinkContent)
          : escapeHtml(thinkContent);
      thinkDiv.innerHTML = thinkHtml;
      details.appendChild(thinkDiv);

      bubble.appendChild(details);
    }
  }

  /**
   * Extract <think> content from the text, removing it from mainText
   * so it doesn't appear mid-stream.
   *
   * @param {string} text
   * @returns {Object} { mainText, thinkContent }
   */
  function extractThinkContent(text) {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/;
    const match = thinkRegex.exec(text);
    let thinkContent = "";
    let mainText = text;
    if (match) {
      thinkContent = match[1] || "";
      mainText = text.replace(thinkRegex, "");
    }
    return { mainText, thinkContent };
  }

  /**
   * Post-process code blocks in DeepSeek reponses, to add "Copy" and "Insert" buttons.
   * @param {HTMLElement} container
   * @param {string} sender
   */
  function postProcessCodeBlocks(container, sender) {
    const codeBlocks = container.querySelectorAll("pre > code");
    codeBlocks.forEach((code) => {
      const pre = code.parentElement;
      const wrapper = document.createElement("div");
      wrapper.className = "code-block";
      pre.parentNode.replaceChild(wrapper, pre);
      wrapper.appendChild(pre);

      // If "language-xxx" is present, show it
      const langMatch = code.className.match(/language-(\S+)/);
      if (langMatch) {
        const langLabel = document.createElement("div");
        langLabel.className = "code-lang-label";
        langLabel.textContent = langMatch[1];
        wrapper.appendChild(langLabel);
      }

      if (sender === "deepseek") {
        // "Copy" button
        const copyBtn = document.createElement("button");
        copyBtn.textContent = "Copy";
        copyBtn.className = "copy-button";
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(code.textContent || "");
        });
        wrapper.appendChild(copyBtn);

        // "Insert" button
        const insertBtn = document.createElement("button");
        insertBtn.textContent = "Insert";
        insertBtn.className = "insert-button";
        insertBtn.addEventListener("click", () => {
          vscode.postMessage({
            command: "insertCode",
            code: code.textContent || "",
          });
        });
        wrapper.appendChild(insertBtn);
      }
    });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  /**
   * Adds a "thinking" indicator to the UI, which is only shown after the
   * user types a message and before the AI has responded (local hosted DeepSeek can take a while to respond).
   */
  function addThinkingIndicator() {
    removeThinkingIndicator();
    const think = document.createElement("div");
    think.className = "thinking";
    think.innerHTML =
      '<div class="loader"></div> DeepSeek is preparing to respond...';
    chat.appendChild(think);
    chat.scrollTop = chat.scrollHeight;
  }

  // Removes the "thinking" indicator, called during streaming
  // (at this point it is obvious something is happening...)
  function removeThinkingIndicator() {
    const existing = chat.querySelector(".thinking");
    if (existing) {
      existing.remove();
    }
  }

  // use to test streaming/UI issues. Time saver mate!
  // Call in a console.log or pass into a message to send to chat
  function addDebugLog(text) {
    const debugElement = document.createElement("div");
    debugElement.className = "debug-log";
    debugElement.textContent = text;
    chat.appendChild(debugElement);
    chat.scrollTop = chat.scrollHeight;
  }
})();
