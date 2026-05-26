export {};

declare global {
  interface Window {
    electronAPI?: {
      setWindowSize: (w: number, h: number) => void;
      playInVLC: (url: string) => void;
      stopVLC: () => void;
    };
  }
}