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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Nieprawidłowy format danych (JSON)" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Brak danych" }, { status: 400 });
    }

    const { title, description, requiresQuote, quoteAmount } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Tytuł jest wymagany" }, { status: 400 });
    }

    const canSetQuote = session.role === "admin" || session.role === "admin2" || session.role === "collaborator";

    const inserted = await db
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

    const newTask = Array.isArray(inserted) ? inserted[0] : inserted;
    if (!newTask || !newTask.id) {
      console.error("POST /api/tasks: insert nie zwrócił zadania", inserted);
      return NextResponse.json({ error: "Błąd zapisu do bazy" }, { status: 500 });
    }

    let emailSent = false;
    let emailError = null;
    try {
      const emailResult = await notifyNewTask(newTask);
      emailSent = emailResult?.success === true;
      if (!emailSent) {
        emailError = emailResult?.reason || "api_error";
        console.warn("[tasks] Powiadomienie email nie wysłane:", emailError, emailResult?.data || emailResult?.error);
      }
    } catch (e) {
      emailError = "network_error";
      console.error("[notifyNewTask]", e);
    }

    const payload = {
      ...newTask,
      quoteAmount: newTask.quoteAmount != null ? parseFloat(newTask.quoteAmount) : null,
      files: [],
      comments: [],
      emailSent,
      emailError,
    };
    return NextResponse.json(payload, { status: 201 });
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const msg = err?.message || String(err);
    const code = err?.code;
    console.error("POST /api/tasks error:", msg, code, err);

    if (!msg && !code) {
      return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
    }
    if (
      msg.includes("relation") ||
      msg.includes("does not exist") ||
      msg.includes("ENOENT") ||
      code === "42P01"
    ) {
      return NextResponse.json(
        { error: "Baza nie jest gotowa. W Vercel ustaw POSTGRES_URL/DATABASE_URL i uruchom migrację (np. db:push) na swoim Neon." },
        { status: 500 }
      );
    }
    if (
      msg.includes("connect") ||
      msg.includes("connection") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("Invalid") ||
      msg.includes("POSTGRES_URL") ||
      msg.includes("DATABASE_URL") ||
      code === "ECONNREFUSED" ||
      code === "PGRST301"
    ) {
      return NextResponse.json(
        { error: "Błąd połączenia z bazą. Sprawdź w Vercel zmienne POSTGRES_URL lub DATABASE_URL (connection string do Neon)." },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
