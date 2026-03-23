"use client";

export default function LogoutButton() {
  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE", credentials: "include" });
    window.location.assign("/sibum_bundang");
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-500 hover:text-red-600 transition-colors"
    >
      로그아웃
    </button>
  );
}
