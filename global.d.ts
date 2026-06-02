export {};

declare global {
  interface Window {
    electronAPI?: {
      setWindowSize: (w: number, h: number) => void;
      fetchM3U: (url: string) => Promise<string>;
      validateM3U: (url: string) => Promise<boolean>;
      openPiP: (url: string) => void;
      closePiP: () => void;
      playMpv: (url: string) => void;
      stopMpv: () => void;
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

