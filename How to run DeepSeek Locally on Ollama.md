# How to run DeepSeek Locally on Ollama

DeepSeek-R1 is an open-source AI model renowned for its problem-solving, reasoning, and coding capabilities. It rivals other top models ’et is free and can run locally. With Ollama, you can download and run DeepSeek-R1 on your machine in just a few minutes.

This guide will walk you through:

- Installing Ollama --
- Downloading and running DeepSeek-R1 --
- The available DeepSeek-R1 models and their commands --
- Starting, debugging and managing your Ollama server for:
  1. Windows 10/11
  2. Linux (and maybe MAC)

---

## Getting Started with Ollama

Ollama is a free, open-source tool that allows you to run Natural Language Processing models locally. Follow the steps below to get started:

### Step 1: Install Ollama

1. Visit the [Ollama website](https://ollama.com/) and download the version for your operating system.
2. Follow the installation instructions provided on the site.

### Step 2: Download and Run DeepSeek-R1

- After installing Ollama, open your terminal and run the following command to download the DeepSeek-R1 model:

```bash
ollama run deepseek-r1
```

Note: Depending on your internet speed, downloading may take a few minutes. Grab a coffee while you wait!

### Step 3: Verify the Installation

To ensure that DeepSeek-R1 was downloaded successfully, run:

```bash
ollama list
```

You should see your model, example `deepseek-r1:latest` among the list of available models that you have downloaded.

### Step 4: Run DeepSeek-R1

To start DeepSeek-R1 latest, execute:

```bash
ollama run deepseek-r1
```

Otherwise to start DeepSeek-R1 model of your billions of parameters choice, see next section for options:

Example:

```bash
ollama run deepseek-r1:7b
```

You may also need to start the Ollman runner in a new terminal (this is you interface with the AI):

```bash
ollama serve
```

- For help run `ollama -h'.

NOTE: what ever model is running, you need to pass it in as the server URL config option for this VSCode Extension. See guide on how to, basically just use shortcyt "CTRL + ," and search "DeepSeek config".

## Available DeepSeek-R1 Models

DeepSeek-R1 has been fine-tuned into several variants. Use the commands below to run a specific model variant:

- _DeepSeek-R1-Distill-Qwen-1.5BB_

```bash
ollama run deepseek-r1:1.5b
```

- _DeepSeek-R1-Distill-Qwen-7B_

```bash
ollama run deepseek-r1:7b
```

- _DeepSeek-R1-Distill-Llama-8B_

```bash
ollama run deepseek-r1:8b
```

- _DeepSeek-R1-Distill-Qwen-14B_

```bash
ollama run deepseek-r1:14b
```

- _DeepSeek-R1-Distill-Qwen-32B_

```bash
ollama run deepseek-r1:32b
```

- _DeepSeek-R1-Distill-Llama-70B_

```bash
ollama run deepseek-r1:70b
```

For further details on the available versions, check the DeepSeek-R1 Library on Ollama.

---

## Debugging and Managing the Ollama Server

### Starting the Ollama Server

To start the Ollama server (the default port is 11434):

```bash
ollama serve
```

Or on Linux and Mac, choose your port:

```bash
ollama serve --port=11434
```

To run the server on an external IP (e.g., `8.9.8.9`):

```bash
ollama serve --ip=8.9.8.9 --port=11434
```

You can test the API with:

```bash
curl -X POST http://localhost:11434/api/generate  \
    -H "Content-Type: application/json" \
    -d '{"prompt": "What is DeepSeek-R1?"}'
```

### Windows Debug Commands (PowerShell)

List running Ollama processes/:

```powershell
Get-Process -Name ollama
```

Stop all Ollama/DeepSeek processes:

```powershell
Get-Process | Where-Object { $.ProcessName -like '*ollama*} | Stop-Process
```

List specific processes:

```powershell
Get-Process | Where-Object { $.Name -like *.ollama* }
```

Force-stop a process by name or process ID:

```powershell
Stop-Process -Name "<process_name>" -Force
Stop-Process -Id <process_id> -Force
```

For example:

```powershell
Stop-Process -Id 14940 -Force
Stop-Process -Name "deepseek-r1:latest" -Force
```

Remove a DeepSeek model, for example:

```bash
ollama rm deepseek-r1:latest
ollama rm deepseek-r1:7b
```

## Linux Debug Commands

Stop the Ollama service:

```bash
systemctl stop ollama
```

Start Ollama as a system service:

```bash
ollama server start --system
```

Note: you may need to use `sudo if prompted to create a systemd unit.

Stop the system service:

```bash
ollama server stop --system
```

Start Ollama as a user (no sudo required):

```bash
ollama server start
```

Stop the server:

Simply press `Ctrl +D` in the terminal where the server is running.

---

### Ollama Help and Commands

To view a complete list of Ollama commands, run:

```bash
ollama --help
```

### Usage

```bash
ollama [flags]
ollama [command]
```

### Available Commands

- serve:Start Ollama.
- create:Create a model from a Modelfile.
- show:Show information for a model.
- run:Run a model.
- stop:Stop a running model.
- pull: Pull a model from a registry.
- push:Push a model to a registry.
- list:List models.
- ps:List running models.
- cp:Copy a model.
- rm:Remove a model.
- help:Display help about any command.

---

### Summary

This guide provided you with the steps to:

- Install Ollama
- Download and run DeepSeek-R1
- Choose from multiple DeepSeek-R1 models
- Debug and manage your Ollama server on both Windows and Linux

By following these instructions, you should have DeepSeek-R1 running locally in no time. Happy days mate!

```

```
