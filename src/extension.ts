// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { OllamaClient } from './ollamaClient';
import { OllamaCompletionProvider } from './completionProvider';
import { ChatViewProvider } from './chat/chatViewProvider';

let ollamaClient: OllamaClient;
let chatViewProvider: ChatViewProvider;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
    console.log('Ollama Copilot is now active');

    // Initialize Ollama client
    ollamaClient = new OllamaClient();
    context.subscriptions.push({
        dispose: () => ollamaClient.dispose()
    });

    // Register inline completion provider
    const completionProvider = new OllamaCompletionProvider(ollamaClient);
    context.subscriptions.push(
        vscode.languages.registerInlineCompletionItemProvider(
            { pattern: '**' },
            completionProvider
        )
    );
    context.subscriptions.push({
        dispose: () => completionProvider.dispose()
    });

    // Register chat view provider
    chatViewProvider = new ChatViewProvider(context.extensionUri, ollamaClient, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChatViewProvider.viewType,
            chatViewProvider
        )
    );

    // registerCommand
    // The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

    // showInformationMessage
    // The code you place here will be executed every time your command is executed
	// Display a message box to the user

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.openChat', () => {
            vscode.commands.executeCommand('workbench.view.extension.ollama-sidebar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.clearChat', () => {
            chatViewProvider.clearChat();
            vscode.window.showInformationMessage('Chat history cleared');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.newConversation', () => {
            chatViewProvider.newConversation();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.toggleAutocomplete', async () => {
            const config = vscode.workspace.getConfiguration('ollama');
            const currentValue = config.get<boolean>('autocompleteEnabled') !== false;
            await config.update('autocompleteEnabled', !currentValue, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `Ollama autocomplete ${!currentValue ? 'enabled' : 'disabled'}`
            );
        })
    );

    // Show welcome message
    vscode.window.showInformationMessage(
        'Ollama Copilot activated! Make sure Ollama is running on your system.',
        'Open Chat',
        'Settings'
    ).then(selection => {
        if (selection === 'Open Chat') {
            vscode.commands.executeCommand('ollama.openChat');
        } else if (selection === 'Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'ollama');
        }
    });
}

export function deactivate() {
    console.log('Ollama Copilot is now deactivated');
}
