/// <reference types="vite/client" />

interface Tally {
  openPopup: (formId: string) => void;
}

declare global {
  interface Window {
    Tally?: Tally;
  }
}

export {};
