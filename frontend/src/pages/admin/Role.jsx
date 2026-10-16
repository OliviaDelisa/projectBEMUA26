import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";
import usePermissions from "../../hooks/usePermissions";

const UNAND_GREEN = "#00923D";

const GROUP_LABELS = {
  activities: "Manajemen Kegiatan",
  aspirasi: "Manajemen Aspirasi",
  attendance: "Manajemen Absensi",
  content: "Manajemen Konten",
  dashboard: "Dashboard",
  duty: "Manajemen Piket",
  notifications: "Notifikasi",
  periods: "Manajemen Periode",
  reports: "Laporan",
  roles: "Manajemen Hak Akses",
  users: "Manajemen Pengguna",
};

function ToggleIcon({ allowed, onClick, saving, readonly }) {
  if (readonly) {
    return (
      <span className="w-6 h-6 rounded-full flex items-center justify-center mx-auto bg-green-50">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={UNAND_GREEN} strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }

  if (saving) {
    return (
      <div className="flex justify-center">
        <svg className="animate-spin w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      title={allowed ? "Klik untuk cabut akses" : "Klik untuk beri akses"}
      className="flex items-center justify-center mx-auto w-6 h-6 rounded-full transition-all hover:scale-110 active:scale-95"
      style={{ backgroundColor: allowed ? "#e8f5ee" : "#f3f4f6" }}
    >
      {allowed ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke={UNAND_GREEN} strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export default function Role() {
  const { hasPermission } = usePermissions();
  const canManageRoles = hasPermission("roles.manage");
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [savingKey, setSavingKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [addingRole, setAddingRole] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingRole, setDeletingRole] = useState(false);

  // ── Toast auto-dismiss ─────────────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Fetch roles & permissions ──────────────────────────────────────
  const fetchData = async () => {
    try {
      const rolesRes = await fetch(`${API}/roles`);
      const rolesData = await rolesRes.json();
      if (!rolesRes.ok) throw new Error(rolesData.message);

      // Tampilkan semua kecuali role 'user'
      const filtered = rolesData.filter(r => r.name !== "user");
      setRoles(filtered);

      const rolePermissionResults = await Promise.all(filtered.map(async role => {
        const res = await fetch(`${API}/permissions?role_id=${role.id}`);
        const data = await res.json();
        if (!res.ok || !Array.isArray(data)) {
          throw new Error(data.message || `Gagal memuat permission ${role.label}`);
        }
        return { roleId: role.id, data };
      }));

      const permsObj = Object.fromEntries(rolePermissionResults.map(({ roleId, data }) => [
        roleId,
        Object.fromEntries(data.map(permission => [permission.name, Boolean(permission.enabled)])),
      ]));
      setPermissionCatalog(rolePermissionResults[0]?.data ?? []);
      setPermissions(permsObj);
    } catch (err) {
      setToast({ type: "error", msg: "Gagal memuat data: " + err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Toggle permission ──────────────────────────────────────────────
  const handleToggle = async (roleId, permission) => {
    const current = permissions[roleId]?.[permission.name] ?? false;
    const newValue = !current;
    const saveId = `${roleId}-${permission.id}`;
    setSavingKey(saveId);

    try {
      const res = await fetch(`${API}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role_id: roleId, permission_id: permission.id, value: newValue }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // UI baru berubah setelah API sukses
      setPermissions(prev => ({
        ...prev,
        [roleId]: { ...prev[roleId], [permission.name]: newValue },
      }));

      const roleLabel = roles.find(r => r.id === roleId)?.label ?? "";
      setToast({ type: "success", msg: `${permission.label} ${newValue ? "diaktifkan" : "dinonaktifkan"} untuk ${roleLabel}` });
    } catch (e) {
      // Tidak perlu revert karena UI belum diubah
      setToast({ type: "error", msg: e.message });
    } finally {
      setSavingKey(null);
    }
  };
  // ── Tambah role ────────────────────────────────────────────────────
  const handleAddRole = async () => {
    if (!newRoleLabel.trim()) return;
    setAddingRole(true);
    try {
      const res = await fetch(`${API}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newRoleLabel.trim().toLowerCase().replace(/\s+/g, "_"),
          label: newRoleLabel.trim(),
          description: "",
          is_system: false,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setToast({ type: "success", msg: `Role "${newRoleLabel}" berhasil ditambahkan` });
      setShowAddModal(false);
      setNewRoleLabel("");
      await fetchData();
    } catch (e) {
      setToast({ type: "error", msg: e.message });
    } finally {
      setAddingRole(false);
    }
  };

  // ── Hapus role ─────────────────────────────────────────────────────
  const handleDeleteRole = async () => {
    if (!deleteTarget) return;
    setDeletingRole(true);
    try {
      const res = await fetch(`${API}/roles/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      setToast({ type: "success", msg: `Role "${deleteTarget.label}" berhasil dihapus` });
      setDeleteTarget(null);
      await fetchData();
    } catch (e) {
      setToast({ type: "error", msg: e.message });
    } finally {
      setDeletingRole(false);
    }
  };

  const gridCols = `minmax(260px, 1fr) ${roles.map(() => "120px").join(" ")}`;
  const groupedPermissions = permissionCatalog.reduce((groups, permission) => {
    const key = permission.group_name || "other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(permission);
    return groups;
  }, new Map());

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar
          title="Hak Akses"
          subtitle="Kelola role dan izin akses tiap fitur sistem"
        />

        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-8">

          {/* ── Toast ───────────────────────────────────────────────── */}
          <div style={{
            position: "fixed", top: 24, left: "50%",
            transform: `translateX(-50%) translateY(${toast ? "0" : "-120%"})`,
            transition: "transform 0.3s cubic-bezier(0.34,1.56,0.64,1)",
            zIndex: 60, pointerEvents: toast ? "auto" : "none",
          }}>
            {toast && (
              <div className={`flex items-center gap-3 bg-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg border whitespace-nowrap
                ${toast.type === "success" ? "border-green-100 text-green-600" : "border-red-100 text-red-500"}`}>
                {toast.type === "success" ? (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                )}
                {toast.msg}
                <button onClick={() => setToast(null)} className="ml-1 opacity-40 hover:opacity-100">✕</button>
              </div>
            )}
          </div>

          {/* ── Tombol tambah role ───────────────────────────────────── */}
          {canManageRoles && <div className="mb-4 flex justify-end sm:mb-5">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 active:scale-95 sm:w-auto"
              style={{ backgroundColor: UNAND_GREEN }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Tambah Role
            </button>
          </div>}

          {/* ── Permission matrix ────────────────────────────────────── */}
          {loading ? (
            <div className="text-center py-16 text-gray-400 font-medium">Memuat data…</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

              {/* Header */}
              <div
                className="hidden grid-cols-[minmax(260px,1fr)_repeat(var(--role-count),120px)] items-center border-b border-gray-200 bg-gray-50 px-4 py-3 md:grid"
                style={{ gridTemplateColumns: gridCols }}
              >
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fitur</span>
                {roles.map(role => (
                  <div key={role.id} className="flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-center uppercase tracking-widest text-gray-600">
                      {role.label}
                    </span>
                    {/* Tombol hapus hanya untuk role non-system */}
                    {canManageRoles && !role.is_system && (
                      <button
                        onClick={() => setDeleteTarget(role)}
                        title="Hapus role ini"
                        className="text-gray-300 hover:text-red-400 transition"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0a1 1 0 00-1-1h-4a1 1 0 00-1 1m-4 0h10" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {Array.from(groupedPermissions.entries()).map(([group, items]) => (
                <div key={group}>
                  <div className="bg-gray-50 border-t border-gray-100 px-4 py-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{GROUP_LABELS[group] || group.replace(/_/g, " ")}</span>
                  </div>

                  {items.map(permission => (
                    <div key={permission.id} className="border-t border-gray-100">
                      <div
                        className="hidden items-center px-4 py-3 transition hover:bg-gray-50/50 md:grid"
                        style={{ gridTemplateColumns: gridCols }}
                      >
                        <div>
                          <p className="text-sm text-gray-800">{permission.label}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{permission.name}</p>
                        </div>
                        {roles.map(role => {
                          if (role.name === "superadmin" || !canManageRoles) {
                            return <ToggleIcon key={role.id} allowed readonly />;
                          }
                          const saveId = `${role.id}-${permission.id}`;
                          return (
                            <ToggleIcon
                              key={role.id}
                              allowed={permissions[role.id]?.[permission.name] ?? false}
                              saving={savingKey === saveId}
                              onClick={() => handleToggle(role.id, permission)}
                            />
                          );
                        })}
                      </div>
                      <div className="space-y-3 p-3 md:hidden">
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{permission.label}</p>
                          <p className="mt-0.5 break-all text-[11px] text-gray-400">{permission.name}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {roles.map(role => {
                            const readonly = role.name === "superadmin" || !canManageRoles;
                            const saveId = `${role.id}-${permission.id}`;
                            return (
                              <div key={role.id} className="flex min-w-0 items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-2">
                                <span className="min-w-0 break-words text-xs font-semibold text-gray-600">{role.label}</span>
                                {readonly ? (
                                  <ToggleIcon allowed readonly />
                                ) : (
                                  <ToggleIcon
                                    allowed={permissions[role.id]?.[permission.name] ?? false}
                                    saving={savingKey === saveId}
                                    onClick={() => handleToggle(role.id, permission)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* ── Legend ──────────────────────────────────────────────── */}
          <div className="flex gap-6 mt-4 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-green-50">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke={UNAND_GREEN} strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              Akses aktif
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <svg className="w-2.5 h-2.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                  <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                </svg>
              </span>
              Tidak ada akses
            </div>
          </div>

        </main>
      </div>

      {/* ── Modal Tambah Role ────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-1">Tambah Role Baru</h2>
            <p className="text-xs text-gray-400 mb-5">
              Role baru akan muncul sebagai kolom baru di tabel dan bisa diatur permission-nya.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Role</label>
              <input
                type="text"
                placeholder="cth: Bendahara, Sekretaris, Ketua Kementerian..."
                value={newRoleLabel}
                onChange={e => setNewRoleLabel(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddRole()}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                autoFocus
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowAddModal(false); setNewRoleLabel(""); }}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleAddRole}
                disabled={!newRoleLabel.trim() || addingRole}
                className="px-4 py-2 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-40"
                style={{ backgroundColor: UNAND_GREEN }}
              >
                {addingRole ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Konfirmasi Hapus ───────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-base font-bold text-gray-800 mb-1">Hapus Role</h2>
            <p className="text-sm text-gray-500 mb-5">
              Yakin ingin menghapus role{" "}
              <span className="font-semibold text-gray-700">"{deleteTarget.label}"</span>?
              Semua permission yang terkait akan ikut terhapus.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteRole}
                disabled={deletingRole}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 transition disabled:opacity-40"
              >
                {deletingRole ? "Menghapus..." : "Hapus"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}