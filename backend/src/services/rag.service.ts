import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

interface DocumentChunk {
  content: string;
  source: string;
  metadata?: Record<string, any>;
}

/**
 * RAG Service - Retrieval-Augmented Generation
 * Indexes policy documents and retrieves relevant chunks for LLM context
 */
class RAGService {
  private documentsPath: string;
  private chunks: DocumentChunk[] = [];
  private isIndexed: boolean = false;

  constructor() {
    // Path to rag-docs from compiled JS (in dist/) or source
    this.documentsPath = path.join(process.cwd(), 'rag-docs');
    this.loadDocuments();
  }

  /**
   * Load and chunk documents from rag-docs directory
   */
  private loadDocuments(): void {
    try {
      if (!fs.existsSync(this.documentsPath)) {
        logger.warn('RAG documents directory not found, using empty index');
        this.chunks = [];
        this.isIndexed = true;
        return;
      }

      const files = fs.readdirSync(this.documentsPath).filter(f => f.endsWith('.md'));
      
      this.chunks = [];
      for (const file of files) {
        const filePath = path.join(this.documentsPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Simple chunking by sections (## headers)
        const sections = content.split(/\n## /);
        for (let i = 0; i < sections.length; i++) {
          const section = i === 0 ? sections[i] : '## ' + sections[i];
          if (section.trim().length > 50) { // Only include substantial chunks
            this.chunks.push({
              content: section.trim(),
              source: file,
              metadata: { section: i },
            });
          }
        }
      }

      this.isIndexed = true;
      logger.info(`RAG service: Indexed ${this.chunks.length} chunks from ${files.length} documents`);
    } catch (error) {
      logger.error('Error loading RAG documents:', error);
      this.chunks = [];
      this.isIndexed = true;
    }
  }

  /**
   * Retrieve relevant document chunks based on query
   * Uses simple keyword matching (can be enhanced with embeddings)
   */
  async retrieveRelevantChunks(query: string, maxChunks: number = 3): Promise<DocumentChunk[]> {
    if (!this.isIndexed) {
      await this.loadDocuments();
    }

    if (this.chunks.length === 0) {
      return [];
    }

    // Simple keyword-based retrieval
    // In production, use embeddings for semantic search
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/);

    const scoredChunks = this.chunks.map(chunk => {
      const contentLower = chunk.content.toLowerCase();
      let score = 0;

      // Count term matches
      for (const term of queryTerms) {
        if (term.length > 2) { // Ignore short terms
          const matches = (contentLower.match(new RegExp(term, 'g')) || []).length;
          score += matches;
        }
      }

      // Boost score for title/header matches
      if (chunk.content.match(/^#+\s+/)) {
        const header = chunk.content.split('\n')[0].toLowerCase();
        if (queryTerms.some(term => header.includes(term))) {
          score += 5;
        }
      }

      return { chunk, score };
    });

    // Sort by score and return top chunks
    return scoredChunks
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map(item => item.chunk);
  }

  /**
   * Get RAG context for LLM prompt
   */
  async getRAGContext(query: string): Promise<string> {
    const chunks = await this.retrieveRelevantChunks(query, 3);
    
    if (chunks.length === 0) {
      return '';
    }

    const context = chunks
      .map((chunk, idx) => `[Document ${idx + 1} from ${chunk.source}]\n${chunk.content}`)
      .join('\n\n---\n\n');

    return `\n\nRelevant Guidelines and Policies:\n${context}\n\n`;
  }

  /**
   * Enhanced retrieval with embeddings (optional enhancement)
   * For now, uses keyword matching. Can be enhanced with OpenAI embeddings API
   */
  async retrieveWithEmbeddings(query: string, maxChunks: number = 3): Promise<DocumentChunk[]> {
    // For demo, fall back to keyword matching
    // In production, generate embeddings for query and chunks, then cosine similarity
    return this.retrieveRelevantChunks(query, maxChunks);
  }
}

export const ragService = new RAGService();

