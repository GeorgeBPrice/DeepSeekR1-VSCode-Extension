# Self-Hosted DeepSeek R1, VSCode Extension

**Self-Hosted DeepSeek R1** is an unofficial extension that brings AI-assisted code insights and explanations directly into your editor. It can be configured to use **cloud-based** DeepSeek (via API key) or run **self-hosted** (e.g., via Ollama on localhost).

<br/>

## Key Features

1. **Sidebar & Floating Chat**

   - Converse with DeepSeek in a collapsible sidebar or in a floating panel.
   - Real-time _streaming_ responses—messages appear word by word.
   - **Stop Generation** button to abort streaming output mid-response.
   - **Reset Conversation** button to clear the context.

2. **Right-Click “Ask DeepSeek”**

   - Select code, right-click, and choose “Ask DeepSeek” to get an explanation or debug suggestions.

3. **Code Block Actions**

   - Responses often include code blocks with automatic syntax highlighting.
   - **Copy** button: Copies the code snippet to your clipboard.
   - **Insert** button: Inserts the code snippet into your active document at the cursor.

4. **Multi-Round Conversations**

   - When enabled, each response is remembered. You can build up context in a session.

5. **Configurable for Cloud or Self-Hosted**
   - Provide a DeepSeek API Key (if using cloud).
   - Set your local hosting URL (for self-hosted).
   - Supports custom model names and temperatures.

<br/>

## Installation

1. **Clone or Download Extension**:
Download this repository to test or deploy locally. Maybe install it from the VSCode Marketplace (if/when published).

- To quickly test the downloaded extension repository, locally:
  1. **Open** the folder in VSCode.
  2. **Run** `npm install` to install dependencies.
  3. **Build** the extension: `npm run compile`.
  4. **Launch** the extension by pressing `F5` or via “Run Extension” in VSCode’s debug panel.
 
- To deploy the extension for use locally, in any VSCode window:
  1. **Install vsce**:
      ```bash
      npm install -g @vscode/vsce
      ```
  2. **Run the packaging command** `:
      ```bash
      vsce package
      ```
  3. **Install the .vsix File Locally**:
      ```bash
      vsce package
      ```
  4. **Run the Command Palette**: open command with <kbd>Ctrl+Shift+P</kbd> or <kbd>Cmd+Shift+P</kbd> on macOS. Type and select Extensions: `Install from VSIX...`. Locate and select the DeepSeek .vsix file (e.g., deepseek-gp-vscode-0.1.0.vsix).
  5. **Verify the Extension Installation**: Open the Extensions view, command <kbd>Ctrl+Shift+X</kbd> or <kbd>Cmd+Shift+X</kbd> on macOS. Find the DeepSeek extension in the list. It should now be installed and enabled. Enjoy!
     
<br/>

2. **Run DeepSeek Locally on Ollama**:

- For a full guide, view the `How to run DeepSeek Locally on Ollama.md` in the repo, otherwise:

1.  **Download and Install Ollama**:

    - Visit the [Ollama website](https://ollama.com) to download the installer for your operating system.
    - Run the installer and follow the instructions to complete the installation.

2.  **Install DeepSeek R1**:

    - Open a terminal and run the following command to install DeepSeek R1, for example 7 Billion version, pick your own model depending on your compute power, 7b and 14b are popular for mid-level systems:
      ```bash
      ollama install deepseek-r1:7b
      ```

3.  **Run the Server**:
    - In the terminal, execute the following command to start the DeepSeek R1 server:
      ```bash
      ollama run deepseek-r1:7b
      ```
    - Default port is `11434`, otherwise linux and mac users can choose your preferred port, see guide.
    - You may also need to start the server in a new terminal, enjoy the output:
      ```bash
      ollama serve
      ```
    - For help run `ollama -h'.

## Configuration

Use hotkey use <kbd>CTRL + SHIFT + P</kbd> and type `DeepSeek: Config`

Or to mouse click navigate to the extension settings in VSCode, go to:

> **File** → **Preferences** → **Settings** → type `deepseek.`

Or use hotkey <kbd>CTRL + ,</kbd> to open config in VSCode and search `deepseek.`.

Or if testing the repository, open your user/workspace `settings.json` and define:

