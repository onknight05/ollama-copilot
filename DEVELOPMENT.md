# VS Code Extension Development

This folder contains the source code for the Ollama Copilot VS Code extension.

## Development Setup

1. Install Node.js (v18 or higher)
2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the TypeScript code:
   ```bash
   npm run compile
   ```

## Testing Locally

1. Open this folder in VS Code
2. Press F5 to launch the Extension Development Host
3. Test the extension in the new VS Code window

## Building

To create a .vsix package:
```bash
npm install -g @vscode/vsce
vsce package
```

## Project Structure

```
├── src/
│   ├── extension.ts          # Extension entry point
│   ├── ollamaClient.ts       # Ollama API client
│   ├── completionProvider.ts # Autocomplete provider
│   └── chat/
│       └── chatViewProvider.ts # Chat webview
├── resources/                # Icons and assets
├── out/                      # Compiled JavaScript (gitignored)
├── package.json             # Extension manifest
└── tsconfig.json           # TypeScript config
```

## Key Technologies

- **TypeScript**: Main development language
- **VS Code Extension API**: For VS Code integration
- **Axios**: HTTP client for Ollama API
- **Webview API**: For chat interface UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` to check code style
5. Run `npm run compile` to verify compilation
6. Submit a pull request
