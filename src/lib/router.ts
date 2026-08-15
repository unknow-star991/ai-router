import { models } from "./provider";
import type {
  ModelConfig,
  RouterResult,
  TaskType,
} from "./types";

function detectTask(
  message: string,
  hasImage = false
): TaskType {

  const text =
    message.toLowerCase();

  if (hasImage) {
    return "vision";
  }

  if (
    text.includes("edit foto") ||
    text.includes("ubah foto") ||
    text.includes("edit gambar") ||
    text.includes("ubah gambar")
  ) {
    return "image-edit";
  }

  if (
    text.includes("kode") ||
    text.includes("coding") ||
    text.includes("program") ||
    text.includes("javascript") ||
    text.includes("typescript") ||
    text.includes("python") ||
    text.includes("react") ||
    text.includes("next.js") ||
    text.includes("html") ||
    text.includes("css")
  ) {
    return "coding";
  }

  if (
    text.includes("analisis") ||
    text.includes("analisa") ||
    text.includes("reasoning") ||
    text.includes("hitung") ||
    text.includes("matematika") ||
    text.includes("jelaskan secara mendalam")
  ) {
    return "reasoning";
  }

  if (
    text.includes("cerita") ||
    text.includes("novel") ||
    text.includes("puisi") ||
    text.includes("ide") ||
    text.includes("creative")
  ) {
    return "creative";
  }

  return "general";
}

export function routeAI(
  message: string,
  options?: {
    selectedModel?: string;
    hasImage?: boolean;
  }
): RouterResult {

  /*
  |--------------------------------------------------------------------------
  | USER MEMILIH MODEL MANUAL
  |--------------------------------------------------------------------------
  */

  if (options?.selectedModel) {

    const selected =
      models.find(
        (model) =>
          model.id ===
          options.selectedModel
      );

    if (selected) {

      const task =
        detectTask(
          message,
          options.hasImage
        );

      return {
        model: selected,
        task,
        reason:
          `Model dipilih secara manual: ${selected.name}`,
      };
    }
  }

  /*
  |--------------------------------------------------------------------------
  | AUTO ROUTER
  |--------------------------------------------------------------------------
  */

  const task =
    detectTask(
      message,
      options?.hasImage
    );

  const candidates =
    models.filter(
      (model: ModelConfig) =>
        model.capabilities.includes(task)
    );

  if (!candidates.length) {

    return {
      model: models[0],
      task,
      reason:
        "Tidak ditemukan model khusus, menggunakan Auto Free.",
    };
  }

  candidates.sort(
    (
      a: ModelConfig,
      b: ModelConfig
    ) => {

      const scoreA =
        a.priority +
        a.quality +
        a.speed;

      const scoreB =
        b.priority +
        b.quality +
        b.speed;

      return scoreB - scoreA;
    }
  );

  return {
    model: candidates[0],
    task,
    reason:
      `Auto Router memilih ${candidates[0].name} untuk tugas ${task}.`,
  };
}