import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const result =
      await sql`SELECT NOW() AS time`;

    return NextResponse.json({
      success: true,
      database: "connected",
      time: result[0]?.time,
    });
  } catch (error) {
    console.error(
      "DATABASE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Database connection failed",
      },
      {
        status: 500,
      }
    );
  }
}