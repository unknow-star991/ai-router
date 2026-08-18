"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import Sidebar from "@/components/Sidebar";
import MobileSidebar from "@/components/MobileSidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatArea from "@/components/ChatArea";
import Composer from "@/components/Composer";

import type {
  ChatMessage,
  ModelInfo,
  TokenUsage,
} from "@/components/types";

import type { AISettings } from "@/lib/ai-settings-types";

/*
|--------------------------------------------------------------------------
| STORAGE
|--------------------------------------------------------------------------
*/

const STORAGE_KEY = "ai-router-messages";
const CONVERSATION_KEY = "ai-router-conversation-id";
const USAGE_KEY = "ai-router-free-usage";

const MAX_FREE_USAGE = 10;

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type MediaType = "music" | "video";

type MediaResult = {
  videoId: string;
  title: string;
  channelTitle?: string;
  thumbnail?: string;
  youtubeUrl: string;
};

type MediaControl =
  | "play"
  | "pause"
  | "next"
  | "previous"
  | "close";

type MediaAction =
  | {
      type: "play_media";
      query: string;
      mediaType: MediaType;
    }
  | {
      type: "media_control";
      action: MediaControl;
    };

/*
|--------------------------------------------------------------------------
| YOUTUBE GLOBAL TYPES
|--------------------------------------------------------------------------
*/

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: string | HTMLElement,
        options: {
          videoId: string;

          playerVars?: Record<
            string,
            number | string
          >;

          events?: {
            onReady?: (event: {
              target: {
                playVideo: () => void;
                pauseVideo: () => void;
                loadVideoById: (
                  videoId: string
                ) => void;
                getCurrentTime: () => number;
                getDuration: () => number;
              };
            }) => void;

            onStateChange?: (event: {
              data: number;
            }) => void;
          };
        }
      ) => {
        playVideo: () => void;
        pauseVideo: () => void;

        loadVideoById: (
          videoId: string
        ) => void;

        getCurrentTime: () => number;
        getDuration: () => number;

        destroy: () => void;
      };
    };

    onYouTubeIframeAPIReady?: () => void;
  }
}

/*
|--------------------------------------------------------------------------
| YOUTUBE STATES
|--------------------------------------------------------------------------
*/

const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

/*
|--------------------------------------------------------------------------
| TOKEN ESTIMATION
|--------------------------------------------------------------------------
*/

function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }

  return Math.max(
    1,
    Math.ceil(text.length / 4)
  );
}

/*
|--------------------------------------------------------------------------
| MODEL COST
|--------------------------------------------------------------------------
*/

function estimateCost(
  totalTokens: number,
  model: ModelInfo | undefined
): number {
  if (
    !model ||
    !model.cost ||
    model.cost <= 0
  ) {
    return 0;
  }

  return totalTokens * model.cost;
}

/*
|--------------------------------------------------------------------------
| MEDIA ACTION PARSER
|--------------------------------------------------------------------------
*/

