import { NextResponse } from "next/server";
import { getJungles } from "@/lib/jungles";

export async function GET() {
  try {
    return NextResponse.json(await getJungles());
  } catch (error) {
    console.error("Failed to load jungles", error);
    return NextResponse.json(
      { error: "Jungle content is temporarily unavailable." },
      { status: 503 }
    );
  }
}
