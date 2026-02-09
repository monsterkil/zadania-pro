import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/schema";
import { requireAuth } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PATCH(request, { params }) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const { action } = await request.json();

    if (!["accepted", "rejected"].includes(action)) {
      return NextResponse.json({ error: "Nieprawidłowa akcja" }, { status: 400 });
    }

    // Only client can accept/reject
    if (session.role !== "client") {
      return NextResponse.json({ error: "Tylko klient może akceptować wycenę" }, { status: 403 });
    }

    const [updated] = await db
      .update(tasks)
      .set({ quoteStatus: action, updatedAt: new Date() })
      .where(eq(tasks.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (err) {
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
