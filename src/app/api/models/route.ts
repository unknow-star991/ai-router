import { NextResponse } from "next/server";
import { models } from "@/lib/provider";

export async function GET() {
  return NextResponse.json({
    models,
  });
}