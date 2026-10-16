import { useEffect, useState } from "react";
import API from "../config/api";

function readUser() {
  try {
    const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function usePermissions() {
  const [user] = useState(readUser);
  const [routePermissions, setRoutePermissions] = useState(user?.permissions ?? []);
  const [actionPermissions, setActionPermissions] = useState(user?.permission_names ?? []);
  const [permissionsReady, setPermissionsReady] = useState(
    !user?.id || user.role?.toLowerCase() === "superadmin"
  );

  useEffect(() => {
    if (!user?.id || user.role?.toLowerCase() === "superadmin") {
      setPermissionsReady(true);
      return;
    }
    let active = true;
    setPermissionsReady(false);

    fetch(`${API}/users/${user.id}/permissions`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Gagal memuat hak akses");
        if (!active) return;

        const permissions = Array.isArray(data.permissions) ? data.permissions : [];
        const permission_names = Array.isArray(data.permission_names) ? data.permission_names : [];
        setRoutePermissions(permissions);
        setActionPermissions(permission_names);
        setPermissionsReady(true);

        const updatedUser = { ...user, permissions, permission_names };
        const storage = localStorage.getItem("user") ? localStorage : sessionStorage;
        storage.setItem("user", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("permissions-updated"));
      })
      .catch(() => {});

    return () => { active = false; };
  }, [user?.id, user?.role]);

  const isSuperadmin = user?.role?.toLowerCase() === "superadmin";
  const hasPermission = permissionName => isSuperadmin || (permissionsReady && actionPermissions.includes(permissionName));
  const hasRoute = path => isSuperadmin || routePermissions.includes(path);

  return { hasPermission, hasRoute, isSuperadmin };
}