import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { signJwt } from "@/lib/jwt";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", email)
      .maybeSingle();

    const userId = profile?.id || `usr-${Date.now()}`;
    const fullName = profile?.full_name || email.split("@")[0];

    if (!profile) {
      await supabase.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName,
      }).catch(() => { });
    }

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
