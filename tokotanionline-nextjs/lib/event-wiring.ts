/**
 * PHASE 2: Event Wiring Minimal
 * 
 * Frontend HANYA mendengar:
 * - CONTENT_PRODUCED → refresh preview
 * - CONTENT_PUBLISHED → render live
 * 
 * ❌ Frontend TIDAK BOLEH memanggil:
 * - AI Generator
 * - SEO Engine
 */

type EventType = 'CONTENT_PRODUCED' | 'CONTENT_PUBLISHED';

interface EventData {
  pageId: string;
  version: number;
  timestamp: string;
  [key: string]: any;
}

type EventHandler = (data: EventData) => void;

class EventBus {
  private handlers: Map<EventType, Set<EventHandler>> = new Map();

  /**
   * Subscribe to event
   * Frontend HANYA listen, tidak emit
   */
  subscribe(event: EventType, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  /**
   * Emit event (only for internal use, not from frontend)
   * PHASE 2: Frontend tidak boleh emit events
   */
  private emit(event: EventType, data: EventData): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[EVENT BUS] Error in handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Handle CONTENT_PRODUCED event
   * Refresh preview when new content is produced
   */
  handleContentProduced(data: EventData): void {
    this.emit('CONTENT_PRODUCED', data);
  }

  /**
   * Handle CONTENT_PUBLISHED event
   * Render live when content is published
   */
  handleContentPublished(data: EventData): void {
    this.emit('CONTENT_PUBLISHED', data);
  }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Subscribe to CONTENT_PRODUCED
 * Frontend uses this to refresh preview
 */
export function onContentProduced(handler: EventHandler): () => void {
  return eventBus.subscribe('CONTENT_PRODUCED', handler);
}

/**
 * Subscribe to CONTENT_PUBLISHED
 * Frontend uses this to render live
 */
export function onContentPublished(handler: EventHandler): () => void {
  return eventBus.subscribe('CONTENT_PUBLISHED', handler);
}

/**
 * PHASE 2: Frontend tidak boleh memanggil AI Generator
 * This function is blocked for frontend use
 */
export function generateContent() {
  throw new Error(
    'PHASE 2: Frontend tidak boleh memanggil AI Generator. ' +
    'Use server-side API endpoint instead.'
  );
}

/**
 * PHASE 2: Frontend tidak boleh memanggil SEO Engine
 * This function is blocked for frontend use
 */
export function optimizeSEO() {
  throw new Error(
    'PHASE 2: Frontend tidak boleh memanggil SEO Engine. ' +
    'SEO optimization is done server-side only.'
  );
}
