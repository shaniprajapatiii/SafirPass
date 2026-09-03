import { NextResponse } from "next/server";
import { upsertProfile, getProfileById } from "@/lib/db/postgres";
import { signJwt } from "@/lib/jwt";
import { toValidUuid } from "@/lib/uuid";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const userId = toValidUuid(email);
    const existingProfile = await getProfileById(userId);
    const fullName = existingProfile?.full_name || email.split("@")[0];

    const profile = await upsertProfile({
      id: userId,
      email,
      full_name: fullName,
    });

    const sessionPayload = {
      id: userId,
      email,
      user_metadata: {
        full_name: fullName,
        avatar_url: profile?.avatar_url || null,
      },
    };

    const jwt = await signJwt(sessionPayload);

    const response = NextResponse.json({ success: true, user: sessionPayload });
    response.cookies.set("safirpass_session", jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Sign in failed" }, { status: 500 });
  }
}
