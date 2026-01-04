import { env } from '../config/env';
import { logger } from '../utils/logger';
import { huggingFaceService } from './ai/huggingface.service';

export interface LLMResponse {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
}

export interface LLMConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * LLM Service - Supports OpenAI, Azure OpenAI, Gemini, and HuggingFace
 * Handles chat completions for reasoning and explanations
 * Falls back to HuggingFace if other providers fail or are not configured
 */
class LLMService {
  private provider: 'openai' | 'gemini' | 'azure';

  constructor() {
    this.provider = env.LLM_PROVIDER;
  }

  /**
   * Generate chat completion using configured LLM provider
   * Falls back to HuggingFace if primary provider fails
   */
  async chatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: LLMConfig = {}
  ): Promise<LLMResponse> {
    try {
      switch (this.provider) {
        case 'openai':
          return await this.openaiChatCompletion(messages, config);
        case 'azure':
          return await this.azureChatCompletion(messages, config);
        case 'gemini':
          return await this.geminiChatCompletion(messages, config);
        default:
          // Fallback to HuggingFace for unsupported providers
          return await this.huggingFaceChatCompletion(messages, config);
      }
    } catch (error: any) {
      logger.error('LLM service error, falling back to HuggingFace:', error);
      // Fallback to HuggingFace
      try {
        return await this.huggingFaceChatCompletion(messages, config);
      } catch (hfError: any) {
        logger.error('HuggingFace fallback also failed:', hfError);
        // Last resort: return structured fallback (not mock data)
        return this.getStructuredFallback(messages);
      }
    }
  }

  /**
   * HuggingFace Chat Completion (fallback and primary for HuggingFace provider)
   */
  private async huggingFaceChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: LLMConfig
  ): Promise<LLMResponse> {
    if (!huggingFaceService.isAvailable()) {
      throw new Error('HuggingFace API key not configured');
    }

    // Convert messages to a single prompt
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');

    let prompt = '';
    if (systemMessage) {
      prompt += `System: ${systemMessage.content}\n\n`;
    }

    // Build conversation context
    for (let i = 0; i < Math.max(userMessages.length, assistantMessages.length); i++) {
      if (userMessages[i]) {
        prompt += `User: ${userMessages[i].content}\n`;
      }
      if (assistantMessages[i]) {
        prompt += `Assistant: ${assistantMessages[i].content}\n`;
      }
    }

    // Add the last user message if it exists
    const lastUserMessage = userMessages[userMessages.length - 1];
    if (lastUserMessage && !prompt.includes(lastUserMessage.content)) {
      prompt += `User: ${lastUserMessage.content}\n\nAssistant:`;
    }

    const maxTokens = config.maxTokens || 1000;
    const response = await huggingFaceService.generateText(prompt, maxTokens);

    if (!response) {
      throw new Error('HuggingFace API returned no response');
    }

    return {
      content: response,
    };
  }

  /**
   * OpenAI Chat Completion
   */
  private async openaiChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: LLMConfig
  ): Promise<LLMResponse> {
    if (!env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured, falling back to HuggingFace');
      return await this.huggingFaceChatCompletion(messages, config);
    }

    const model = config.model || 'gpt-4o-mini';
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  }

  /**
   * Azure OpenAI Chat Completion
   */
  private async azureChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: LLMConfig
  ): Promise<LLMResponse> {
    if (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_API_KEY) {
      logger.warn('Azure OpenAI not configured, falling back to HuggingFace');
      return await this.huggingFaceChatCompletion(messages, config);
    }

    const model = config.model || 'gpt-4o-mini';
    const url = `${env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${model}/chat/completions?api-version=2024-02-15-preview`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': env.AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Azure OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens,
        completionTokens: data.usage?.completion_tokens,
      },
    };
  }

  /**
   * Gemini Chat Completion
   */
  private async geminiChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: LLMConfig
  ): Promise<LLMResponse> {
    if (!env.GEMINI_API_KEY) {
      logger.warn('Gemini API key not configured, falling back to HuggingFace');
      return await this.huggingFaceChatCompletion(messages, config);
    }

    const model = config.model || 'gemini-pro';
    // Convert messages format for Gemini
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Add system message as first user message if present
    const systemMessage = messages.find(m => m.role === 'system');
    if (systemMessage) {
      contents.unshift({
        role: 'user',
        parts: [{ text: systemMessage.content }],
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens ?? 1000,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.candidates[0].content.parts[0].text,
    };
  }

  /**
   * Structured fallback response when all AI services fail
   * This is NOT mock data - it's a last resort fallback that indicates service unavailability
   */
  private getStructuredFallback(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): LLMResponse {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Return a structured response indicating AI service is unavailable
    // This allows the system to continue functioning but indicates the limitation
    return {
      content: JSON.stringify({
        error: 'AI service temporarily unavailable',
        message: 'All AI services are currently unavailable. Please try again later or contact support.',
        fallback: true,
        timestamp: new Date().toISOString()
      }),
    };
  }
}

export const llmService = new LLMService();

