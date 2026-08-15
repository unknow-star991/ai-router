import {
  readGitHubFile,
  updateGitHubFile,
} from "@/lib/github";

export type CodeAction =
  | {
      type: "read_file";

      path: string;
    }
  | {
      type: "replace_in_file";

      path: string;

      search: string;

      replacement: string;

      commitMessage?: string;
    };

const BLOCKED_PATHS = [
  ".env",
  ".env.local",
  ".env.production",
  ".env.development",
  "node_modules",
  ".git",
];

const ALLOWED_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".css",
  ".json",
  ".md",
];

function validatePath(
  path: string
) {
  const normalized =
    path
      .trim()
      .replaceAll("\\", "/")
      .replace(/^\/+/, "");

  if (!normalized) {
    throw new Error(
      "Path file kosong."
    );
  }

  if (
    normalized.includes(
      ".."
    )
  ) {
    throw new Error(
      "Path tidak valid."
    );
  }

  for (
    const blocked of BLOCKED_PATHS
  ) {
    if (
      normalized === blocked ||
      normalized.startsWith(
        `${blocked}/`
      )
    ) {
      throw new Error(
        `Akses ke "${blocked}" diblokir.`
      );
    }
  }

  const allowed =
    ALLOWED_EXTENSIONS.some(
      (extension) =>
        normalized.endsWith(
          extension
        )
    );

  if (!allowed) {
    throw new Error(
      `Ekstensi file "${normalized}" tidak diizinkan.`
    );
  }

  return normalized;
}

/*
|--------------------------------------------------------------------------
| EXECUTE CODE ACTION
|--------------------------------------------------------------------------
*/

export async function executeCodeAction(
  action: CodeAction
) {
  switch (
    action.type
  ) {
    /*
    |--------------------------------------------------------------------------
    | READ FILE
    |--------------------------------------------------------------------------
    */

    case "read_file": {
      const path =
        validatePath(
          action.path
        );

      const file =
        await readGitHubFile(
          path
        );

      return {
        success: true,

        type: action.type,

        path: file.path,

        content:
          file.content,
      };
    }

    /*
    |--------------------------------------------------------------------------
    | REPLACE TEXT
    |--------------------------------------------------------------------------
    */

    case "replace_in_file": {
      const path =
        validatePath(
          action.path
        );

      if (
        !action.search
      ) {
        throw new Error(
          "Teks yang ingin dicari tidak boleh kosong."
        );
      }

      const file =
        await readGitHubFile(
          path
        );

      if (
        !file.content.includes(
          action.search
        )
      ) {
        throw new Error(
          `Teks target tidak ditemukan di ${path}.`
        );
      }

      const occurrences =
        file.content.split(
          action.search
        ).length - 1;

      if (
        occurrences > 1
      ) {
        throw new Error(
          `Teks target ditemukan ${occurrences} kali di ${path}. Refusing to make an ambiguous edit.`
        );
      }

      const updatedContent =
        file.content.replace(
          action.search,
          action.replacement
        );

      if (
        updatedContent ===
        file.content
      ) {
        throw new Error(
          "Tidak ada perubahan pada file."
        );
      }

      const result =
        await updateGitHubFile(
          path,
          updatedContent,
          action.commitMessage ??
            `Update ${path}`
        );

      return {
        success: true,

        type: action.type,

        path,

        commitSha:
          result.commitSha,

        commitUrl:
          result.commitUrl,
      };
    }

    default:
      throw new Error(
        "Unknown code action."
      );
  }
}