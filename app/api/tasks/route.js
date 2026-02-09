import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks, taskFiles, comments } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { notifyNewTask } from "@/lib/email";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAuth();

    const allTasks = await db.select().from(tasks).orderBy(desc(tasks.createdAt));

    // Fetch files and comments for each task
    const taskIds = allTasks.map((t) => t.id);
    let allFiles = [];
    let allComments = [];

    if (taskIds.length > 0) {
      allFiles = await db.select().from(taskFiles);
      allComments = await db.select().from(comments).orderBy(comments.createdAt);
    }

    const result = allTasks.map((task) => ({
      ...task,
      quoteAmount: task.quoteAmount ? parseFloat(task.quoteAmount) : null,
      files: allFiles.filter((f) => f.taskId === task.id),
      comments: allComments.filter((c) => c.taskId === task.id),
    }));

    return NextResponse.json(result);
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("GET /api/tasks error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { title, description, requiresQuote, quoteAmount } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
    }

    const canSetQuote = session.role === "admin" || session.role === "collaborator";

    const [newTask] = await db
      .insert(tasks)
      .values({
        title: title.trim(),
        description: description?.trim() || null,
        status: "new",
        requiresQuote: requiresQuote !== false,
        quoteAmount: canSetQuote && quoteAmount ? quoteAmount : null,
        quoteStatus: requiresQuote === false ? "not_required" : "pending",
        createdBy: session.role,
      })
      .returning();

    // Send email notification
    notifyNewTask(newTask).catch(console.error);

    const payload = {
      ...newTask,
      quoteAmount: newTask.quoteAmount != null ? parseFloat(newTask.quoteAmount) : null,
      files: [],
      comments: [],
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("POST /api/tasks error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