function parseMediaAction(
  header: string | null
): MediaAction | null {
  if (!header) {
    return null;
  }

  try {
    const parsed = JSON.parse(header);

    if (
      parsed?.type === "play_media" &&
      typeof parsed.query === "string"
    ) {
      return {
        type: "play_media",
        query: parsed.query.trim(),
        mediaType:
          parsed.mediaType === "video"
            ? "video"
            : "music",
      };
    }

    if (
      parsed?.type === "media_control"
    ) {
      const allowed: MediaControl[] = [
        "play",
        "pause",
        "next",
        "previous",
        "close",
      ];

      if (
        !allowed.includes(
          parsed.action
        )
      ) {
        return null;
      }

      return {
        type: "media_control",
        action: parsed.action,
      };
    }

    return null;
  } catch {
    console.warn(
      "[NEXA MEDIA] Failed to parse media action"
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| SEARCH YOUTUBE
|--------------------------------------------------------------------------
|
| Search biasa.
| Dipakai ketika AI meminta lagu/video secara langsung.
|
*/

async function searchYouTube(
  query: string,
  excludedVideoIds: string[] = []
): Promise<MediaResult | null> {
  try {
    const response = await fetch(
      `/api/youtube/search?q=${encodeURIComponent(
        query
      )}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `YouTube search failed: ${response.status}`
      );
    }

    const data = await response.json();

    const results =
      Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data)
          ? data
          : [];

    if (results.length === 0) {
      return null;
    }

    /*
    |----------------------------------------------------------------------
    | CARI HASIL YANG BELUM ADA DI QUEUE
    |----------------------------------------------------------------------
    */

    const result =
      results.find(
        (item: {
          videoId?: string;
        }) =>
          item?.videoId &&
          !excludedVideoIds.includes(
            String(item.videoId)
          )
      ) ?? results[0];

    if (!result?.videoId) {
      return null;
    }

    const videoId = String(
      result.videoId
    );

    return {
      videoId,

      title: String(
        result.title ?? query
      ),

      channelTitle:
        result.channelTitle
          ? String(
              result.channelTitle
            )
          : undefined,

      thumbnail:
        result.thumbnail
          ? String(
              result.thumbnail
            )
          : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,

      youtubeUrl:
        result.youtubeUrl ??
        `https://www.youtube.com/watch?v=${videoId}`,
    };
  } catch (error) {
    console.error(
      "[NEXA YOUTUBE] Search error:",
      error
    );

    return null;
  }
}

/*
|--------------------------------------------------------------------------
| SEARCH RELATED MUSIC
|--------------------------------------------------------------------------
|
| Ini khusus tombol NEXT.
|
| Tujuannya bukan mencari lagu random.
| Query dibuat berdasarkan lagu yang sedang dimainkan.
|
*/

async function searchRelatedMusic(
  currentMedia: MediaResult,
  excludedVideoIds: string[]
): Promise<MediaResult | null> {
  const title =
    currentMedia.title
      .replace(
        /\(official.*?\)/gi,
        ""
      )
      .replace(
        /\[official.*?\]/gi,
        ""
      )
      .replace(
        /\b(official\s*)?(audio|video|lyrics?|music video|mv|visualizer)\b/gi,
        ""
      )
      .trim();

  const channel =
    currentMedia.channelTitle
      ?.replace(
        /\b(official|vevo)\b/gi,
        ""
      )
      .trim();

  /*
  |----------------------------------------------------------------------
  | QUERY PRIORITAS
  |----------------------------------------------------------------------
  |
  | Kita coba beberapa pola.
  | Kalau hasil pertama sama dengan lagu sekarang,
  | coba pola berikutnya.
  |
  */

  const queries = [
    `${title} ${channel ?? ""} similar songs`,
    `songs like ${title} ${channel ?? ""}`,
    `${channel ?? ""} similar music`,
    `${title} recommended songs`,
  ].filter(
    (query) => query.trim().length > 0
  );

  for (const query of queries) {
    const result =
      await searchYouTube(
        query,
        excludedVideoIds
      );

    if (
      result &&
      !excludedVideoIds.includes(
        result.videoId
      )
    ) {
      return result;
    }
  }

  return null;
}

/*
|--------------------------------------------------------------------------
| SAVE MEDIA HISTORY
|--------------------------------------------------------------------------
*/

async function savePlayedMedia(
  media: MediaResult,
  query: string,
  conversationId: string | null,
  mediaType: MediaType
) {
  try {
    const response = await fetch(
      "/api/media/history",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          conversationId,
          mediaType,
          videoId: media.videoId,
          title: media.title,
          channelTitle:
            media.channelTitle ?? null,
          thumbnail:
            media.thumbnail ?? null,
          youtubeUrl: media.youtubeUrl,
          query,
        }),
      }
    );

    if (!response.ok) {
      const text =
        await response.text();

      console.error(
        "[NEXA MEDIA HISTORY]",
        text
      );

      return;
    }

    console.log(
      "[NEXA MEDIA HISTORY] Saved:",
      media.title
    );
  } catch (error) {
    console.error(
      "[NEXA MEDIA HISTORY] Save error:",
      error
    );
  }
}

/*
|--------------------------------------------------------------------------
| YOUTUBE PLAYER
|--------------------------------------------------------------------------
|
| Player YouTube tetap ada sebagai audio engine.
| Tidak memenuhi layar.
|
*/

type YouTubePlayerProps = {
  media: MediaResult | null;
  playing: boolean;

  onPlayingChange: (
    playing: boolean
  ) => void;

  onProgress: (
    progress: number
  ) => void;

  onEnded: () => void;
};

