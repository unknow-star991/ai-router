"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type {
  MusicPlayerState,
  MusicTrack,
} from "@/components/music";

export function useMusicPlayer() {
  const [queue, setQueue] =
    useState<MusicTrack[]>([]);

  const [currentIndex, setCurrentIndex] =
    useState(-1);

  const [playing, setPlaying] =
    useState(false);

  const [progress, setProgress] =
    useState(0);

  const currentTrack =
    currentIndex >= 0
      ? queue[currentIndex]
      : null;

  const playerState: MusicPlayerState | null =
    currentTrack
      ? {
          videoId: currentTrack.videoId,
          title: currentTrack.title,
          channel: currentTrack.channel,
          thumbnail: currentTrack.thumbnail,
          playing,
          progress,
        }
      : null;

  const playTrack = useCallback(
    (
      track: MusicTrack,
      newQueue?: MusicTrack[]
    ) => {
      const nextQueue =
        newQueue && newQueue.length
          ? newQueue
          : [track];

      const index = nextQueue.findIndex(
        (item) =>
          item.videoId === track.videoId
      );

      setQueue(nextQueue);
      setCurrentIndex(
        index >= 0 ? index : 0
      );
      setPlaying(true);
      setProgress(0);
    },
    []
  );

  const playSearchResult = useCallback(
    async (query: string) => {
      const response =
        await fetch(
          `/api/music/search?q=${encodeURIComponent(
            query
          )}`
        );

      if (!response.ok) {
        throw new Error(
          "Music search failed"
        );
      }

      const data =
        await response.json();

      const tracks: MusicTrack[] =
        data.tracks ?? [];

      if (!tracks.length) {
        return null;
      }

      playTrack(
        tracks[0],
        tracks
      );

      return tracks[0];
    },
    [playTrack]
  );

  const toggle = useCallback(() => {
    setPlaying((value) => !value);
  }, []);

  const pause = useCallback(() => {
    setPlaying(false);
  }, []);

  const resume = useCallback(() => {
    if (currentTrack) {
      setPlaying(true);
    }
  }, [currentTrack]);

  const next = useCallback(() => {
    if (!queue.length) {
      return;
    }

    setCurrentIndex((index) => {
      const nextIndex =
        index + 1;

      if (
        nextIndex >= queue.length
      ) {
        return 0;
      }

      return nextIndex;
    });

    setProgress(0);
    setPlaying(true);
  }, [queue.length]);

  const previous = useCallback(() => {
    if (!queue.length) {
      return;
    }

    setCurrentIndex((index) => {
      const previousIndex =
        index - 1;

      if (previousIndex < 0) {
        return queue.length - 1;
      }

      return previousIndex;
    });

    setProgress(0);
    setPlaying(true);
  }, [queue.length]);

  const stop = useCallback(() => {
    setPlaying(false);
    setProgress(0);
  }, []);

  const close = useCallback(() => {
    setPlaying(false);
    setProgress(0);
    setQueue([]);
    setCurrentIndex(-1);
  }, []);

  const setPlayerProgress =
    useCallback(
      (value: number) => {
        setProgress(
          Math.max(
            0,
            Math.min(100, value)
          )
        );
      },
      []
    );

  return useMemo(
    () => ({
      queue,
      currentTrack,
      playerState,

      playTrack,
      playSearchResult,

      toggle,
      pause,
      resume,
      next,
      previous,
      stop,
      close,

      setPlayerProgress,
    }),
    [
      queue,
      currentTrack,
      playerState,
      playTrack,
      playSearchResult,
      toggle,
      pause,
      resume,
      next,
      previous,
      stop,
      close,
      setPlayerProgress,
    ]
  );
}