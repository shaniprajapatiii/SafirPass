import { NextResponse } from "next/server";
import { signJwt } from "@/lib/jwt";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    const expectedAdminEmail = process.env.ADMIN_EMAIL;
    const expectedAdminPassword = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Admin email and password are required" },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedExpectedEmail = expectedAdminEmail.trim().toLowerCase();

    if (trimmedEmail !== trimmedExpectedEmail || password !== expectedAdminPassword) {
      return NextResponse.json(
        { error: "Invalid Admin credentials. Access restricted to authorized personnel." },
        { status: 401 }
      );
    }

    const adminPayload = {
      id: "admin-gov-authority-01",
      email: expectedAdminEmail,
      role: "admin",
      user_metadata: {
        full_name: "Chief Verification Officer (Immigration Grid)",
        role: "admin",
        agency: "Ministry of Home Affairs & Tourism Security Bureau",
      },
    };

    const jwt = await signJwt(adminPayload);

    const response = NextResponse.json({
      success: true,
      user: adminPayload,
      message: "Admin authentication successful.",
    });

    response.cookies.set("safirpass_session", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "Admin login failed" },
      { status: 500 }
    );
  }
}
