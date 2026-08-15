"use client";

import type { ModelInfo } from "./types";

interface ModelCardProps {
  model: ModelInfo;
  selected: boolean;
  onClick: () => void;
}

const capabilityLabels: Record<
  string,
  string
> = {
  general: "General",
  coding: "Coding",
  reasoning: "Reasoning",
  creative: "Creative",
  vision: "Vision",
};

export default function ModelCard({
  model,
  selected,
  onClick,
}: ModelCardProps) {
  return (
    <button
      className={`model-card ${
        selected ? "selected" : ""
      }`}
      onClick={onClick}
    >
      <div className="model-card-icon">
        {model.name
          .slice(0, 1)
          .toUpperCase()}
      </div>

      <div className="model-card-content">
        <div className="model-card-title">
          <strong>{model.name}</strong>

          <span
            className={`tier-badge ${
              model.tier === "limited"
                ? "limited"
                : "free"
            }`}
          >
            {model.tier === "limited"
              ? "Limited"
              : "Free"}
          </span>
        </div>

        <span className="model-provider">
          {model.provider}
        </span>

        <div className="model-capabilities">
          {(model.capabilities ?? [])
            .slice(0, 3)
            .map((capability) => (
              <span key={capability}>
                {capabilityLabels[
                  capability
                ] ?? capability}
              </span>
            ))}
        </div>
      </div>

      {selected && (
        <div className="model-check">
          ✓
        </div>
      )}
    </button>
  );
}