import { NextResponse } from "next/server";

export async function GET(request) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "mock-google-client-id.apps.googleusercontent.com";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${appUrl}/api/auth/callback/google`;

  const scope = encodeURIComponent("openid email profile");
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}&prompt=consent&access_type=offline`;

  return NextResponse.redirect(googleAuthUrl);
}
