# Quick Start Guide

Get started with Ollama Copilot in 5 minutes!

## Prerequisites

1. Install [Ollama](https://ollama.ai/)
2. Pull a code model:
   ```bash
   ollama pull codellama
   ```

## Installation

### Option 1: From VS Code Marketplace (Recommended)
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Ollama Copilot"
4. Click Install

### Option 2: From VSIX File
1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions
4. Click the "..." menu → "Install from VSIX..."
5. Select the downloaded file

### Option 3: Development Setup
1. Clone this repository
2. Run `npm install`
3. Run `npm run compile`
4. Press F5 to launch Extension Development Host

## First Steps

### 1. Verify Ollama is Running
```bash
ollama list
```
You should see your installed models.

### 2. Try Autocomplete
1. Open any code file (`.py`, `.js`, `.ts`, etc.)
2. Start typing a function:
   ```python
   def calculate_sum(a, b):
       #
   ```
3. Wait for ghost text to appear
4. Press Tab to accept

### 3. Use the Chat
1. Click the Ollama icon in the sidebar
2. Type a question: "How do I read a file in Python?"
3. Press Enter
4. Get your answer!

## Configuration

Access settings via File → Preferences → Settings, then search for "Ollama":

**Essential Settings:**
- `ollama-copilot.baseUrl`: Where Ollama is running (default: `http://localhost:11434`)
- `ollama-copilot.model`: Model for autocomplete (default: `codellama`)
- `ollama-copilot.chatModel`: Model for chat (default: `codellama`)

**Advanced Settings:**
- `ollama-copilot.autocompleteEnabled`: Toggle autocomplete on/off
- `ollama-copilot.temperature`: Creativity (0.0-1.0, lower = more focused)
- `ollama-copilot.maxTokens`: Max completion length
- `ollama-copilot.debounceMs`: Delay before suggestions

## Troubleshooting

### No autocomplete suggestions?
- Check Ollama is running: `ollama list`
- Verify `ollama-copilot.autocompleteEnabled` is `true`
- Check the model is installed: `ollama list`
- Look for errors in Output → Ollama Copilot

### Chat not responding?
- Verify Ollama is running on port 11434
- Check `ollama-copilot.baseUrl` matches your setup
- Look for error messages in the chat panel
- Check Developer Tools (Help → Toggle Developer Tools)

### Connection errors?
- Ensure Ollama is running: `ollama serve` (if not running as service)
- Check firewall settings
- Verify base URL in settings

## Tips for Best Results

1. **Model Selection**
   - General coding: `codellama` or `deepseek-coder`
   - Python: `codellama:python`
   - Multiple languages: `starcoder2`

2. **Autocomplete Tips**
   - Add comments to guide suggestions
   - Use descriptive variable/function names
   - Give it context with surrounding code

3. **Chat Tips**
   - Be specific in your questions
   - Provide code context when asking for help
   - Ask follow-up questions for clarification

4. **Performance**
   - Smaller models (7B) are faster
   - Larger models (13B, 34B) are more accurate
   - Adjust `debounceMs` if autocomplete feels sluggish

## Example Workflow

1. **Planning**: Ask chat "How should I structure a REST API in Express?"
2. **Coding**: Use autocomplete to implement the structure
3. **Debugging**: Paste problematic code in chat: "What's wrong here?"
4. **Testing**: Ask chat "Generate tests for this function"
5. **Refactoring**: Ask "How can I improve this code?"

## Commands

Access via Command Palette (Ctrl+Shift+P / Cmd+Shift+P):

- `Ollama: Open Chat` - Open the chat sidebar
- `Ollama: Toggle Autocomplete` - Enable/disable autocomplete

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [examples/](examples/) for sample code
- See [DEVELOPMENT.md](DEVELOPMENT.md) for contributing
- Read [CHANGELOG.md](CHANGELOG.md) for version history

## Support

- **Issues**: Report bugs or request features on GitHub
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: Check the README for detailed info

Enjoy coding with Ollama Copilot! 🚀
