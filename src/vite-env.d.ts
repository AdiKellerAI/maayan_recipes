/// <reference types="vite/client" />

// Extend Window interface for garbage collection
declare global {
  interface Window {
    gc?: () => void;
  }
  
  interface IDBFactory {
    databases(): Promise<IDBDatabaseInfo[]>;
  }
  
  interface IDBDatabaseInfo {
    name: string;
    version: number;
  }
}

export {};
