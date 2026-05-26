interface Channel {
  location?: string;
  duration?: number;
  attributes?: {
    "tvg-id": string;
    "tvg-logo": string;
    "group-title": string;
  };
  customData?: [string];
  name?: string;
}

interface Playlist {
  name: string;
  playlist: string;
}

export type { Channel, Playlist };
