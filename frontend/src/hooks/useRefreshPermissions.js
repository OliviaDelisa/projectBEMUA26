import { useEffect } from "react";
import API from "../config/api";

export default function useRefreshPermissions() {
  useEffect(() => {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    if (!stored) return;

    const user = JSON.parse(stored);
    if (!user?.id) return;

    // Hanya refresh kalau permissions kosong
    if (Array.isArray(user.permissions) && user.permissions.length > 0) return;

    fetch(`${API}/users/${user.id}/permissions`)
      .then((r) => r.json())
      .then(({ permissions }) => {
        const updated = { ...user, permissions };
        if (localStorage.getItem("user")) {
          localStorage.setItem("user", JSON.stringify(updated));
        } else {
          sessionStorage.setItem("user", JSON.stringify(updated));
        }
      })
      .catch(() => {});
  }, []);
}