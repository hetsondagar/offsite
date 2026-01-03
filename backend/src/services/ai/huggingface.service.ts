/**
 * Hugging Face API Service
 * Handles text generation using Hugging Face Inference API
 * 
 * Rules:
 * - Only uses structured data from MongoDB
 * - Never fabricates or assumes data
 * - Returns explainable, traceable responses
 */

import { env } from '../../config/env';
import { logger } from '../../utils/logger';

interface HuggingFaceResponse {
  generated_text?: string;
  error?: string;
}

export class HuggingFaceService {
  private apiKey: string;
  private baseUrl = 'https://api-inference.huggingface.co'; // Keep using inference API for now
  private model = 'mistralai/Mistral-7B-Instruct-v0.2'; // Good for structured reasoning

  constructor() {
    this.apiKey = env.HUGGINGFACE_API_KEY || '';
    if (!this.apiKey && process.env.NODE_ENV === 'production') {
      logger.warn('HUGGINGFACE_API_KEY not set - AI features will be disabled');
    }
  }

  /**
   * Generate text using Hugging Face API
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
      // Use inference API endpoint
      // Note: router.huggingface.co may require different format - using inference API for compatibility
      const inferenceUrl = `${this.baseUrl}/models/${this.model}`;
      const response = await fetch(inferenceUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: maxLength,
            temperature: 0.7,
            top_p: 0.9,
            return_full_text: false,
          },
        }),
      });

      // Read response body first (before checking status)
      const responseText = await response.text();
      let data: any;
      
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        // If response is not JSON, it's likely an error
        if (response.status === 410) {
          logger.warn('Hugging Face inference API is deprecated. Response may not be parseable.');
          return null;
        }
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 100)}`);
      }

      // Handle deprecation warning (410) - endpoint still works despite warning
      if (response.status === 410) {
        logger.warn('Hugging Face inference API is deprecated but still functional. Response may still be valid.');
        // Continue processing if we have valid data
      } else if (!response.ok) {
        const errorText = responseText;
        logger.error(`Hugging Face API error: ${response.status} - ${errorText}`);
        
        // Handle rate limiting
        if (response.status === 429) {
          throw new Error('AI service is rate-limited. Please try again in a moment.');
        }
        
        // For other errors, check if data has error field
        if (data.error) {
          throw new Error(`AI service error: ${data.error}`);
        }
        
        throw new Error(`AI service error: ${response.status}`);
      }
      
      // Handle new router API format (chat completions)
      if (data.choices && data.choices.length > 0) {
        const text = data.choices[0].message?.content || data.choices[0].text || '';
        return text.trim();
      }
      
      // Fallback: Handle old format (for compatibility)
      const result = Array.isArray(data) ? data[0] : data;
      
      // Check for error field, but allow 410 status to proceed if we have generated_text
      if (result.error && response.status !== 410) {
        logger.error(`Hugging Face API error: ${result.error}`);
        throw new Error(`AI service error: ${result.error}`);
      }
      
      // If 410 status with error, log warning but still try to extract text
      if (result.error && response.status === 410) {
        logger.warn(`Hugging Face API deprecated warning: ${result.error}`);
        // Continue to check for generated_text even with error
      }

      if (result.generated_text) {
        // Clean up the response (remove prompt if included)
        let cleaned = result.generated_text.trim();
        if (cleaned.startsWith(prompt)) {
          cleaned = cleaned.substring(prompt.length).trim();
        }
        return cleaned;
      }
      
      // If we have an error but no generated_text, return null
      if (result.error) {
        logger.warn('Hugging Face API returned error without generated text');
        return null;
      }

      return null;
    } catch (error: any) {
      logger.error('Error calling Hugging Face API:', error);
      throw error;
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

