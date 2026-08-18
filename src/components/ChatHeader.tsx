"use client";

import type { ModelInfo } from "@/components/types";
import type { MusicPlayerState } from "@/components/music";

type ChatHeaderProps = {
  models: ModelInfo[];
  selectedModel: string;

  onModelChange: (model: string) => void;
  onOpenSidebar: () => void;

  musicPlayer?: MusicPlayerState | null;

  onToggleMusic?: () => void;
  onNextMusic?: () => void;
  onPreviousMusic?: () => void;
  onCloseMusic?: () => void;

  onExpandMusic?: () => void;
};

export default function ChatHeader({
  models,
  selectedModel,
  onModelChange,
  onOpenSidebar,

  musicPlayer,
  onToggleMusic,
  onNextMusic,
  onPreviousMusic,
  onCloseMusic,
  onExpandMusic,
}: ChatHeaderProps) {
  const selectedModelInfo = models.find(
    (model) => model.id === selectedModel
  );

  const modelName =
    selectedModelInfo?.name ??
    selectedModel.split("/").pop() ??
    selectedModel;

  return (
    <header className="chat-header">

      {/* =====================================================
          LEFT
      ===================================================== */}

      <div className="chat-header-left">

        <button
          type="button"
          className="mobile-menu-button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="chat-ai-avatar">
          N
        </div>

        <div className="chat-header-info">
          <div className="chat-header-title">
            <span>Nexa</span>
            <span className="ai-status-dot" />
          </div>

          <div className="chat-header-subtitle">
            AI Router
          </div>
        </div>

      </div>

      {/* =====================================================
          CENTER MUSIC PLAYER
      ===================================================== */}

      {musicPlayer && (
        <div
          className={`header-music-player ${
            musicPlayer.playing
              ? "playing"
              : ""
          }`}
        >

          {/* THUMBNAIL */}

          <div className="header-music-thumbnail">

            {musicPlayer.thumbnail ? (
              <img
                src={musicPlayer.thumbnail}
                alt=""
              />
            ) : (
              <div className="header-music-placeholder">
                ♪
              </div>
            )}

            {musicPlayer.playing && (
              <div className="header-music-playing">
                <i />
                <i />
                <i />
              </div>
            )}

          </div>

          {/* INFO */}

          <div className="header-music-info">

            <div
              className="header-music-title"
              title={musicPlayer.title}
            >
              {musicPlayer.title}
            </div>

            <div
              className="header-music-channel"
              title={musicPlayer.channel}
            >
              {musicPlayer.channel}
            </div>

          </div>

          {/* CONTROLS */}

          <div className="header-music-controls">

            {/* PREVIOUS */}

            <button
              type="button"
              className="header-music-button"
              onClick={onPreviousMusic}
              aria-label="Previous song"
              title="Previous"
            >
              ‹
            </button>

            {/* PLAY / PAUSE */}

            <button
              type="button"
              className="header-music-play"
              onClick={onToggleMusic}
              aria-label={
                musicPlayer.playing
                  ? "Pause music"
                  : "Play music"
              }
              title={
                musicPlayer.playing
                  ? "Pause"
                  : "Play"
              }
            >
              {musicPlayer.playing
                ? "Ⅱ"
                : "▶"}
            </button>

            {/* NEXT */}

            <button
              type="button"
              className="header-music-button"
              onClick={onNextMusic}
              aria-label="Next song"
              title="Next"
            >
              ›
            </button>

            {/* EXPAND */}

            <button
              type="button"
              className="header-music-expand"
              onClick={onExpandMusic}
              aria-label="Expand music player"
              title="Open full player"
            >
              ⛶
            </button>

            {/* CLOSE */}

            <button
              type="button"
              className="header-music-close"
              onClick={onCloseMusic}
              aria-label="Close music player"
              title="Close"
            >
              ×
            </button>

          </div>

          {/* PROGRESS */}

          <div className="header-music-progress">

            <div
              className="header-music-progress-bar"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    musicPlayer.progress
                  )
                )}%`,
              }}
            />

          </div>

        </div>
      )}

      {/* =====================================================
          RIGHT
      ===================================================== */}

      <div className="chat-header-right chat-header-right-spaced">

        <div className="current-model">

          <span className="current-model-dot" />

          <span className="current-model-name">
            {modelName}
          </span>

        </div>

        <div className="model-selector-wrapper">

          <select
            className="model-selector"
            value={selectedModel}
            onChange={(event) =>
              onModelChange(
                event.target.value
              )
            }
          >
            {models.map((model) => (
              <option
                key={model.id}
                value={model.id}
              >
                {model.name ?? model.id}
              </option>
            ))}
          </select>

          <span className="model-selector-arrow">
            ▾
          </span>

        </div>

      </div>

    </header>
  );
}