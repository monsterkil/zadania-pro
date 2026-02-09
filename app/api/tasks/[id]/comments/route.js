import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comments } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Treść jest wymagana" }, { status: 400 });
    }

    const [comment] = await db
      .insert(comments)
      .values({
        taskId: id,
        authorRole: session.role,
        content: content.trim(),
      })
      .returning();

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tasks/[id]/comments error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