function YouTubePlayer({
  media,
  playing,
  onPlayingChange,
  onProgress,
  onEnded,
}: YouTubePlayerProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const playerRef =
    useRef<{
      playVideo: () => void;
      pauseVideo: () => void;

      loadVideoById: (
        videoId: string
      ) => void;

      getCurrentTime: () => number;
      getDuration: () => number;

      destroy: () => void;
    } | null>(null);

  const intervalRef =
    useRef<ReturnType<
      typeof setInterval
    > | null>(null);

  /*
  |--------------------------------------------------------------------------
  | LOAD YOUTUBE API
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      typeof window === "undefined"
    ) {
      return;
    }

    if (window.YT?.Player) {
      return;
    }

    const existing =
      document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

    if (!existing) {
      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://www.youtube.com/iframe_api";

      script.async = true;

      document.body.appendChild(
        script
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | CREATE PLAYER
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (!media) {
      return;
    }

    let cancelled = false;

    const createPlayer = () => {
      if (
        cancelled ||
        !containerRef.current ||
        !window.YT?.Player
      ) {
        return;
      }

      /*
      |----------------------------------------------------------------------
      | DESTROY PLAYER LAMA
      |----------------------------------------------------------------------
      */

      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // Ignore.
        }

        playerRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML =
          "";
      }

      /*
      |----------------------------------------------------------------------
      | CREATE ELEMENT
      |----------------------------------------------------------------------
      */

      const element =
        document.createElement(
          "div"
        );

      containerRef.current.appendChild(
        element
      );

      /*
      |----------------------------------------------------------------------
      | CREATE YOUTUBE PLAYER
      |----------------------------------------------------------------------
      */

      playerRef.current =
        new window.YT.Player(
          element,
          {
            videoId:
              media.videoId,

            playerVars: {
              autoplay: 1,
              playsinline: 1,
              controls: 0,
              rel: 0,
              modestbranding: 1,
              enablejsapi: 1,
            },

            events: {
              onReady: ({
                target,
              }) => {
                if (cancelled) {
                  return;
                }

                if (playing) {
                  target.playVideo();
                } else {
                  target.pauseVideo();
                }
              },

              onStateChange: ({
                data,
              }) => {
                if (cancelled) {
                  return;
                }

                if (
                  data === YT_PLAYING
                ) {
                  onPlayingChange(
                    true
                  );
                }

                if (
                  data === YT_PAUSED
                ) {
                  onPlayingChange(
                    false
                  );
                }

                if (
                  data === YT_ENDED
                ) {
                  onPlayingChange(
                    false
                  );

                  onEnded();
                }
              },
            },
          }
        );
    };

    /*
    |--------------------------------------------------------------------------
    | API SUDAH ADA
    |--------------------------------------------------------------------------
    */

    if (window.YT?.Player) {
      createPlayer();

      return () => {
        cancelled = true;
      };
    }

    /*
    |--------------------------------------------------------------------------
    | API BELUM ADA
    |--------------------------------------------------------------------------
    */

    const previous =
      window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady =
      () => {
        previous?.();

        createPlayer();
      };

    return () => {
      cancelled = true;

      window.onYouTubeIframeAPIReady =
        previous;
    };
  }, [
    media?.videoId,
  ]);

  /*
  |--------------------------------------------------------------------------
  | PLAY / PAUSE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const player =
      playerRef.current;

    if (!player) {
      return;
    }

    try {
      if (playing) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    } catch {
      // Player belum ready.
    }
  }, [playing]);

  /*
  |--------------------------------------------------------------------------
  | PROGRESS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      intervalRef.current
    ) {
      clearInterval(
        intervalRef.current
      );

      intervalRef.current =
        null;
    }

    if (!media) {
      return;
    }

    intervalRef.current =
      setInterval(() => {
        const player =
          playerRef.current;

        if (!player) {
          return;
        }

        try {
          const current =
            player.getCurrentTime();

          const duration =
            player.getDuration();

          if (
            duration > 0 &&
            Number.isFinite(
              current
            )
          ) {
            onProgress(
              Math.min(
                100,
                Math.max(
                  0,
                  (current /
                    duration) *
                    100
                )
              )
            );
          }
        } catch {
          // Ignore.
        }
      }, 500);

    return () => {
      if (
        intervalRef.current
      ) {
        clearInterval(
          intervalRef.current
        );

        intervalRef.current =
          null;
      }
    };
  }, [
    media?.videoId,
    onProgress,
  ]);

  /*
  |--------------------------------------------------------------------------
  | CLEANUP
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    return () => {
      if (
        intervalRef.current
      ) {
        clearInterval(
          intervalRef.current
        );
      }

      try {
        playerRef.current?.destroy();
      } catch {
        // Ignore.
      }

      playerRef.current = null;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | HIDDEN PLAYER
  |--------------------------------------------------------------------------
  */

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        width: "1px",
        height: "1px",
        overflow: "hidden",
        opacity: 0,
        pointerEvents: "none",
        left: "-9999px",
        top: "-9999px",
      }}
    />
  );
}

/*
|--------------------------------------------------------------------------
| HOME
|--------------------------------------------------------------------------
*/

