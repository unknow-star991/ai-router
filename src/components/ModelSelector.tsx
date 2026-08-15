"use client";

import { useState } from "react";
import ModelCard from "./ModelCard";
import type { ModelInfo } from "./types";

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({
  models,
  selectedModel,
  onChange,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);

  const selected =
    models.find(
      (model) => model.id === selectedModel
    ) ?? models[0];

  return (
    <div className="model-selector">
      <button
        className="model-selector-trigger"
        onClick={() => setOpen(!open)}
      >
        <div className="selected-model-icon">
          {selected?.name
            ?.slice(0, 1)
            .toUpperCase() ?? "A"}
        </div>

        <div className="selected-model-info">
          <strong>
            {selected?.name ?? "Auto Router"}
          </strong>

          <span>
            {selected
              ? selected.provider
              : "Automatic routing"}
          </span>
        </div>

        <span
          className={`selector-chevron ${
            open ? "open" : ""
          }`}
        >
          ↓
        </span>
      </button>

      {open && (
        <>
          <button
            className="selector-overlay"
            onClick={() => setOpen(false)}
            aria-label="Close model selector"
          />

          <div className="model-dropdown">
            <div className="dropdown-header">
              <div>
                <strong>Select model</strong>
                <span>
                  Choose how AI Router responds
                </span>
              </div>
            </div>

            <button
              className={`auto-model-card ${
                selectedModel === "auto"
                  ? "selected"
                  : ""
              }`}
              onClick={() => {
                onChange("auto");
                setOpen(false);
              }}
            >
              <div className="auto-icon">
                ✦
              </div>

              <div>
                <strong>Auto Router</strong>
                <span>
                  Automatically choose the
                  best model
                </span>
              </div>

              {selectedModel === "auto" && (
                <span>✓</span>
              )}
            </button>

            <div className="dropdown-divider" />

            <div className="dropdown-label">
              FREE MODELS
            </div>

            {models
              .filter(
                (model) =>
                  model.tier !== "limited"
              )
              .map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  selected={
                    selectedModel ===
                    model.id
                  }
                  onClick={() => {
                    onChange(model.id);
                    setOpen(false);
                  }}
                />
              ))}

            {models.some(
              (model) =>
                model.tier === "limited"
            ) && (
              <>
                <div className="dropdown-label limited-label">
                  LIMITED / TOKEN
                </div>

                {models
                  .filter(
                    (model) =>
                      model.tier === "limited"
                  )
                  .map((model) => (
                    <ModelCard
                      key={model.id}
                      model={model}
                      selected={
                        selectedModel ===
                        model.id
                      }
                      onClick={() => {
                        onChange(model.id);
                        setOpen(false);
                      }}
                    />
                  ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}