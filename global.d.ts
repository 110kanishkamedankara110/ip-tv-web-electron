export {};

declare global {
  interface Window {
    electronAPI?: {
      setWindowSize: (w: number, h: number) => void;
      playInVLC: (url: string) => void;
      stopVLC: () => void;
      fetchM3U: (url: string) => Promise<string>;
    };
  }
  type Toast = {
  id: number;
  message: string;
  type?: "success" | "error" | "info";
};
}

