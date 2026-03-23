import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createSession, setSessionCookie, clearSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, message: "비밀번호를 입력해주세요." }, { status: 400 });
    }
    const valid = await verifyPassword(password);
    if (!valid) {
      return NextResponse.json({ success: false, message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    const token = createSession();
    await setSessionCookie(token);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[auth] 로그인 에러:", err);
    return NextResponse.json({ success: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
