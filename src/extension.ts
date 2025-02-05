/**
 * @fileoverview This file is part of the VSCode extension "Self-Hosted DeepSeek R1".
 * The extension integrates AI capabilities into the VSCode environment, allowing users to interact with DeepSeek directly within the code editor.
 *
 *
 * ## Main Features:
 *
 * - **Self-Hosted DeepSeek Model**: Users can configure the extension to use their own, self-hosted DeepSeek model. This is done by setting the `deepseek.aiR1SelfHostedUrl` setting in the VSCode settings to the URL where the model is hosted. This allows for greater control and cost savings for users who have the resources to host their own model.
 *
 * - **Cloud Base DeepSeek API**: Users can also choose to use the cloud-based DeepSeek API, which is hosted by DeepSeek R1. This option requires an API key to be provided in the VSCode settings.
 *
 * - **Streaming Capability**: The extension supports streaming responses, allowing users to receive responses from DeepSeek in real-time.
 *
 * - **Multi-Round Conversation Context**: The extension supports a feature called Multi-Round Conversation Context, which allows users to have multiple, related conversations with DeepSeek. This is enabled by default and can be disabled by setting the `deepseek.MultiRoundConversationContext` setting to `false`.
 *
 * - **Right-Click Ask DeepSeek CodeBlock Feature**: The extension supports a feature that allows users to right-click on a code block and ask DeepSeek to generate a response based on the selection.
 *
 *
 * ## Key Components:
 *
 * - **SidebarProvider**: Manages the sidebar interface where users can interact with DeepSeek. Registered with the command `deepseek.chat`.
 *
 * - **WebviewPanel**: A floating chat window where users can engage in conversations with DeepSeek. Created using the `createChatPanel` function.
 *
 * - **AbortController**: Utilized to manage and abort ongoing requests between the extension and DeepSeek, allowing users to stop interactions as needed.
 *
 * - **Conversation History**: A structured record of the exchanges between the user and DeepSeek, enabling context-aware responses. Managed through the `conversationHistory` variable and formatted with `formatConversation`.
 *
 * - **Commands**: The extension registers various commands, such as `deepseek-vscode.openChat` and `deepseek-vscode.openSidebar`, allowing users to open the chat panel or the sidebar.
 *
 * - **State Management**: Includes functions like `resetConversation` to manage the state of the conversation history and abort controllers.
 *
 * - **Error Handling**: Implements basic error handling through the `handleError` function, ensuring that issues during interaction with DeepSeek are handled.
 *
 */

import * as vscode from "vscode";
import axios from "axios";
import * as path from "path";
import * as fs from "fs";
import { SidebarProvider } from "./SidebarProvider";
import { AbortController } from "abort-controller";

// Global state management
let currentAbortController: AbortController | null = null;
let chatPanel: vscode.WebviewPanel | undefined = undefined;
let conversationHistory: { role: string; content: string }[] = [];
let extensionContext: vscode.ExtensionContext;

/**
 * The entry point for the DeepSeek VSCode extension.
 *
 * This activate function is responsible for initializing the extension features
 * and setting up the commands that users can execute within the VSCode environment.
 *
 * Commands are registered to allow users to interact with the extension
 * through the command palette or keyboard shortcuts. Each command is linked
 * to a specific functionality, such as opening a chat panel or configuring settings.
 *
 * @param {vscode.ExtensionContext} context - The VSCode extension context,
 * which provides utilities for managing the extension's lifecycle and state.
 */
