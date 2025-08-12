// Browser-compatible mock for PostgreSQL library
// This prevents Node.js-specific 'pg' library from running in the browser

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export class Pool {
  constructor(config?: any) {
    if (isBrowser) {
      console.log('📦 PostgreSQL Pool created in browser (mock mode)');
    }
  }

  async query(text: string, params?: any[]): Promise<any> {
    if (isBrowser) {
      // In browser, we don't actually connect to PostgreSQL
      // Return empty result to indicate no connection
      return { rows: [] };
    }
    
    // This shouldn't be reached in browser, but just in case
    throw new Error('PostgreSQL not available in browser environment');
  }

  async connect(): Promise<any> {
    if (isBrowser) {
      // Return a mock client that also fails gracefully
      return {
        query: async (text: string, params?: any[]) => {
          return { rows: [] };
        },
        release: () => {
          // Mock release
        }
      };
    }
    
    throw new Error('PostgreSQL not available in browser environment');
  }

  async end(): Promise<void> {
    // Mock implementation
  }

  on(event: string, callback: Function): void {
    // Mock implementation
  }
}

export class Client {
  constructor(config?: any) {
    // Mock implementation
  }

  async query(text: string, params?: any[]): Promise<any> {
    return { rows: [] };
  }

  async connect(): Promise<void> {
    // Mock implementation
  }

  async end(): Promise<void> {
    // Mock implementation
  }
}

// Default export to match pg library structure
export default {
  Pool,
  Client
};