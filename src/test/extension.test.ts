import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as assert from "assert";
import { activate, deactivate } from "../extension";

/**
 * This test suite shows how to:
 * 1) Provide a real-like `ExtensionContext` with an `extensionUri` for your code.
 * 2) Check if commands are registered by looking them up in the VSCode command registry.
 * 3) Mock or skip calls that rely on an actual file system or a real webview environment.
 *
 * To run the tests:
 * a. Run `npm install -g @vscode/test-cli`
 * b. Run `npm run compile` to compile the extension (optional!)
 * c. Run `vscode-test` to run the tests
 * d. Watch the tests run, a new VSCode window should open and close during this, HI5.
 */

suite("DeepSeek Extension Test Suite", () => {
  let context: vscode.ExtensionContext;
  let createWebviewPanelBackup: any;

  suiteSetup(async () => {
    context = {
      subscriptions: [],
      extensionUri: vscode.Uri.file(path.join(__dirname, "..")),
    } as unknown as vscode.ExtensionContext;

    createWebviewPanelBackup = vscode.window.createWebviewPanel;
    (vscode.window as any).createWebviewPanel = (
      _viewType: string,
      _title: string,
      _showOptions: vscode.ViewColumn,
      _options: vscode.WebviewPanelOptions
    ) => {
      // Return a dummy WebviewPanel
      return {
        webview: {
          html: "",
          onDidReceiveMessage: () => undefined,
          postMessage: () => undefined,
        },
        reveal: () => undefined,
        dispose: () => undefined,
      };
    };

    // access the chaview folder
    const mediaHtml = path.join(
      context.extensionUri.fsPath,
      "src/chatview",
      "webview.html"
    );
    if (!fs.existsSync(path.dirname(mediaHtml))) {
      fs.mkdirSync(path.dirname(mediaHtml), { recursive: true });
    }
    if (!fs.existsSync(mediaHtml)) {
      fs.writeFileSync(
        mediaHtml,
        "<html><body>Test Webview</body></html>",
        "utf8"
      );
    }

    activate(context);
  });

  suiteTeardown(() => {
    if (createWebviewPanelBackup) {
      (vscode.window as any).createWebviewPanel = createWebviewPanelBackup;
    }
    deactivate();
  });

  test("Extension activates without error and has some subscriptions", () => {
    assert.ok(
      context.subscriptions.length > 0,
      "Expected at least one subscription after activation."
    );
  });

  async function isCommandAvailable(commandId: string): Promise<boolean> {
    const allCommands = await vscode.commands.getCommands(true);
    return allCommands.includes(commandId);
  }

  /**
   * Test to verify that all DeepSeek commands are registered
   * in the global VSCode command registry.
   */
  test("Commands are registered in the global registry", async () => {
    const expectedCommands = [
      "deepseek-vscode.openChat",
      "deepseek-vscode.openSidebar",
      "deepseek-vscode.configureDeepSeek",
      "deepseek-vscode.askDeepSeek",
      "deepseek-vscode.resetConversation",
      "deepseek-vscode.stopGeneratingResponse",
    ];

    for (const cmd of expectedCommands) {
      const found = await isCommandAvailable(cmd);
      assert.ok(found, `Expected the command '${cmd}' to be registered.`);
    }
  });

  /**
   * Confirms these command can be executed without error, simple tests.
   * No-op since the command is purely declarative.
   */
  test("Execute 'deepseek-vscode.openSidebar' does not throw", async () => {
    await vscode.commands.executeCommand("deepseek-vscode.openSidebar");
    assert.ok(true, "Executed 'deepseek-vscode.openSidebar' without error.");
  });

  test("Execute 'deepseek-vscode.configureDeepSeek' does not throw", async () => {
    await vscode.commands.executeCommand("deepseek-vscode.configureDeepSeek");
    assert.ok(
      true,
      "Executed 'deepseek-vscode.configureDeepSeek' without error."
    );
  });

  test("Execute 'deepseek-vscode.resetConversation' does not throw", async () => {
    await vscode.commands.executeCommand("deepseek-vscode.resetConversation");
    assert.ok(
      true,
      "Executed 'deepseek-vscode.resetConversation' without error."
    );
  });

  test("Execute 'deepseek-vscode.stopGeneratingResponse' does not throw", async () => {
    await vscode.commands.executeCommand(
      "deepseek-vscode.stopGeneratingResponse"
    );
    assert.ok(
      true,
      "Executed 'deepseek-vscode.stopGeneratingResponse' without error."
    );
  });
});
