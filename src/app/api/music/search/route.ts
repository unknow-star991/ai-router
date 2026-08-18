import { NextRequest, NextResponse } from "next/server";
import { searchYouTube } from "@/lib/music/search";

export async function GET(
  request: NextRequest
) {
  try {
    const query =
      request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!query) {
      return NextResponse.json(
        {
          tracks: [],
        },
        { status: 200 }
      );
    }

    const tracks = await searchYouTube(query, 10);

    return NextResponse.json({
      tracks,
    });
  } catch (error) {
    console.error(
      "[music/search]",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Music search failed",
      },
      {
        status: 500,
      }
    );
  }
}