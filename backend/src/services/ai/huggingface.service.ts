/**
 * Hugging Face API Service
 * Handles text generation using Hugging Face Router API (OpenAI-compatible)
 * 
 * Rules:
 * - Only uses structured data from MongoDB
 * - Never fabricates or assumes data
 * - Returns explainable, traceable responses
 */

import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export class HuggingFaceService {
  private apiKey: string;
  private baseUrl = 'https://router.huggingface.co';
  // Using a reliable model that works with the router API
  private model = 'meta-llama/Llama-3.1-8B-Instruct';

  constructor() {
    this.apiKey = env.HUGGINGFACE_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('HUGGINGFACE_API_KEY not set - AI features will be disabled');
    } else {
      logger.info('HuggingFace API key configured - AI features enabled');
    }
  }

  /**
   * Generate text using Hugging Face Router API (OpenAI-compatible format)
   * @param prompt - The prompt to send to the model
   * @param maxLength - Maximum response length (default: 500)
   * @returns Generated text or null if API key is missing
   */
  async generateText(prompt: string, maxLength: number = 500): Promise<string | null> {
    if (!this.apiKey) {
      logger.warn('Hugging Face API key not configured - returning null');
      return null;
    }

    try {
      // Use the new router API endpoint with OpenAI-compatible format
      const chatUrl = `${this.baseUrl}/v1/chat/completions`;
      
      logger.debug(`Calling HuggingFace Router API: ${this.model}`);
      
      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: maxLength,
          temperature: 0.7,
          top_p: 0.9,
        }),
      });

      const responseText = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`Failed to parse HuggingFace response: ${responseText.substring(0, 200)}`);
        // Check if model is loading
        if (responseText.includes('loading') || responseText.includes('model is currently loading')) {
          throw new Error('Model is loading. Please wait a moment and try again.');
        }
        throw new Error(`Invalid JSON response from HuggingFace API: ${responseText.substring(0, 100)}`);
      }

      // Handle model loading state
      if (data.error && (data.error.includes('loading') || (data.error.includes('Model') && data.error.includes('loading')))) {
        logger.warn('HuggingFace model is loading, waiting 10 seconds...');
        // Wait and retry once
        await new Promise(resolve => setTimeout(resolve, 10000));
        return await this.generateText(prompt, maxLength);
      }

      // Handle errors
      if (!response.ok || data.error) {
        const errorMessage = data.error?.message || data.error || responseText || `HTTP ${response.status}`;
        logger.error(`HuggingFace API error (${response.status}): ${errorMessage}`);
        
        // Handle specific error cases
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid HuggingFace API key. Please check your HUGGINGFACE_API_KEY environment variable.');
        }
        
        if (response.status === 429) {
          throw new Error('AI service is rate-limited. Please try again in a moment.');
        }
        
        if (response.status === 503) {
          throw new Error('HuggingFace service is temporarily unavailable. Please try again later.');
        }
        
        throw new Error(`AI service error: ${errorMessage}`);
      }
      
      // Handle OpenAI-compatible response format
      if (data.choices && data.choices.length > 0) {
        const content = data.choices[0].message?.content || data.choices[0].text || '';
        if (content) {
          const cleaned = content.trim();
          logger.debug(`HuggingFace response received: ${cleaned.substring(0, 100)}...`);
          return cleaned;
        }
      }

      // Fallback: try to find text in response
      if (data.text) {
        const cleaned = data.text.trim();
        logger.debug(`HuggingFace response received (fallback): ${cleaned.substring(0, 100)}...`);
        return cleaned;
      }

      // If no content found, log and return null
      logger.warn('HuggingFace API returned response without content', { data });
      return null;
    } catch (error: any) {
      logger.error('Error calling Hugging Face API:', error);
      // Re-throw with more context
      if (error.message) {
        throw error;
      }
      throw new Error(`Failed to generate text: ${error.toString()}`);
    }
  }

  /**
   * Check if AI service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }
}

// Singleton instance
export const huggingFaceService = new HuggingFaceService();

