import { NextRequest, NextResponse } from "next/server";

/*
|--------------------------------------------------------------------------
| TYPES
|--------------------------------------------------------------------------
*/

type YouTubeSearchItem = {
  id?: {
    videoId?: string;
  };

  snippet?: {
    title?: string;
    description?: string;
    channelTitle?: string;
    thumbnails?: {
      default?: {
        url?: string;
      };
      medium?: {
        url?: string;
      };
      high?: {
        url?: string;
      };
    };
  };
};

type YouTubeResponse = {
  items?: YouTubeSearchItem[];

  error?: {
    message?: string;
  };
};

/*
|--------------------------------------------------------------------------
| GET /api/youtube/search
|--------------------------------------------------------------------------
|
| Example:
|
| /api/youtube/search?q=lofi
|
*/

export async function GET(
  request: NextRequest
) {
  try {
    /*
    |--------------------------------------------------------------------------
    | API KEY
    |--------------------------------------------------------------------------
    */

    const apiKey =
      process.env.YOUTUBE_API_KEY;

    if (!apiKey) {
      console.error(
        "[YOUTUBE] YOUTUBE_API_KEY is missing."
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "YouTube API key belum dikonfigurasi.",
        },
        {
          status: 500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | QUERY
    |--------------------------------------------------------------------------
    */

    const searchParams =
      request.nextUrl.searchParams;

    const query =
      searchParams
        .get("q")
        ?.trim();

    if (!query) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Query YouTube tidak boleh kosong.",
        },
        {
          status: 400,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | LIMIT
    |--------------------------------------------------------------------------
    */

    const rawLimit =
      Number(
        searchParams.get(
          "limit"
        ) ?? "8"
      );

    const limit =
      Number.isFinite(
        rawLimit
      )
        ? Math.min(
            10,
            Math.max(
              1,
              Math.floor(
                rawLimit
              )
            )
          )
        : 8;

    /*
    |--------------------------------------------------------------------------
    | YOUTUBE DATA API
    |--------------------------------------------------------------------------
    */

    const url =
      new URL(
        "https://www.googleapis.com/youtube/v3/search"
      );

    url.searchParams.set(
      "part",
      "snippet"
    );

    url.searchParams.set(
      "q",
      query
    );

    url.searchParams.set(
      "type",
      "video"
    );

    url.searchParams.set(
      "maxResults",
      String(limit)
    );

    url.searchParams.set(
      "videoEmbeddable",
      "true"
    );

    url.searchParams.set(
      "key",
      apiKey
    );

    /*
    |--------------------------------------------------------------------------
    | REQUEST
    |--------------------------------------------------------------------------
    */

    const response =
      await fetch(
        url.toString(),
        {
          method: "GET",

          cache:
            "no-store",
        }
      );

    const data =
      (await response.json()) as YouTubeResponse;

    /*
    |--------------------------------------------------------------------------
    | YOUTUBE ERROR
    |--------------------------------------------------------------------------
    */

    if (
      !response.ok
    ) {
      console.error(
        "[YOUTUBE] API error:",
        data
      );

      return NextResponse.json(
        {
          success: false,

          error:
            data?.error
              ?.message ??
            "YouTube API gagal memproses request.",
        },
        {
          status:
            response.status ||
            500,
        }
      );
    }

    /*
    |--------------------------------------------------------------------------
    | FORMAT RESULTS
    |--------------------------------------------------------------------------
    */

    const results =
      Array.isArray(
        data.items
      )
        ? data.items
            .map(
              (item) => {
                const videoId =
                  item.id
                    ?.videoId;

                if (
                  !videoId
                ) {
                  return null;
                }

                return {
                  videoId,

                  title:
                    item.snippet
                      ?.title ??
                    "Untitled",

                  description:
                    item.snippet
                      ?.description ??
                    "",

                  channelTitle:
                    item.snippet
                      ?.channelTitle ??
                    "",

                  thumbnail:
                    item.snippet
                      ?.thumbnails
                      ?.high
                      ?.url ??
                    item.snippet
                      ?.thumbnails
                      ?.medium
                      ?.url ??
                    item.snippet
                      ?.thumbnails
                      ?.default
                      ?.url ??
                    null,

                  youtubeUrl:
                    `https://www.youtube.com/watch?v=${videoId}`,

                  embedUrl:
                    `https://www.youtube.com/embed/${videoId}`,
                };
              }
            )
            .filter(
              (
                item
              ): item is NonNullable<
                typeof item
              > =>
                item !== null
            )
        : [];

    /*
    |--------------------------------------------------------------------------
    | RESPONSE
    |--------------------------------------------------------------------------
    */

    return NextResponse.json(
      {
        success: true,

        query,

        results,
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "[YOUTUBE] Search error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Terjadi kesalahan saat mencari YouTube.";

    return NextResponse.json(
      {
        success: false,

        error:
          message,
      },
      {
        status: 500,
      }
    );
  }
}