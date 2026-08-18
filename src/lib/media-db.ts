import { sql } from "@/lib/db";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

export type MediaHistoryItem = {
  id: string;

  conversationId:
    | string
    | null;

  mediaType:
    | "music"
    | "video";

  videoId: string;

  title: string;

  channelTitle:
    | string
    | null;

  thumbnail:
    | string
    | null;

  youtubeUrl: string;

  query:
    | string
    | null;

  playedAt: string;

  playCount: number;
};

/*
|--------------------------------------------------------------------------
| SAVE MEDIA
|--------------------------------------------------------------------------
*/

export async function saveMediaHistory(
  input: {
    id: string;

    conversationId?:
      | string
      | null;

    mediaType?:
      | "music"
      | "video";

    videoId: string;

    title: string;

    channelTitle?:
      | string
      | null;

    thumbnail?:
      | string
      | null;

    youtubeUrl: string;

    query?:
      | string
      | null;
  }
): Promise<MediaHistoryItem> {
  const result = await sql`
    INSERT INTO media_history (
      id,
      conversation_id,
      media_type,
      video_id,
      title,
      channel_title,
      thumbnail,
      youtube_url,
      query,
      played_at,
      play_count
    )
    VALUES (
      ${input.id},
      ${input.conversationId ?? null},
      ${input.mediaType ?? "music"},
      ${input.videoId},
      ${input.title},
      ${input.channelTitle ?? null},
      ${input.thumbnail ?? null},
      ${input.youtubeUrl},
      ${input.query ?? null},
      NOW(),
      1
    )
    RETURNING
      id,
      conversation_id,
      media_type,
      video_id,
      title,
      channel_title,
      thumbnail,
      youtube_url,
      query,
      played_at,
      play_count
  `;

  return mapMediaRow(
    result[0]
  );
}

/*
|--------------------------------------------------------------------------
| GET HISTORY
|--------------------------------------------------------------------------
*/

export async function getMediaHistory(
  limit = 50
): Promise<MediaHistoryItem[]> {
  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Math.floor(limit)
      )
    );

  const result = await sql`
    SELECT
      id,
      conversation_id,
      media_type,
      video_id,
      title,
      channel_title,
      thumbnail,
      youtube_url,
      query,
      played_at,
      play_count
    FROM media_history
    ORDER BY played_at DESC
    LIMIT ${safeLimit}
  `;

  return result.map(
    mapMediaRow
  );
}

/*
|--------------------------------------------------------------------------
| GET HISTORY BY CONVERSATION
|--------------------------------------------------------------------------
*/

export async function getConversationMediaHistory(
  conversationId: string,
  limit = 50
): Promise<MediaHistoryItem[]> {
  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Math.floor(limit)
      )
    );

  const result = await sql`
    SELECT
      id,
      conversation_id,
      media_type,
      video_id,
      title,
      channel_title,
      thumbnail,
      youtube_url,
      query,
      played_at,
      play_count
    FROM media_history
    WHERE conversation_id =
      ${conversationId}
    ORDER BY played_at DESC
    LIMIT ${safeLimit}
  `;

  return result.map(
    mapMediaRow
  );
}

/*
|--------------------------------------------------------------------------
| MAP DATABASE ROW
|--------------------------------------------------------------------------
*/

function mapMediaRow(
  row: any
): MediaHistoryItem {
  return {
    id:
      String(
        row.id
      ),

    conversationId:
      row.conversation_id
        ? String(
            row.conversation_id
          )
        : null,

    mediaType:
      row.media_type ===
      "video"
        ? "video"
        : "music",

    videoId:
      String(
        row.video_id
      ),

    title:
      String(
        row.title
      ),

    channelTitle:
      row.channel_title
        ? String(
            row.channel_title
          )
        : null,

    thumbnail:
      row.thumbnail
        ? String(
            row.thumbnail
          )
        : null,

    youtubeUrl:
      String(
        row.youtube_url
      ),

    query:
      row.query
        ? String(
            row.query
          )
        : null,

    playedAt:
      new Date(
        row.played_at
      ).toISOString(),

    playCount:
      Number(
        row.play_count ?? 1
      ),
  };
}