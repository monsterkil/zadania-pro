import { NextResponse } from "next/server";
import { verifyPassword, createToken, COOKIE_NAME } from "@/lib/auth";

export async function POST(request) {
  try {
    const { role, password } = await request.json();

    if (!role || !password) {
      return NextResponse.json({ error: "Brak roli lub hasła" }, { status: 400 });
    }

    if (!["admin", "admin2", "collaborator", "client"].includes(role)) {
      return NextResponse.json({ error: "Nieprawidłowa rola" }, { status: 400 });
    }

    if (!verifyPassword(role, password)) {
      return NextResponse.json({ error: "Nieprawidłowe hasło" }, { status: 401 });
    }

    const token = createToken(role);

    const response = NextResponse.json({ success: true, role });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
