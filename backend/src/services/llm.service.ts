import { env } from '../config/env';
import { logger } from '../utils/logger';

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
 * LLM Service - Supports OpenAI, Azure OpenAI, and Gemini
 * Handles chat completions for reasoning and explanations
 */
class LLMService {
  private provider: 'openai' | 'gemini' | 'azure';

  constructor() {
    this.provider = env.LLM_PROVIDER;
  }

  /**
   * Generate chat completion using configured LLM provider
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
          throw new Error(`Unsupported LLM provider: ${this.provider}`);
      }
    } catch (error: any) {
      logger.error('LLM service error:', error);
      // Fallback to mock response for demo
      return this.getMockResponse(messages);
    }
  }

  /**
   * OpenAI Chat Completion
   */
  private async openaiChatCompletion(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    config: LLMConfig
  ): Promise<LLMResponse> {
    if (!env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured, using mock response');
      return this.getMockResponse(messages);
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
      logger.warn('Azure OpenAI not configured, using mock response');
      return this.getMockResponse(messages);
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
      logger.warn('Gemini API key not configured, using mock response');
      return this.getMockResponse(messages);
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
   * Mock response for demo/fallback
   */
  private getMockResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  ): LLMResponse {
    const lastMessage = messages[messages.length - 1]?.content || '';
    
    // Simple mock based on context
    if (lastMessage.includes('risk') || lastMessage.includes('Risk')) {
      return {
        content: JSON.stringify({
          riskLevel: 'MEDIUM',
          summary: 'Project shows moderate risk indicators. DPR submission delays and attendance variance require attention.',
          topReasons: [
            'DPR submission delays detected',
            'Attendance variance above threshold',
            'Pending material approvals'
          ],
          recommendations: [
            'Implement daily DPR reminders',
            'Review attendance patterns with team leads',
            'Streamline material approval workflow'
          ],
          confidence: 0.75
        }),
      };
    }

    if (lastMessage.includes('anomaly') || lastMessage.includes('Anomaly')) {
      return {
        content: JSON.stringify({
          severity: 'MEDIUM',
          confidence: 0.8,
          explanation: 'Detected pattern indicates potential data quality issue or workflow deviation.',
          businessImpact: 'May lead to inaccurate reporting and delayed decision-making.',
          recommendedAction: 'Verify data source and review process compliance.'
        }),
      };
    }

    return {
      content: JSON.stringify({ message: 'Analysis complete', confidence: 0.7 }),
    };
  }
}

export const llmService = new LLMService();

