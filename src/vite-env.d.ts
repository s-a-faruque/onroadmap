/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
}

interface Tally {
  openPopup: (formId: string) => void;
}

declare global {
  interface Window {
    Tally?: Tally;
  }
}

export {};