| Setting                                  | Type      | Default                    | Description                                                                        |
| ---------------------------------------- | --------- | -------------------------- | ---------------------------------------------------------------------------------- |
| `deepseek.accountType`                   | `string`  | `self-hosted`              | Either `"cloud"` or `"self-hosted"`.                                               |
| `deepseek.optionalCloudApiKey`           | `string`  | `"Only for cloud..."`      | Your DeepSeek API key (if `accountType` is `cloud`).                               |
| `deepseek.aiR1SelfHostedUrl`             | `string`  | `"http://localhost:11434"` | Local server URL if hosting your own instance (Ollama or another method).          |
| `deepseek.aiR1Model`                     | `string`  | `"deepseek-r1:7b"`         | The model name to use (e.g. `deepseek-r1:14b`).                                    |
| `deepseek.aiR1ModelTemperature`          | `number`  | `0.3`                      | Ranges roughly 0.0 – 1.0, lower is more literal, higher is more creative.          |
| `deepseek.MultiRoundConversationContext` | `boolean` | `true`                     | Toggles conversation context (can slow down responses for 'low resource systems'). |

<br/>

## Usage

1. **Open Chat**:

   - On the Sidebar Menu click on the DeepSeek Icon, or find `DeepSeek` in the "Additional Views" three-dots dropdown menu.
   - Or via Command Palette: Use hotkey <kbd>CTRL + SHIFT + P</kbd> and enter `Show Deepseek`.
   - Or enter `DeepSeek: Floating Chat` to open this optional panel (note that both panels share the same chat history).

2. **Ask a Question**:

   - Type your question in the chat text area, press **Send**. Watch it stream.

3. **Ask DeepSeek About Code**:

   - In any editor, **highlight** a snippet and then right-click → **Ask DeepSeek**.
   - DeepSeek will reference that code snippet in its response.

4. **Stop Generation**:

   - If the response is streaming too long, click the **Stop** button.
   - This aborts the in-progress request.

5. **Reset Conversation**:
   - Clears previous chat history.
   - Useful if you want a fresh context or to “forget” older Q&A data.

<br/>

## All Commands

To bring up VSCode Command, use hotkeys <kbd>CTRL + SHIFT + P</kbd> and then type:

- **`Show Deepseek`**  
  Shows the default DeepSeek sidebar.
- **`DeepSeek Floating Chat`**  
  Opens a floating chat window.
- **`Ask DeepSeek`**  
  Right-click or from the Command Palette, ask about selected code.
- **`DeepSeek Config`**  
  Jumps straight to your DeepSeek settings in VSCode.

<br/>

## Known Issues

- **Ask DeepSeek**: There is an issue where when using this 'right click' menu command, the request goes into the floating chat window, even when the sidebar chat is open.
- **Model Startup Time**: Larger models (especially self-hosted) can have warm-up delays, more a compute issue...

<br/>

## Improvements Coming

- **Improve Error Responses**: Stylise and inject error messages into the chat in a nice bubble message format, provide better error messaging too.
- **Ask DeepSeek**: Will fix the known issue mentioned above _AND_ will also add a message with user selected-text to the chat window, so users can keep tabs.
- **Improve User Message Styling**: Will add a decent regex or library to detect code in the users requests, and output the user's messages nicely.
- **Multi Window Sessions**: I am looking at ways to create a session for window, that keeps the chat message context separate, and a local history. Possibly also storing closed chats.

<br/>

## Release Notes

### 0.1.0

- Initial release of 'Self-Hosted DeepSeek R1' for VSCode.
- Chat in sidebar & floating window; streamed responses with multi-question-context; code block insertions via right click menu. Support for cloud and locally hosted models.

### 0.1.1

- Auto-scrolling for large blocks.
- Expandable “View AI Thought Process” section, cleans up the chat window.
- Added **Stop** functionality to abort streaming output.

<br/>

## Contributing

Feel free to open issues or pull requests to improve functionality and user experience. Please follow the [VSCode Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines).

<br/>

## Disclaimer / Other Information

- **Unofficial**: This extension is not affiliated with or endorsed by DeepSeek.
- **Use at Own Risk**: We are not responsible for any outcomes, data exposure, or misuse.
- **No Illegal Crap!**: We do not condone illegal or malicious/harmful activity.

---

**Enjoy exploring DeepSeek R1 in VSCode, with no one snooping on you!**