export function activate(context: vscode.ExtensionContext) {
  extensionContext = context;
  console.log('The extension "Self-Hosted DeepSeek R1" is now active!');

  const sidebarProvider = new SidebarProvider(context.extensionUri);
  vscode.window.registerWebviewViewProvider("deepseek.chat", sidebarProvider, {
    webviewOptions: { retainContextWhenHidden: true },
  });

  const commands = [
    /**
     * Opens the DeepSeek chat panel.
     */
    vscode.commands.registerCommand("deepseek-vscode.openChat", () =>
      createChatPanel(context)
    ),
    /**
     * Opens the DeepSeek sidebar.
     */
    vscode.commands.registerCommand("deepseek-vscode.openSidebar", () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.deepseek-sidebar"
      );
    }),
    /**
     * Opens the DeepSeek configuration page in the VSCode settings.
     */
    vscode.commands.registerCommand(
      "deepseek-vscode.configureDeepSeek",
      async () => {
        vscode.commands.executeCommand(
          "workbench.action.openSettings",
          "deepseek"
        );
      }
    ),
    /**
     * Opens the DeepSeek code query panel.
     */
    vscode.commands.registerCommand(
      "deepseek-vscode.askDeepSeek",
      handleCodeQuery
    ),
    /**
     * Resets the DeepSeek conversation context.
     */
    vscode.commands.registerCommand(
      "deepseek-vscode.resetConversation",
      resetConversation
    ),
    /**
     * Stops the DeepSeek generation stream.
     */
    vscode.commands.registerCommand(
      "deepseek-vscode.stopGeneratingResponse",
      stopGeneratingResponse
    ),
  ];

  context.subscriptions.push(...commands);
}

/**
 * Handles the right-click 'select code' and 'ask DeepSeek' context menu action.
 */
async function handleCodeQuery() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return vscode.window.showErrorMessage("No active editor found.");
  }

  const selection = editor.document.getText(editor.selection);
  if (!selection) {
    return vscode.window.showErrorMessage("No code selected.");
  }

  const userPrompt = await vscode.window.showInputBox({
    prompt: "Ask DeepSeek about the selected code:",
    placeHolder: "e.g., What does this code do?",
  });

  if (!userPrompt) {
    return;
  }

  const message = `Your prompt:\n\n${userPrompt}\n\nCode:\n\`\`\`\n${selection}\n\`\`\``;
  return await sendToInterface(message);
}

/**
 * Handles messages sent to the panel.
 * @param panel - The webview panel to post messages to.
 * @param message - The message sent by the user.
 */
async function handlePanelMessage(panel: vscode.WebviewPanel, message: string) {
  panel.webview.postMessage({
    command: "addMessage",
    text: message,
    sender: "user",
  });
  panel.webview.postMessage({ command: "addThinking" });

  const response = await sendToDeepSeek(message, panel);
  panel.webview.postMessage({
    command: "addMessage",
    text: response,
    sender: "deepseek",
  });
}

/**
 * Sends a message to the interface, either to the sidebar or the chat panel.
 * @param message - The message to be sent.
 */
async function sendToInterface(message: string) {
  // Get the existing sidebar provider instance
  const sidebarProvider = getSidebarProvider();
  const sidebarView = sidebarProvider.getView();
  const isSidebarVisible = sidebarView?.visible;

  if (isSidebarVisible) {
    await sidebarProvider.sendMessage(message);
  } else if (chatPanel?.visible) {
    await handlePanelMessage(chatPanel, message);
  } else {
    const panel = createChatPanel(extensionContext);
    await handlePanelMessage(panel, message);
  }
}

// Add helper function to get sidebar provider
function getSidebarProvider(): SidebarProvider {
  return new SidebarProvider(extensionContext.extensionUri);
}

/**
 * Reads and returns the HTML content for the webview.
 * @param panel - The webview panel to read the content for.
 * @param context - The extension context.
 * @returns The HTML content for the webview.
 */
function getWebviewContent(
  panel: vscode.WebviewPanel,
  context: vscode.ExtensionContext
): string {
  const webview = panel.webview;

  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "src/chatview", "style.css")
  );
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "src/chatview", "app.js")
  );
  const markdownScriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "src/chatview", "marked.min.js")
  );
  const imageUri = webview.asWebviewUri(
    vscode.Uri.joinPath(context.extensionUri, "src/assets", "deepseek-logo.svg")
  );

  const htmlPath = path.join(
    context.extensionUri.fsPath,
    "src/chatview",
    "webview.html"
  );
  let html = fs.readFileSync(htmlPath, "utf8");

  return html
    .replace("{{styleUri}}", styleUri.toString())
    .replace("{{scriptUri}}", scriptUri.toString())
    .replace("{{markdownScriptUri}}", markdownScriptUri.toString())
    .replace("{{imageLogo}}", imageUri.toString());
}

