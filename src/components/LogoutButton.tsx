"use client";

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE", credentials: "include" });
    window.location.assign("/sibum_bundang");
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-blue-200 hover:text-white transition-colors"
    >
      로그아웃
    </button>
  );
}
