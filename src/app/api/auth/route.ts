import { NextRequest, NextResponse } from "next/server";
import {
  verifyPassword,
  createSession,
  getSession,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  getAdminPasswordHashStatus,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    if (!password || typeof password !== "string") {
      return NextResponse.json({ success: false, message: "비밀번호를 입력해주세요." }, { status: 400 });
    }

    const hashStatus = getAdminPasswordHashStatus();
    if (hashStatus === "missing") {
      return NextResponse.json(
        {
          success: false,
          message: "서버에 ADMIN_PASSWORD_HASH가 없습니다. .env.local을 확인하세요.",
        },
        { status: 500 }
      );
    }
    if (hashStatus === "not_bcrypt") {
      return NextResponse.json(
        {
          success: false,
          message:
            "ADMIN_PASSWORD_HASH가 bcrypt 해시가 아닙니다. npm run hash-admin-password -- 비밀번호 로 생성한 값을 넣고, $가 잘리지 않게 큰따옴표로 감싸세요.",
        },
        { status: 500 }
      );
    }

    const valid = await verifyPassword(password);
    if (!valid) {
      return NextResponse.json({ success: false, message: "비밀번호가 올바르지 않습니다." }, { status: 401 });
    }
    const token = createSession();
    const res = NextResponse.json({ success: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("SESSION_SECRET")) {
      return NextResponse.json(
        { success: false, message: "서버에 SESSION_SECRET이 설정되지 않았습니다." },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: false, message: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE() {
  if (!(await getSession())) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const res = NextResponse.json({ success: true });
  res.cookies.delete(SESSION_COOKIE_NAME);
  return res;
}
