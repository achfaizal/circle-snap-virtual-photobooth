import { NextResponse } from "next/server";
import { CLIENT_COOKIE_NAME } from "@/lib/clientAuth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(CLIENT_COOKIE_NAME);
  return res;
}
