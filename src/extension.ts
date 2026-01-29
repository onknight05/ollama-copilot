// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import { OllamaClient } from './ollamaClient';
import { OllamaCompletionProvider } from './completionProvider';
import { ChatViewProvider } from './chat/chatViewProvider';
import { ChatPanel } from './chat/chatPanel';

let ollamaClient: OllamaClient;
let chatViewProvider: ChatViewProvider;
let statusBarItem: vscode.StatusBarItem;

function updateStatusBar() {
    const config = vscode.workspace.getConfiguration('ollama');
    const isEnabled = config.get<boolean>('autocompleteEnabled') !== false;

    if (isEnabled) {
        statusBarItem.text = '🦙 Ollama';
        statusBarItem.backgroundColor = undefined;
    } else {
        statusBarItem.text = ' 🦙 Ollama';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    }
    statusBarItem.show();
}

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
            // Open as panel (can be docked next to Claude Code)
            ChatPanel.createOrShow(context.extensionUri, ollamaClient, context);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.openChatSidebar', () => {
            // Open in sidebar (original behavior)
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
            updateStatusBar();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.enableAutocomplete', async () => {
            const config = vscode.workspace.getConfiguration('ollama');
            await config.update('autocompleteEnabled', true, vscode.ConfigurationTarget.Global);
            updateStatusBar();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.disableAutocomplete', async () => {
            const config = vscode.workspace.getConfiguration('ollama');
            await config.update('autocompleteEnabled', false, vscode.ConfigurationTarget.Global);
            updateStatusBar();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('ollama.showMenu', async () => {
            const config = vscode.workspace.getConfiguration('ollama');
            const isEnabled = config.get<boolean>('autocompleteEnabled') !== false;

            interface MenuItem extends vscode.QuickPickItem {
                action?: string;
            }

            const items: MenuItem[] = [
                {
                    label: isEnabled ? '$(check) Completions are enabled' : '$(x) Completions are disabled',
                    action: 'toggle'
                },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                {
                    label: '$(comment-discussion) Open Chat',
                    action: 'chat'
                },
                { label: '', kind: vscode.QuickPickItemKind.Separator },
                {
                    label: '$(gear) Settings',
                    action: 'settings'
                }
            ];

            const quickPick = vscode.window.createQuickPick<MenuItem>();
            quickPick.items = items;
            quickPick.title = '🦙 Ollama Copilot';
            quickPick.placeholder = 'Select an action';

            quickPick.onDidAccept(() => {
                const selection = quickPick.selectedItems[0];
                quickPick.hide();

                if (selection?.action === 'toggle') {
                    vscode.commands.executeCommand('ollama.toggleAutocomplete');
                } else if (selection?.action === 'chat') {
                    vscode.commands.executeCommand('ollama.openChat');
                } else if (selection?.action === 'settings') {
                    vscode.commands.executeCommand('workbench.action.openSettings', 'ollama');
                }
            });

            quickPick.onDidHide(() => quickPick.dispose());
            quickPick.show();
        })
    );

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'ollama.showMenu';
    statusBarItem.tooltip = 'Ollama Copilot - Click for options';
    context.subscriptions.push(statusBarItem);
    updateStatusBar();

    // Listen for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('ollama.autocompleteEnabled')) {
                updateStatusBar();
            }
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