/**
 * Creates a floating chat panel (or reveals it if already open).
 * @param context - The extension context.
 * @returns The created webview panel.
 */
function createChatPanel(
  context: vscode.ExtensionContext
): vscode.WebviewPanel {
  if (chatPanel) {
    chatPanel.reveal(vscode.ViewColumn.Two);
    return chatPanel;
  }

  chatPanel = vscode.window.createWebviewPanel(
    "deepseekChat",
    "DeepSeek Chat",
    vscode.ViewColumn.Two,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  chatPanel.webview.html = getWebviewContent(chatPanel, context);
  setupWebviewListeners(chatPanel);

  return chatPanel;
}

/**
 * Sets up listeners for the webview panel to handle messages and dispose of panel.
 * @param panel - The webview panel to set up listeners for.
 */
function setupWebviewListeners(panel: vscode.WebviewPanel) {
  panel.webview.onDidReceiveMessage(async (message) => {
    switch (message.command) {
      case "sendMessage":
        panel.webview.postMessage({ command: "addThinking" });
        const response = await sendToDeepSeek(message.text, panel);
        panel.webview.postMessage({
          command: "addMessage",
          text: response,
          sender: "deepseek",
        });
        break;
      case "insertCode":
        await focusActiveEditorThenInsert(message.code);
        break;
    }
  });

  panel.onDidDispose(() => (chatPanel = undefined));
}

/**
 * Handles a request to the DeepSeek cloud API.
 * @param url - The URL to post to.
 * @param headers - The headers to include in the request.
 * @param data - The data to include in the request body.
 * @param panelOrSidebar - The webview panel or sidebar to update with the response.
 * @param useMultiRound - Whether to store the response in the conversation history.
 * @returns The response from the cloud API.
 */
async function handleCloudRequest(
  url: string,
  headers: any,
  data: any,
  panelOrSidebar: vscode.WebviewPanel | vscode.WebviewView,
  useMultiRound: boolean
): Promise<string> {
  try {
    const response = await axios.post(url, data, { headers });
    let finalResponse = "";

    if (data.stream) {
      finalResponse = await handleCloudStream(response, panelOrSidebar);
    } else {
      finalResponse = response.data.choices[0]?.message?.content || "";
    }

    if (useMultiRound) {
      conversationHistory.push({ role: "assistant", content: finalResponse });
    }

    return finalResponse;
  } catch (error) {
    throw error;
  }
}

/**
 * Handles a stream of chunks from the DeepSeek cloud API response.
 * @param response - The cloud API response.
 * @param panelOrSidebar - The webview panel or sidebar to update with the response.
 * @returns A promise that resolves with the full response.
 */
async function handleCloudStream(
  response: any,
  panelOrSidebar: vscode.WebviewPanel | vscode.WebviewView
): Promise<string> {
  return new Promise((resolve, reject) => {
    let fullResponse = "";

    response.data.on("data", (chunk: Buffer) => {
      try {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.choices[0].delta.content) {
              fullResponse += data.choices[0].delta.content;
              panelOrSidebar.webview.postMessage({
                command: "streamChunk",
                chunk: data.choices[0].delta.content,
              });
            }
          }
        }
      } catch (error) {
        reject(error);
      }
    });

    response.data.on("end", () => resolve(fullResponse));
    response.data.on("error", (error: Error) => reject(error));
  });
}

/**
 * Handlesthe message request to DeepSeek (cloud or self-hosted) and returns its response.
 * Supports multi-round conversations by maintaining a conversation history.
 * @param message The message to send to DeepSeek.
 * @param panelOrSidebar The webview panel or sidebar to update with the response.
 * @returns A promise that resolves with the full response.
 */
