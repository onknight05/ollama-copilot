# Ollama Copilot

Ollama Copilot for VS Code: Harness the power of Ollama with autocomplete and chat without leaving VS Code

## Features

### 🚀 Intelligent Code Autocomplete
- Get AI-powered code suggestions as you type
- Supports multiple programming languages
- Configurable debouncing and model selection
- Can be enabled/disabled on demand

### 💬 Interactive Chat Interface
- Built-in chat panel in the VS Code sidebar
- Ask questions about code, get explanations, and solve problems
- Maintains conversation history during your session
- Uses your local Ollama models for complete privacy

## Requirements

- [Ollama](https://ollama.ai/) must be installed and running on your system
- At least one code-capable model installed (e.g., `codellama`, `deepseek-coder`, `starcoder2`)

### Installing Ollama

1. Download and install Ollama from [https://ollama.ai/](https://ollama.ai/)
2. Install a code model:
   ```bash
   ollama pull codellama
   ```
3. Verify Ollama is running:
   ```bash
   ollama list
   ```

## Installation

1. Install the extension from the VS Code Marketplace
2. Ensure Ollama is running
3. Open any code file and start typing to see autocomplete suggestions
4. Click the Ollama icon in the activity bar to open the chat panel

## Configuration

This extension provides several configuration options. Open VS Code settings (File > Preferences > Settings) and search for "Ollama":

- `ollama-copilot.baseUrl`: Ollama API base URL (default: `http://localhost:11434`)
- `ollama-copilot.model`: Model to use for code completion (default: `codellama`)
- `ollama-copilot.chatModel`: Model to use for chat (default: `codellama`)
- `ollama-copilot.autocompleteEnabled`: Enable/disable autocomplete suggestions (default: `true`)
- `ollama-copilot.maxTokens`: Maximum tokens for code completion (default: `100`)
- `ollama-copilot.temperature`: Temperature for generation (default: `0.2`)
- `ollama-copilot.debounceMs`: Debounce delay before triggering autocomplete (default: `300`)

## Commands

This extension contributes the following commands:

- `Ollama: Open Chat` - Open the chat panel
- `Ollama: Toggle Autocomplete` - Enable/disable autocomplete functionality

## Usage

### Code Autocomplete

1. Start typing in any file
2. Wait for the autocomplete suggestion to appear (ghost text)
3. Press `Tab` to accept the suggestion
4. Press `Esc` to dismiss it

### Chat Panel

1. Click the Ollama icon in the activity bar (or run "Ollama: Open Chat" command)
2. Type your question in the input box
3. Press Enter or click Send
4. View the AI's response in the chat history

## Supported Languages

The extension works with all programming languages supported by VS Code. For best results, use models trained on code like:

- `codellama` - Meta's Code Llama
- `deepseek-coder` - DeepSeek Coder
- `starcoder2` - StarCoder 2
- `phind-codellama` - Phind's fine-tuned Code Llama

## Privacy

All processing happens locally on your machine through Ollama. No code or data is sent to external servers.

## Troubleshooting

### Autocomplete not working

- Verify Ollama is running: `ollama list`
- Check the configured model is installed
- Ensure `ollama-copilot.autocompleteEnabled` is set to `true`
- Try increasing `ollama-copilot.debounceMs` if suggestions appear too quickly

### Chat not responding

- Verify Ollama is running
- Check the base URL in settings matches your Ollama installation
- Look for error messages in the chat panel
- Check VS Code Developer Console (Help > Toggle Developer Tools) for errors

### Connection errors

- Ensure Ollama is running on the configured port (default: 11434)
- Verify the base URL in settings: `ollama-copilot.baseUrl`
- Check firewall settings if using a custom configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

- Built with [Ollama](https://ollama.ai/)
- Inspired by GitHub Copilot and other AI coding assistants

