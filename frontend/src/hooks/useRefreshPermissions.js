import { useEffect } from "react";
import API from "../config/api";

export default function useRefreshPermissions() {
  useEffect(() => {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!stored) return;

    const user = JSON.parse(stored);
    if (!user?.id) return;

    fetch(`${API}/users/${user.id}/permissions`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Gagal memuat hak akses");
        const updated = {
          ...user,
          permissions: Array.isArray(data.permissions) ? data.permissions : [],
          permission_names: Array.isArray(data.permission_names) ? data.permission_names : [],
        };
        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(updated));
        } else {
          sessionStorage.setItem("user", JSON.stringify(updated));
        }
        window.dispatchEvent(new Event("permissions-updated"));
      })
      .catch(() => {});
  }, []);
}