export async function sendToDeepSeek(
  message: string,
  panelOrSidebar: vscode.WebviewPanel | vscode.WebviewView
): Promise<string> {
  try {
    // Abort any existing request
    if (currentAbortController) {
      currentAbortController.abort();
    }
    currentAbortController = new AbortController();

    const config = vscode.workspace.getConfiguration("deepseek");
    const accountType = config.get<string>("accountType") || "self-hosted";
    const useMultiRound = config.get<boolean>("MultiRoundConversationContext");

    if (useMultiRound) {
      conversationHistory.push({ role: "user", content: message });
    }

    const { url, headers, data } = prepareRequest(
      config,
      message,
      useMultiRound as boolean
    );

    if (accountType === "self-hosted" && data.stream) {
      return handleStreamingRequest(
        url,
        headers,
        data,
        panelOrSidebar,
        useMultiRound as boolean,
        currentAbortController.signal as AbortSignal
      );
    }

    return handleCloudRequest(
      url,
      headers,
      data,
      panelOrSidebar,
      useMultiRound as boolean
    );
  } catch (error) {
    currentAbortController = null;
    const errorMessage = handleError(error);
    panelOrSidebar.webview.postMessage({
      command: "error",
      error: errorMessage,
    });
    return errorMessage;
  }
}

/**
 * Prepares the request configuration based on account type (cloud or self-hosted).
 * @param {vscode.WorkspaceConfiguration} config The extension configuration.
 * @param {string} message The user's message.
 * @param {boolean} useMultiRound allows multi-round conversation, or simple prompts (for self-hosted).
 * @returns {{url: string, headers: any, data: any}} The request configuration.
 */
function prepareRequest(
  config: vscode.WorkspaceConfiguration,
  message: string,
  useMultiRound: boolean
): { url: string; headers: any; data: any } {
  const accountType = config.get<string>("accountType") || "self-hosted";
  const apiKey = config.get<string>("optionalCloudApiKey");
  const selfHostedUrl =
    config.get<string>("aiR1SelfHostedUrl") || "http://localhost:11434";
  const model = config.get<string>("aiR1Model") || "deepseek-r1:7b";
  const temperature = parseFloat(
    config.get<string>("aiR1ModelTemperature") || "0.3"
  );

  return accountType === "cloud"
    ? {
        url: "https://api.deepseek.com/v1/chat/completions",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        data: {
          model: "deepseek-chat",
          messages: conversationHistory,
          temperature,
          stream: true,
        },
      }
    : {
        url: `${selfHostedUrl}/api/generate`,
        headers: { "Content-Type": "application/json" },
        data: {
          model,
          prompt: useMultiRound
            ? formatConversation(conversationHistory)
            : message,
          temperature,
          max_tokens: 4096,
          stream: true,
        },
      };
}

/**
 * Handles a streaming request to DeepSeek (self-hosted).
 * @param {string} url The URL of the self-hosted DeepSeek instance.
 * @param {any} headers The request headers.
 * @param {any} data The request data.
 * @param {import("vscode").WebviewPanel | import("vscode").WebviewView} panelOrSidebar The webview panel or sidebar to update with the response.
 * @param {boolean} useMultiRound allows multi-round conversation, or simple prompts (for self-hosted).
 * @param {AbortSignal} abortSignal The abort signal to cancel the request (Not yet fully implemented).
 * @returns {Promise<string>} A promise that resolves with the full response.
 */
async function handleStreamingRequest(
  url: string,
  headers: any,
  data: any,
  panelOrSidebar: vscode.WebviewPanel | vscode.WebviewView,
  useMultiRound: boolean,
  abortSignal: AbortSignal
): Promise<string> {
  const response = await axios.post(url, data, {
    headers,
    responseType: "stream",
    signal: abortSignal,
  });

  abortSignal.addEventListener("abort", () => {
    response.data.destroy();
    // Possibly send a message back to the WebView that we’re done
    panelOrSidebar.webview.postMessage({ command: "streamComplete" });
  });

  return new Promise<string>((resolve, reject) => {
    const streamState = { fullResponse: "", buffer: "" };
    panelOrSidebar.webview.postMessage({ command: "startResponse" });

    response.data.on("data", (chunk: Buffer) => {
      if (abortSignal.aborted) {
        return;
      }
      streamState.buffer += chunk.toString();
      processBuffer(streamState, panelOrSidebar);
    });

    response.data.on("end", () => {
      if (abortSignal.aborted) {
        return;
      }
      finalizeStream(streamState, panelOrSidebar, useMultiRound, resolve);
    });

    response.data.on("error", (error: Error) => {
      reject(error.message);
    });

    abortSignal.addEventListener("abort", () => {
      response.data.destroy();
      panelOrSidebar.webview.postMessage({ command: "streamComplete" });
      reject(new Error("Request aborted"));
    });
  });
}

