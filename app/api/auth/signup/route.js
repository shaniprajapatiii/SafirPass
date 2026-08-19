import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { signJwt } from "@/lib/jwt";
import { toValidUuid } from "@/lib/uuid";

export async function POST(request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const userId = toValidUuid(email);

    try {
      await supabase.from("profiles").insert({
        id: userId,
        email,
        full_name: fullName || email.split("@")[0],
      });
    } catch (e) {
      console.warn("Supabase profile insert note:", e);
    }

    const sessionPayload = {
      id: userId,
      email,
      user_metadata: {
        full_name: fullName || email.split("@")[0],
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
    return NextResponse.json({ error: err.message || "Registration failed" }, { status: 500 });
  }
}
