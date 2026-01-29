import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';

export interface OllamaCompletionRequest {
    model: string;
    prompt: string;
    stream?: boolean;
    options?: {
        temperature?: number;
        num_predict?: number;
        stop?: string[];
    };
}

export interface OllamaCompletionResponse {
    model: string;
    response: string;
    done: boolean;
}

export interface OllamaChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OllamaChatRequest {
    model: string;
    messages: OllamaChatMessage[];
    stream?: boolean;
    options?: {
        temperature?: number;
    };
}

export interface OllamaChatResponse {
    model: string;
    message: OllamaChatMessage;
    done: boolean;
}

export class OllamaClient {
    private client: AxiosInstance;
    private baseUrl: string;
    private disposable?: vscode.Disposable;

    constructor() {
        this.baseUrl = this.getBaseUrl();
        this.client = axios.create({
            baseURL: this.baseUrl,
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Update client when configuration changes
        this.disposable = vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('ollama-copilot.baseUrl')) {
                this.baseUrl = this.getBaseUrl();
                this.client.defaults.baseURL = this.baseUrl;
            }
        });
    }

    public async ping(): Promise<boolean> {
        return this.client
            .get('/api/ping')
            .then(() => true)
            .catch(() => false);
    }

    public dispose() {
        this.disposable?.dispose();
    }

    private getBaseUrl(): string {
        const config = vscode.workspace.getConfiguration('ollama-copilot');
        return config.get<string>('baseUrl') || 'http://localhost:11434';
    }

    async complete(request: OllamaCompletionRequest, signal?: AbortSignal): Promise<string> {
        try {
            const response = await this.client.post<OllamaCompletionResponse>(
                '/api/generate',
                {
                    ...request,
                    stream: false,
                },
                { signal }
            );
            return response.data.response;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                if (error.code === 'ECONNREFUSED') {
                    throw new Error('Unable to connect to Ollama. Please ensure Ollama is running.');
                }
                throw new Error(`Ollama API error: ${error.message}`);
            }
            throw error;
        }
    }

    async chat(request: OllamaChatRequest, signal?: AbortSignal): Promise<OllamaChatMessage> {
        try {
            if (request.messages && request.messages.length === 1) {
                // append system message with current time
                request.messages.push({
                    role: 'system',
                    content: `Current local time: ${new Date().toLocaleString()}, ISO time: ${new Date().toISOString()}`,
                });
            }
            // console.log('Ollama chat request model:', request.model, 'messages:', request.messages);
            const payload = { ...request, stream: false };
            // console.log('Ollama chat request payload:', payload);
            if (request.model.includes('cloud')) {
                delete payload.options;
            }
            const response = await this.client.post<OllamaChatResponse>(
                '/api/chat',
                payload,
                { signal }
            );
            return response.data.message;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                console.error('Axios error in chat:', error);
                if (error.code === 'ECONNREFUSED') {
                    throw new Error('Unable to connect to Ollama. Please ensure Ollama is running.');
                }
                throw new Error(`Ollama API error: ${error.message}`);
            }
            throw error;
        }
    }

    async listModels(): Promise<string[]> {
        try {
            const response = await this.client.get('/api/tags');
            return response.data.models?.map((m: any) => m.name) || [];
        } catch (error) {
            console.error('Failed to list models:', error);
            return [];
        }
    }
}
