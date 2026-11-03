import { NextResponse } from "next/server";
import { clearSession } from "@/lib/session";

/** Sign out. POST-only so third-party pages can't log users out with a simple link or image. */
export async function POST(req: Request) {
    await clearSession();
    return NextResponse.redirect(new URL("/login", req.url), 303);
}
