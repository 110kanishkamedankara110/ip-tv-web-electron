export {};

declare global {
  interface Window {
    electronAPI?: {
      setWindowSize: (w: number, h: number) => void;
      fetchM3U: (url: string) => Promise<string>;
      validateM3U: (url: string) => Promise<boolean>;
      openPiP: (url: string) => void;
      closePiP: () => void;
      playvlc: (url: string) => void;
      stopvlc: () => void;
      enterPiPMode: (url: string) => void;
      exitPiPMode: () => void;
    };
  }
  type Toast = {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
};
}

