import { NextResponse } from "next/server";
import { verifyJwt } from "@/lib/jwt";

export async function GET(request) {
  const cookieHeader = request.cookies.get("safirpass_session");
  const token = cookieHeader?.value;

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifyJwt(token);
  if (!payload) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: payload });
}