export default function Home() {
  /*
  |--------------------------------------------------------------------------
  | CHAT STATE
  |--------------------------------------------------------------------------
  */

  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>([]);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    conversationId,
    setConversationId,
  ] = useState<string | null>(
    null
  );

  /*
  |--------------------------------------------------------------------------
  | MODEL
  |--------------------------------------------------------------------------
  */

  const [
    models,
    setModels,
  ] = useState<ModelInfo[]>([]);

  const [
    selectedModel,
    setSelectedModel,
  ] = useState(
    "openrouter/free"
  );

  /*
  |--------------------------------------------------------------------------
  | UI
  |--------------------------------------------------------------------------
  */

  const [
    mobileSidebar,
    setMobileSidebar,
  ] = useState(false);

  const [
    usage,
    setUsage,
  ] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | AI SETTINGS
  |--------------------------------------------------------------------------
  */

  const [
    aiSettings,
    setAISettings,
  ] = useState<AISettings | null>(
    null
  );

  /*
  |--------------------------------------------------------------------------
  | MEDIA
  |--------------------------------------------------------------------------
  */

  const [
    currentMedia,
    setCurrentMedia,
  ] = useState<MediaResult | null>(
    null
  );

  const [
    mediaLoading,
    setMediaLoading,
  ] = useState(false);

  const [
    mediaPlaying,
    setMediaPlaying,
  ] = useState(false);

  const [
    mediaProgress,
    setMediaProgress,
  ] = useState(0);

  const [
    mediaQueue,
    setMediaQueue,
  ] = useState<MediaResult[]>([]);

  const [
    mediaIndex,
    setMediaIndex,
  ] = useState(-1);

  /*
  |--------------------------------------------------------------------------
  | MEDIA REFS
  |--------------------------------------------------------------------------
  */

  const mediaQueueRef =
    useRef<MediaResult[]>([]);

  const mediaIndexRef =
    useRef(-1);

  const currentMediaRef =
    useRef<MediaResult | null>(
      null
    );

  const nextLoadingRef =
    useRef(false);

  useEffect(() => {
    mediaQueueRef.current =
      mediaQueue;
  }, [mediaQueue]);

  useEffect(() => {
    mediaIndexRef.current =
      mediaIndex;
  }, [mediaIndex]);

  useEffect(() => {
    currentMediaRef.current =
      currentMedia;
  }, [currentMedia]);

  /*
  |--------------------------------------------------------------------------
  | LOAD LOCAL DATA
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      const savedMessages =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (savedMessages) {
        const parsed =
          JSON.parse(
            savedMessages
          );

        if (
          Array.isArray(parsed)
        ) {
          setMessages(parsed);
        }
      }

      const savedConversation =
        localStorage.getItem(
          CONVERSATION_KEY
        );

      if (savedConversation) {
        setConversationId(
          savedConversation
        );
      }

      const savedUsage =
        localStorage.getItem(
          USAGE_KEY
        );

      if (savedUsage) {
        const parsedUsage =
          Number(savedUsage);

        if (
          Number.isFinite(
            parsedUsage
          )
        ) {
          setUsage(
            Math.min(
              MAX_FREE_USAGE,
              Math.max(
                0,
                parsedUsage
              )
            )
          );
        }
      }
    } catch (error) {
      console.error(
        "Failed to load local data:",
        error
      );
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | SAVE MESSAGES
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(messages)
      );
    } catch (error) {
      console.error(
        "Failed to save messages:",
        error
      );
    }
  }, [messages]);

  /*
  |--------------------------------------------------------------------------
  | SAVE CONVERSATION
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem(
          CONVERSATION_KEY,
          conversationId
        );
      } else {
        localStorage.removeItem(
          CONVERSATION_KEY
        );
      }
    } catch (error) {
      console.error(
        "Failed to save conversation:",
        error
      );
    }
  }, [conversationId]);

  /*
  |--------------------------------------------------------------------------
  | SAVE USAGE
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    try {
      localStorage.setItem(
        USAGE_KEY,
        String(usage)
      );
    } catch (error) {
      console.error(
        "Failed to save usage:",
        error
      );
    }
  }, [usage]);

  /*
  |--------------------------------------------------------------------------
  | LOAD MODELS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    async function loadModels() {
      try {
        const response =
          await fetch(
            "/api/models",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          throw new Error(
            `Failed to load models: ${response.status}`
          );
        }

        const data =
          await response.json();

        const loadedModels =
          Array.isArray(data)
            ? data
            : Array.isArray(
                data?.models
              )
              ? data.models
              : [];

        if (mounted) {
          setModels(
            loadedModels
          );
        }
      } catch (error) {
        console.error(
          "Model loading error:",
          error
        );
      }
    }

    loadModels();

    return () => {
      mounted = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | LOAD AI SETTINGS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let mounted = true;

    async function loadAISettings() {
      try {
        const response =
          await fetch(
            "/api/ai-settings",
            {
              method: "GET",
              cache: "no-store",
            }
          );

        if (!response.ok) {
          return;
        }

        const data =
          await response.json();

        if (
          mounted &&
          data?.success &&
          data?.settings
        ) {
          setAISettings(
            data.settings
          );
        }
      } catch (error) {
        console.error(
          "AI settings error:",
          error
        );
      }
    }

    loadAISettings();

    return () => {
      mounted = false;
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | REFRESH SETTINGS
  |--------------------------------------------------------------------------
  */

  async function refreshAISettings() {
    try {
      const response =
        await fetch(
          "/api/ai-settings",
          {
            method: "GET",
            cache: "no-store",
          }
        );

      if (!response.ok) {
        return;
      }

      const data =
        await response.json();

      if (
        data?.success &&
        data?.settings
      ) {
        setAISettings(
          data.settings
        );
      }
    } catch (error) {
      console.error(
        "Failed to refresh AI settings:",
        error
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | ADD MEDIA TO QUEUE
  |--------------------------------------------------------------------------
  */

  const addMediaToQueue =
    useCallback(
      (media: MediaResult) => {
        const existingIndex =
          mediaQueueRef.current.findIndex(
            (item) =>
              item.videoId ===
              media.videoId
          );

        if (
          existingIndex !== -1
        ) {
          setMediaIndex(
            existingIndex
          );

          mediaIndexRef.current =
            existingIndex;

          return;
        }

        const nextQueue = [
          ...mediaQueueRef.current,
          media,
        ];

        const nextIndex =
          nextQueue.length - 1;

        mediaQueueRef.current =
          nextQueue;

        mediaIndexRef.current =
          nextIndex;

        setMediaQueue(
          nextQueue
        );

        setMediaIndex(
          nextIndex
        );
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | PLAY YOUTUBE
  |--------------------------------------------------------------------------
  */

  const playYouTube =
    useCallback(
      async (
        query: string,
        activeConversationId:
          | string
          | null,
        mediaType: MediaType
      ) => {
        setMediaLoading(true);

        try {
          const excludedIds =
            mediaQueueRef.current.map(
              (item) =>
                item.videoId
            );

          const media =
            await searchYouTube(
              query,
              excludedIds
            );

          if (!media) {
            console.warn(
              "[NEXA YOUTUBE] No result:",
              query
            );

            return;
          }

          currentMediaRef.current =
            media;

          setCurrentMedia(media);

          setMediaPlaying(true);

          setMediaProgress(0);

          addMediaToQueue(
            media
          );

          await savePlayedMedia(
            media,
            query,
            activeConversationId,
            mediaType
          );
        } catch (error) {
          console.error(
            "[NEXA YOUTUBE] Playback error:",
            error
          );
        } finally {
          setMediaLoading(false);
        }
      },
      [addMediaToQueue]
    );

  /*
  |--------------------------------------------------------------------------
  | PLAY RELATED NEXT SONG
  |--------------------------------------------------------------------------
  |
  | Ini inti perubahan.
  |
  | Next sekarang tidak bergantung pada queue
  | yang sudah terisi.
  |
  */

  const playNextRelated =
    useCallback(
      async () => {
        if (
          nextLoadingRef.current
        ) {
          return;
        }

        const current =
          currentMediaRef.current;

        if (!current) {
          return;
        }

        nextLoadingRef.current =
          true;

        setMediaLoading(true);

        try {
          const excludedIds =
            mediaQueueRef.current.map(
              (item) =>
                item.videoId
            );

          /*
          |----------------------------------------------------------------
          | CARI LAGU TERKAIT
          |----------------------------------------------------------------
          */

          const nextMedia =
            await searchRelatedMusic(
              current,
              excludedIds
            );

          if (!nextMedia) {
            console.warn(
              "[NEXA MUSIC] Tidak menemukan lagu terkait."
            );

            setMediaPlaying(false);

            return;
          }

          /*
          |----------------------------------------------------------------
          | MASUKKAN KE QUEUE
          |----------------------------------------------------------------
          */

          const nextQueue = [
            ...mediaQueueRef.current,
            nextMedia,
          ];

          const nextIndex =
            nextQueue.length - 1;

          mediaQueueRef.current =
            nextQueue;

          mediaIndexRef.current =
            nextIndex;

          setMediaQueue(
            nextQueue
          );

          setMediaIndex(
            nextIndex
          );

          /*
          |----------------------------------------------------------------
          | PLAY
          |----------------------------------------------------------------
          */

          currentMediaRef.current =
            nextMedia;

          setCurrentMedia(
            nextMedia
          );

          setMediaProgress(0);

          setMediaPlaying(true);

          /*
          |----------------------------------------------------------------
          | SAVE HISTORY
          |----------------------------------------------------------------
          */

          await savePlayedMedia(
            nextMedia,
            `related to ${current.title}`,
            conversationId,
            "music"
          );
        } catch (error) {
          console.error(
            "[NEXA MUSIC] Next error:",
            error
          );
        } finally {
          setMediaLoading(false);

          nextLoadingRef.current =
            false;
        }
      },
      [conversationId]
    );

  /*
  |--------------------------------------------------------------------------
  | MEDIA CONTROL
  |--------------------------------------------------------------------------
  */

  const controlMedia =
    useCallback(
      (action: MediaControl) => {
        switch (action) {
          /*
          |----------------------------------------------------------------
          | PLAY
          |----------------------------------------------------------------
          */

          case "play":
            setMediaPlaying(true);
            break;

          /*
          |----------------------------------------------------------------
          | PAUSE
          |----------------------------------------------------------------
          */

          case "pause":
            setMediaPlaying(false);
            break;

          /*
          |----------------------------------------------------------------
          | CLOSE
          |----------------------------------------------------------------
          */

          case "close":
            setMediaPlaying(false);

            setCurrentMedia(null);

            currentMediaRef.current =
              null;

            setMediaProgress(0);

            break;

          /*
          |----------------------------------------------------------------
          | NEXT
          |----------------------------------------------------------------
          */

          case "next": {
            const queue =
              mediaQueueRef.current;

            const currentIndex =
              mediaIndexRef.current;

            /*
            |--------------------------------------------------------------
            | Kalau queue masih punya lagu berikutnya,
            | gunakan lagu tersebut.
            |--------------------------------------------------------------
            */

            const nextIndex =
              currentIndex + 1;

            if (
              nextIndex <
              queue.length
            ) {
              const nextMedia =
                queue[nextIndex];

              mediaIndexRef.current =
                nextIndex;

              setMediaIndex(
                nextIndex
              );

              currentMediaRef.current =
                nextMedia;

              setCurrentMedia(
                nextMedia
              );

              setMediaProgress(0);

              setMediaPlaying(true);

              return;
            }

            /*
            |--------------------------------------------------------------
            | Kalau tidak ada, cari lagu baru yang relevan.
            |--------------------------------------------------------------
            */

            void playNextRelated();

            break;
          }

          /*
          |----------------------------------------------------------------
          | PREVIOUS
          |----------------------------------------------------------------
          */

          case "previous": {
            const queue =
              mediaQueueRef.current;

            const currentIndex =
              mediaIndexRef.current;

            if (
              queue.length === 0 ||
              currentIndex <= 0
            ) {
              return;
            }

            const previousIndex =
              currentIndex - 1;

            const previousMedia =
              queue[previousIndex];

            mediaIndexRef.current =
              previousIndex;

            setMediaIndex(
              previousIndex
            );

            currentMediaRef.current =
              previousMedia;

            setCurrentMedia(
              previousMedia
            );

            setMediaProgress(0);

            setMediaPlaying(true);

            break;
          }
        }
      },
      [playNextRelated]
    );

  /*
  |--------------------------------------------------------------------------
  | AUTO NEXT
  |--------------------------------------------------------------------------
  */

  const handleMediaEnded =
    useCallback(() => {
      const queue =
        mediaQueueRef.current;

      const currentIndex =
        mediaIndexRef.current;

      const nextIndex =
        currentIndex + 1;

      /*
      |----------------------------------------------------------------------
      | ADA DI QUEUE
      |----------------------------------------------------------------------
      */

      if (
        nextIndex <
        queue.length
      ) {
        const nextMedia =
          queue[nextIndex];

        mediaIndexRef.current =
          nextIndex;

        setMediaIndex(
          nextIndex
        );

        currentMediaRef.current =
          nextMedia;

        setCurrentMedia(
          nextMedia
        );

        setMediaProgress(0);

        setMediaPlaying(true);

        return;
      }

      /*
      |----------------------------------------------------------------------
      | QUEUE HABIS
      |
      | Cari lagu baru otomatis.
      |----------------------------------------------------------------------
      */

      void playNextRelated();
    }, [
      playNextRelated,
    ]);

  /*
  |--------------------------------------------------------------------------
  | SEND MESSAGE
  |--------------------------------------------------------------------------
  */

  async function sendMessage() {
    const text =
      message.trim();

    if (
      !text ||
      loading
    ) {
      return;
    }

    const activeConversationId =
      conversationId ??
      crypto.randomUUID();

    if (!conversationId) {
      setConversationId(
        activeConversationId
      );
    }

    /*
    |----------------------------------------------------------------------
    | USER MESSAGE
    |----------------------------------------------------------------------
    */

    const userMessage: ChatMessage =
      {
        id: crypto.randomUUID(),

        role: "user",

        content: text,

        createdAt: Date.now(),
      };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(
      nextMessages
    );

    setMessage("");

    setLoading(true);

    /*
    |----------------------------------------------------------------------
    | FREE USAGE
    |----------------------------------------------------------------------
    */

    setUsage(
      (current) =>
        Math.min(
          MAX_FREE_USAGE,
          current + 1
        )
    );

    try {
      /*
      |--------------------------------------------------------------------
      | API
      |--------------------------------------------------------------------
      */

      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              conversationId:
                activeConversationId,

              message: text,

              model:
                selectedModel,

              messages:
                nextMessages,
            }),
          }
        );

      /*
      |--------------------------------------------------------------------
      | ERROR
      |--------------------------------------------------------------------
      */

      if (!response.ok) {
        const errorText =
          await response.text();

        let errorMessage =
          "AI request failed.";

        try {
          const data =
            JSON.parse(
              errorText
            );

          errorMessage =
            data?.error ??
            data?.message ??
            errorMessage;
        } catch {
          if (
            errorText.trim()
          ) {
            errorMessage =
              errorText;
          }
        }

        throw new Error(
          errorMessage
        );
      }

      /*
      |--------------------------------------------------------------------
      | MEDIA ACTION
      |--------------------------------------------------------------------
      */

      const mediaHeader =
        response.headers.get(
          "X-NEXA-Media"
        );

      const mediaAction =
        parseMediaAction(
          mediaHeader
        );

      if (mediaAction) {
        console.log(
          "[NEXA MEDIA]",
          mediaAction
        );

        if (
          mediaAction.type ===
          "play_media"
        ) {
          await playYouTube(
            mediaAction.query,
            activeConversationId,
            mediaAction.mediaType
          );
        }

        if (
          mediaAction.type ===
          "media_control"
        ) {
          controlMedia(
            mediaAction.action
          );
        }
      }

      /*
      |--------------------------------------------------------------------
      | STREAM
      |--------------------------------------------------------------------
      */

      if (!response.body) {
        throw new Error(
          "AI response stream tidak tersedia."
        );
      }

      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let assistantText = "";

      const assistantId =
        crypto.randomUUID();

      /*
      |--------------------------------------------------------------------
      | EMPTY ASSISTANT
      |--------------------------------------------------------------------
      */

      setMessages(
        (previous) => [
          ...previous,

          {
            id: assistantId,

            role: "assistant",

            content: "",

            model:
              selectedModel,

            createdAt:
              Date.now(),
          },
        ]
      );

      /*
      |--------------------------------------------------------------------
      | READ STREAM
      |--------------------------------------------------------------------
      */

      while (true) {
        const {
          done,
          value,
        } =
          await reader.read();

        if (done) {
          break;
        }

        if (!value) {
          continue;
        }

        const chunk =
          decoder.decode(
            value,
            {
              stream: true,
            }
          );

        if (!chunk) {
          continue;
        }

        assistantText +=
          chunk;

        setMessages(
          (previous) =>
            previous.map(
              (item) =>
                item.id ===
                assistantId
                  ? {
                      ...item,

                      content:
                        assistantText,
                    }
                  : item
            )
        );
      }

      /*
      |--------------------------------------------------------------------
      | FLUSH DECODER
      |--------------------------------------------------------------------
      */

      assistantText +=
        decoder.decode();

      /*
      |--------------------------------------------------------------------
      | TOKEN USAGE
      |--------------------------------------------------------------------
      */

      const promptText =
        nextMessages
          .map(
            (item) =>
              item.content
          )
          .join("\n");

      const promptTokens =
        estimateTokens(
          promptText
        );

      const completionTokens =
        estimateTokens(
          assistantText
        );

      const totalTokens =
        promptTokens +
        completionTokens;

      /*
      |--------------------------------------------------------------------
      | MODEL INFO
      |--------------------------------------------------------------------
      */

      const selectedModelInfo =
        models.find(
          (item) =>
            item.id ===
            selectedModel
        );

      /*
      |--------------------------------------------------------------------
      | COST
      |--------------------------------------------------------------------
      */

      const estimatedCost =
        estimateCost(
          totalTokens,
          selectedModelInfo
        );

      const tokenUsage: TokenUsage =
        {
          promptTokens,

          completionTokens,

          totalTokens,

          estimatedCost,
        };

      /*
      |--------------------------------------------------------------------
      | FINAL MESSAGE
      |--------------------------------------------------------------------
      */

      setMessages(
        (previous) =>
          previous.map(
            (item) =>
              item.id ===
              assistantId
                ? {
                    ...item,

                    content:
                      assistantText,

                    model:
                      selectedModel,

                    usage:
                      tokenUsage,
                  }
                : item
          )
      );

      console.log(
        "[NEXA TOKEN USAGE]",
        {
          model:
            selectedModel,

          promptTokens,

          completionTokens,

          totalTokens,

          estimatedCost,
        }
      );

      await refreshAISettings();
    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      const errorText =
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghubungi AI.";

      setMessages(
        (previous) => [
          ...previous,

          {
            id: crypto.randomUUID(),

            role: "assistant",

            content:
              `Error: ${errorText}`,

            createdAt:
              Date.now(),
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  /*
  |--------------------------------------------------------------------------
  | NEW CHAT
  |--------------------------------------------------------------------------
  */

  function newChat() {
    if (loading) {
      return;
    }

    setMessages([]);

    setMessage("");

    setConversationId(null);

    setUsage(0);

    /*
    |----------------------------------------------------------------------
    | RESET MEDIA
    |----------------------------------------------------------------------
    */

    setCurrentMedia(null);

    currentMediaRef.current =
      null;

    setMediaPlaying(false);

    setMediaProgress(0);

    setMediaQueue([]);

    mediaQueueRef.current =
      [];

    setMediaIndex(-1);

    mediaIndexRef.current =
      -1;

    try {
      localStorage.removeItem(
        STORAGE_KEY
      );

      localStorage.removeItem(
        CONVERSATION_KEY
      );

      localStorage.removeItem(
        USAGE_KEY
      );
    } catch (error) {
      console.error(
        "Failed to clear chat:",
        error
      );
    }
  }

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <div className="app-shell">

      <Sidebar
        models={models}
        selectedModel={
          selectedModel
        }
        onModelChange={
          setSelectedModel
        }
        messages={messages}
        onNewChat={newChat}
        usage={usage}
        maxUsage={
          MAX_FREE_USAGE
        }
        aiSettings={
          aiSettings
        }
      />

      <MobileSidebar
        open={mobileSidebar}
        onClose={() =>
          setMobileSidebar(
            false
          )
        }
        models={models}
        selectedModel={
          selectedModel
        }
        onModelChange={
          setSelectedModel
        }
        messages={messages}
        onNewChat={newChat}
        usage={usage}
        maxUsage={
          MAX_FREE_USAGE
        }
        aiSettings={
          aiSettings
        }
      />

      <main className="main-content">

        {/*
        |--------------------------------------------------------------------------
        | HEADER
        |--------------------------------------------------------------------------
        */}

        <ChatHeader
          models={models}
          selectedModel={
            selectedModel
          }
          onModelChange={
            setSelectedModel
          }
          onOpenSidebar={() =>
            setMobileSidebar(
              true
            )
          }

          /*
          |--------------------------------------------------------------------------
          | MUSIC PLAYER
          |--------------------------------------------------------------------------
          */

          musicPlayer={
            currentMedia
              ? {
                  videoId:
                    currentMedia.videoId,

                  title:
                    currentMedia.title,

                  channel:
                    currentMedia.channelTitle ??
                    "YouTube",

                  thumbnail:
                    currentMedia.thumbnail ??
                    "",

                  playing:
                    mediaPlaying,

                  progress:
                    mediaProgress,
                }
              : null
          }

          /*
          |--------------------------------------------------------------------------
          | PLAY / PAUSE
          |--------------------------------------------------------------------------
          */

          onToggleMusic={() => {
            setMediaPlaying(
              (previous) =>
                !previous
            );
          }}

          /*
          |--------------------------------------------------------------------------
          | NEXT
          |--------------------------------------------------------------------------
          */

          onNextMusic={() => {
            controlMedia(
              "next"
            );
          }}

          /*
          |--------------------------------------------------------------------------
          | PREVIOUS
          |--------------------------------------------------------------------------
          */

          onPreviousMusic={() => {
            controlMedia(
              "previous"
            );
          }}

          /*
          |--------------------------------------------------------------------------
          | CLOSE
          |--------------------------------------------------------------------------
          */

          onCloseMusic={() => {
            controlMedia(
              "close"
            );
          }}
        />

        <div className="chat-layout">

          <ChatArea
            messages={messages}
            loading={loading}
            selectedModel={
              selectedModel
            }
          />

          {mediaLoading && (
            <div className="youtube-loading">
              Mencari lagu...
            </div>
          )}

          {/*
          |--------------------------------------------------------------------------
          | HIDDEN YOUTUBE PLAYER
          |--------------------------------------------------------------------------
          |
          | YouTube hanya menjadi audio engine.
          | Tampilan dikontrol oleh ChatHeader.
          |
          */}

          <YouTubePlayer
            media={
              currentMedia
            }
            playing={
              mediaPlaying
            }
            onPlayingChange={
              setMediaPlaying
            }
            onProgress={
              setMediaProgress
            }
            onEnded={
              handleMediaEnded
            }
          />

          <Composer
            value={message}
            onChange={setMessage}
            onSend={sendMessage}
            loading={loading}
          />

        </div>

      </main>
    </div>
  );
}