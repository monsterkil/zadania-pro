import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskFiles, comments } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { notifyInProgress, notifyDone } from "@/lib/email";
import { eq } from "drizzle-orm";

export async function GET(request, { params }) {
  try {
    await requireAuth();
    const { id } = await params;

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
    }

    const files = await db.select().from(taskFiles).where(eq(taskFiles.taskId, id));
    const taskComments = await db.select().from(comments).where(eq(comments.taskId, id));

    return NextResponse.json({
      ...task,
      quoteAmount: task.quoteAmount ? parseFloat(task.quoteAmount) : null,
      files,
      comments: taskComments,
    });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await request.json();
    const canEdit = session.role === "admin" || session.role === "admin2" || session.role === "collaborator";

    // Get current task
    const [currentTask] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!currentTask) {
      return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
    }

    const updates = { updatedAt: new Date() };

    // Status change (admin/collaborator only)
    if (body.status && canEdit) {
      // Block moving to in_progress if quote not accepted
      if (
        body.status === "in_progress" &&
        currentTask.requiresQuote &&
        currentTask.quoteStatus !== "accepted" &&
        currentTask.quoteStatus !== "not_required"
      ) {
        return NextResponse.json({ error: "Wycena musi być zaakceptowana" }, { status: 400 });
      }
      updates.status = body.status;
    }

    // Quote amount (admin/collaborator only)
    if (body.quoteAmount !== undefined && canEdit) {
      updates.quoteAmount = body.quoteAmount;
      updates.quoteStatus = "pending";
    }

    // Deadline (admin/collaborator only)
    if (body.deadline !== undefined && canEdit) {
      updates.deadline = body.deadline ? new Date(body.deadline) : null;
    }

    // Quote status (admin/collaborator only) — ręczne ustawienie Wycenione / Wycena zaakceptowana
    if (body.quoteStatus !== undefined && canEdit) {
      const v = body.quoteStatus;
      if (["pending", "accepted", "rejected", "not_required"].includes(v)) updates.quoteStatus = v;
    }

    // Requires quote (admin/collaborator only)
    if (body.requiresQuote !== undefined && canEdit) {
      updates.requiresQuote = !!body.requiresQuote;
      if (!body.requiresQuote) updates.quoteStatus = "not_required";
    }

    // Title/description (admin/collaborator, or client for own tasks)
    if (body.title !== undefined && (canEdit || (session.role === "client" && currentTask.createdBy === "client"))) {
      updates.title = body.title;
    }
    if (body.description !== undefined && (canEdit || (session.role === "client" && currentTask.createdBy === "client"))) {
      updates.description = body.description;
    }

    const [updated] = await db.update(tasks).set(updates).where(eq(tasks.id, id)).returning();

    // Email notifications for status changes
    if (body.status && body.status !== currentTask.status) {
      if (body.status === "in_progress") {
        notifyInProgress(updated).catch(console.error);
      } else if (body.status === "done") {
        notifyDone(updated).catch(console.error);
      }
    }

    // Ten sam kształt co GET (quoteAmount jako number lub null)
    const out = {
      ...updated,
      quoteAmount: updated.quoteAmount != null ? parseFloat(updated.quoteAmount) : null,
    };
    return NextResponse.json(out);
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("PATCH /api/tasks/[id] error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireAuth();
    if (session.role !== "admin" && session.role !== "admin2" && session.role !== "collaborator") {
      return NextResponse.json({ error: "Brak uprawnień" }, { status: 403 });
    }

    const { id } = await params;
    await db.delete(tasks).where(eq(tasks.id, id));

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