/**
 * Process a single chunk of response text as a JSON stream.
 * @param {object} state - The current state of the stream.
 * @param {string} state.buffer - The current buffer of text.
 * @param {string} state.fullResponse - The full text of the response so far.
 * @param {vscode.WebviewPanel | vscode.WebviewView} panel - The webview panel.
 */
function processBuffer(
  state: { buffer: string; fullResponse: string },
  panel: vscode.WebviewPanel | vscode.WebviewView // sidebar or floating window
) {
  while (state.buffer.includes("\n")) {
    const line = state.buffer.substring(0, state.buffer.indexOf("\n")).trim();
    state.buffer = state.buffer.substring(state.buffer.indexOf("\n") + 1);

    if (line) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) {
          state.fullResponse += parsed.response;
          panel.webview.postMessage({
            command: "streamChunk",
            chunk: parsed.response,
          });
        }
      } catch (error) {
        console.error("Error parsing JSON line:", error);
      }
    }
  }
}

/**
 * Finalize the stream and clean up
 * @param {object} state - The current state of the stream.
 * @param {string} state.fullResponse - The full text of the response so far.
 * @param {vscode.WebviewPanel | vscode.WebviewView} panel - The webview panel.
 * @param {boolean} useMultiRound - Whether to save the response to conversation history.
 * @param {(value: string) => void} resolve - The promise resolver.
 */
function finalizeStream(
  state: { fullResponse: string },
  panel: vscode.WebviewPanel | vscode.WebviewView, // sidebar or floating window
  useMultiRound: boolean,
  resolve: (value: string) => void
) {
  if (useMultiRound) {
    conversationHistory.push({
      role: "assistant",
      content: state.fullResponse,
    });
  }
  panel.webview.postMessage({ command: "streamComplete" });
  resolve(state.fullResponse);
}

/**
 * Handles errors and returns a user-friendly message.
 * @param {any} error The error object to handle.
 * @returns {string} A user-friendly error message.
 */
function handleError(error: any): string {
  console.error("API Error:", error);
  let message = "Failed to get response. Check error logs for details.";

  if (axios.isAxiosError(error)) {
    message =
      error.response?.status === 401
        ? "Authentication failed. Check your API key."
        : error.response?.status === 404
        ? "Invalid API endpoint. Check your configuration."
        : error.message;
  } else if (error.message === "Request aborted") {
    message = "Generation stopped.";
  }

  return message;
}

/**
 * Resets the conversation history and aborts any active request.
 * @function resetConversation
 * @memberof module:deepseek-vscode
 */
export function resetConversation() {
  // Reset conversation history to an empty array
  conversationHistory = [];
  stopGeneratingResponse();
}

/**
 * Aborts any active request and stops generation.
 * @function stopGeneratingResponse
 * @memberof module:deepseek-vscode
 */
export function stopGeneratingResponse() {
  if (currentAbortController) {
    currentAbortController.abort();
    currentAbortController = null;
  }
}

/**
 * Format conversation history for the API
 */
function formatConversation(
  history: { role: string; content: string }[]
): string {
  return history
    .map(
      (msg) => `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
    )
    .join("\n\n");
}

/**
 * Focus the active text editor and insert code.
 * Supports the Insert Code snippet command. Slow clicks can loose window focus otherwise.
 * @param {string} code - The code to insert.
 */
export async function focusActiveEditorThenInsert(code: string) {
  if (!code) {
    return;
  }
  if (!vscode.window.activeTextEditor) {
    await vscode.commands.executeCommand(
      "workbench.action.focusActiveEditorGroup"
    );
  }
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    editor.edit((editBuilder) => {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        editBuilder.replace(selection, code);
      } else {
        editBuilder.insert(selection.start, code);
      }
    });
  }
}

export function deactivate() {}
