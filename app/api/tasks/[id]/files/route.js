import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { db } from "@/lib/db";
import { taskFiles } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(request, { params }) {
  try {
    await requireAuth();
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "Brak pliku" }, { status: 400 });
    }

    // Max 30MB
    if (file.size > 30 * 1024 * 1024) {
      return NextResponse.json({ error: "Plik za duży (max 30 MB)" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(`tasks/${id}/${file.name}`, file, {
      access: "public",
    });

    // Save to database
    const [savedFile] = await db
      .insert(taskFiles)
      .values({
        taskId: id,
        fileName: file.name,
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type || null,
      })
      .returning();

    return NextResponse.json(savedFile, { status: 201 });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tasks/[id]/files error:", err);
    return NextResponse.json({ error: "Błąd uploadu" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await requireAuth();
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Brak fileId" }, { status: 400 });
    }

    const [file] = await db.select().from(taskFiles).where(eq(taskFiles.id, fileId));
    if (file) {
      // Delete from Vercel Blob
      try {
        await del(file.fileUrl);
      } catch {}
      // Delete from database
      await db.delete(taskFiles).where(eq(taskFiles.id, fileId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
