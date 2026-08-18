export type MusicTrack = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  duration?: string;
};

export type MusicPlayerState = {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string;
  playing: boolean;
  progress: number;
};

export type MusicAction =
  | {
      type: "play";
      track?: MusicTrack;
      query?: string;
    }
  | {
      type: "pause";
    }
  | {
      type: "resume";
    }
  | {
      type: "next";
    }
  | {
      type: "previous";
    }
  | {
      type: "stop";
    }
  | {
      type: "search";
      query: string;
    };