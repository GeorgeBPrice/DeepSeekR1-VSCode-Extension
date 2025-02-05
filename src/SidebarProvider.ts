/**
 * The main webview provider for the DeepSeek VS Code extension.
 * This creates the floating chat panel and loads the webview with the chat UI.
 * The webview is the Chat UI for sending messages to the DeepSeek server.
 */
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  sendToDeepSeek,
  focusActiveEditorThenInsert,
  resetConversation,
  stopGeneratingResponse,
} from "./extension";

/**
 * This provider creates the DeepSeek chat webview as a webview view in a
 * VS Code sidebar panel. The webview is the Chat UI for sending messages to
 * the DeepSeek server.
 *
 * @see https://code.visualstudio.com/docs/extensions/webview
 */
export class SidebarProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "deepseek.chat";
  private _view?: vscode.WebviewView;
  private _disposables: vscode.Disposable[] = [];

  constructor(private readonly extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
    this.setupMessageHandlers(webviewView);
  }

  /**
   * Handle the webview's resolve event, which is triggered when the webview is
   * about to be displayed.
   *
   * @param {vscode.WebviewView} webviewView - The webview view.
   * @param {vscode.WebviewViewResolveContext} context - The context for the
   *     resolve operation.
   * @param {vscode.CancellationToken} token - The cancellation token.
   */
  private setupMessageHandlers(webviewView: vscode.WebviewView) {
    const messageHandler = webviewView.webview.onDidReceiveMessage(
      async (message: any) => {
        try {
          switch (message.command) {
            case "sendMessage":
              await this.handleSendMessage(webviewView, message.text);
              break;

            case "insertCode":
              await this.handleInsertCode(message.code);
              break;

            case "openOllamaDoc":
              this.handleOpenDocumentation();
              break;

            case "resetConversation":
              this.handleResetConversation();
              break;

            case "stopGeneratingResponse":
              this.handleStopGeneratingResponse();
              break;
          }
        } catch (error) {
          this.handleWebviewError(webviewView, error);
        }
      }
    );

    this._disposables.push(messageHandler);
  }

  /**
   * Handle the sendMessage event emitted by the webview. This method takes care of
   * sending the message to DeepSeek and appending the message to the webview.
   *
   * @param {vscode.WebviewView} webviewView - The webview view.
   * @param {string} text - The user's message.
   */
  private async handleSendMessage(
    webviewView: vscode.WebviewView,
    text: string
  ) {
    if (!text?.trim()) {
      return;
    }

    webviewView.webview.postMessage({
      command: "addMessage",
      text: text.trim(),
      sender: "user",
    });

    webviewView.webview.postMessage({ command: "addThinking" });

    try {
      const response = await sendToDeepSeek(text, webviewView);
      webviewView.webview.postMessage({
        command: "addMessage",
        text: response,
        sender: "deepseek",
      });
    } catch (error) {
      this.handleWebviewError(webviewView, error);
    }
  }

  // Handle the insertCode event emitted by the webview
  private async handleInsertCode(code: string) {
    if (!code) {
      return;
    }
    await focusActiveEditorThenInsert(code);
  }

  // Handle the openOllamaDoc event emitted by the webview
  private handleOpenDocumentation() {
    const docPath = path.join(
      this.extensionUri.fsPath,
      "How to run DeepSeek Locally on Ollama.md"
    );

    vscode.workspace
      .openTextDocument(docPath)
      .then((doc) => vscode.window.showTextDocument(doc))
      .then(undefined, (error) => {
        vscode.window.showErrorMessage(
          "Failed to open documentation: " + error.message
        );
      });
  }

  // Handle the resetConversation event emitted by the webview
  private handleResetConversation() {
    resetConversation();
    if (this._view?.visible) {
      this._view.webview.postMessage({ command: "resetConversation" });
    }
  }

  private handleStopGeneratingResponse() {
    stopGeneratingResponse();
    if (this._view?.visible) {
      this._view.webview.postMessage({ command: "stopGeneratingResponse" });
    }
  }

  // Handle webview errors, returning them to the webview
  private handleWebviewError(webviewView: vscode.WebviewView, error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Webview Error:", error);

    webviewView.webview.postMessage({
      command: "error",
      error: errorMessage,
    });
  }

  /**
   * Reads and returns the HTML content for the webview.
   * @param webview - The webview to read the content for.
   * @returns The HTML content for the webview.
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    const htmlPath = path.join(
      this.extensionUri.fsPath,
      "src/chatview",
      "webview.html"
    );
    let html = fs.readFileSync(htmlPath, "utf8");

    /**
     * Helper function to replace a placeholder in the HTML with a resource
     * URI for the webview.
     * @param _placeholder - The placeholder in the HTML to replace.
     * @param subPath - The sub-path of the resource relative to the extension
     * directory.
     * @returns The resource URI for the webview.
     */
    const replaceResource = (_placeholder: string, subPath: string[]) =>
      webview
        .asWebviewUri(vscode.Uri.joinPath(this.extensionUri, ...subPath))
        .toString();

    return html
      .replace(
        "{{styleUri}}",
        replaceResource("style", ["src/chatview", "style.css"])
      )
      .replace(
        "{{scriptUri}}",
        replaceResource("script", ["src/chatview", "app.js"])
      )
      .replace(
        "{{imageLogo}}",
        replaceResource("image", ["src/assets", "deepseek-logo.svg"])
      )
      .replace(
        "{{markdownScriptUri}}",
        replaceResource("markdown", ["src/chatview", "marked.min.js"])
      );
  }

  /**
   * Gets the webview for the sidebar.
   * @returns The webview for the sidebar if it has been created, otherwise
   * `undefined`.
   */
  public getView(): vscode.WebviewView | undefined {
    return this._view;
  }

  /**
   * Sends a message to DeepSeek from the extension's sidebar and updates the
   * sidebar webview with the response.
   * @param {string} message - The message to send to DeepSeek.
   * @returns {Promise<void>} - A promise that resolves when the message has been
   * sent to DeepSeek and the sidebar webview has been updated with the
   * response.
   */
  public async sendMessage(message: string): Promise<void> {
    if (!this._view) {
      return;
    }

    try {
      this._view.webview.postMessage({
        command: "addMessage",
        text: message,
        sender: "user",
      });

      this._view.webview.postMessage({ command: "addThinking" });

      const response = await sendToDeepSeek(message, this._view);

      this._view.webview.postMessage({
        command: "addMessage",
        text: response,
        sender: "deepseek",
      });
    } catch (error) {
      this.handleWebviewError(this._view, error);
    }
  }

  /**
   * Clean up resources allocated by the extension.
   */
  dispose() {
    this._disposables.forEach((d) => d.dispose());
    this._disposables = [];
  }
}
