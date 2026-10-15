
import { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  ImagePlus,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Info,
  Save,
  Send,
  LoaderCircle,
  Eye,
  FilePenLine,
} from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

// Konfigurasi API lokal dan production.
const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

const emptyForm = {
  title: "",
  excerpt: "",
  content: "",
  tags: "",
  thumbnail: null,
  status: "draft",
};

// Normalisasi data artikel dari backend.
function normalizeArticle(article) {
  let tags = article.tags || [];

  if (typeof tags === "string") {
    try {
      tags = JSON.parse(tags);
    } catch {
      tags = tags.split(",");
    }
  }

  const thumbnail = article.thumbnail || "";
  const thumbnailPreview = thumbnail
    ? thumbnail.startsWith("http")
      ? thumbnail
      : `${SERVER_URL}${thumbnail.startsWith("/") ? "" : "/"}${thumbnail}`
    : "";

  return {
    ...article,
    tags: Array.isArray(tags)
      ? tags.map((tag) => String(tag).trim()).filter(Boolean)
      : [],
    thumbnail,
    thumbnailPreview,
  };
}

// Komponen popup konfirmasi dan notifikasi.
function AppPopup({
  popup,
  onClose,
  onConfirm,
  busy = false,
}) {
  if (!popup) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      iconClass: "bg-green-100 text-green-600",
      buttonClass: "bg-[#00923D] hover:bg-[#007d34]",
      title: popup.title || "Berhasil",
    },
    error: {
      icon: AlertCircle,
      iconClass: "bg-red-100 text-red-600",
      buttonClass: "bg-red-600 hover:bg-red-700",
      title: popup.title || "Terjadi Kesalahan",
    },
    warning: {
      icon: AlertTriangle,
      iconClass: "bg-amber-100 text-amber-600",
      buttonClass: "bg-red-600 hover:bg-red-700",
      title: popup.title || "Konfirmasi",
    },
    info: {
      icon: Info,
      iconClass: "bg-blue-100 text-blue-600",
      buttonClass: "bg-[#00923D] hover:bg-[#007d34]",
      title: popup.title || "Informasi",
    },
  };

  const current = config[popup.type] || config.info;
  const Icon = current.icon;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/50 p-4 backdrop-blur-[3px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-popup-title"
        className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex justify-end px-5 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Tutup popup"
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-7 pb-7 pt-1 text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${current.iconClass}`}
          >
            <Icon size={30} strokeWidth={1.8} />
          </div>

          <h3
            id="article-popup-title"
            className="text-xl font-bold text-gray-900"
          >
            {current.title}
          </h3>

          <p className="mx-auto mt-2 max-w-sm whitespace-pre-line text-sm leading-6 text-gray-500">
            {popup.message}
          </p>

          {popup.confirm ? (
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
              >
                {popup.cancelText || "Batal"}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${current.buttonClass}`}
              >
                {busy ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : null}
                {busy
                  ? "Memproses..."
                  : popup.confirmText || "Ya, lanjutkan"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className={`mt-7 w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${current.buttonClass}`}
            >
              Mengerti
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Artikel() {
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("semua");
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [popup, setPopup] = useState(null);
  const [popupBusy, setPopupBusy] = useState(false);

  // Mengambil artikel dari backend.
  const loadArticles = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/articles`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Gagal mengambil artikel.");
      }

      const items = Array.isArray(data)
        ? data
        : data.articles || data.data || [];

      setArticles(items.map(normalizeArticle));
    } catch (err) {
      setError(`Gagal memuat artikel: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  // Membersihkan URL preview gambar sementara.
  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  const filteredArticles = articles.filter((article) => {
    const query = search.toLowerCase();

    const matchesSearch =
      (article.title || "").toLowerCase().includes(query) ||
      (article.excerpt || "").toLowerCase().includes(query) ||
      (article.tags || []).some((tag) =>
        tag.toLowerCase().includes(query)
      );

    const matchesStatus =
      statusFilter === "semua" || article.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const publishedCount = articles.filter(
    (article) => article.status === "published"
  ).length;

  const draftCount = articles.filter(
    (article) => article.status === "draft"
  ).length;

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setPreview("");
    setError("");
    setNotice("");
    setShowModal(true);
  };

  const openEdit = (article) => {
    setEditingId(article.id);
    setForm({
      title: article.title || "",
      excerpt: article.excerpt || "",
      content: article.content || "",
      tags: (article.tags || []).join(", "),
      thumbnail: null,
      status: article.status || "draft",
    });
    setPreview(article.thumbnailPreview || "");
    setError("");
    setNotice("");
    setShowModal(true);
  };

  const closeForm = () => {
    if (saving) return;

    const hasChanges =
      form.title.trim() ||
      form.excerpt.trim() ||
      form.content.trim() ||
      form.tags.trim() ||
      form.thumbnail;

    if (hasChanges) {
      setPopup({
        type: "warning",
        title: "Tutup formulir artikel?",
        message:
          "Perubahan yang belum disimpan akan hilang. Apakah kamu yakin ingin menutup formulir ini?",
        confirm: true,
        confirmText: "Ya, tutup",
        cancelText: "Lanjut mengedit",
        action: "close-form",
      });
      return;
    }

    setShowModal(false);
  };

  // Simpan artikel dengan status sesuai tombol yang dipilih.
  const save = async (event, targetStatus = form.status) => {
    event?.preventDefault();

    if (saving) return;

    setError("");
    setNotice("");

    if (
      !form.title.trim() ||
      !form.excerpt.trim() ||
      !form.content.trim() ||
      !form.tags.trim() ||
      !targetStatus ||
      (!form.thumbnail && !preview)
    ) {
      setError(
        "Semua field wajib diisi, termasuk thumbnail dan minimal satu tag."
      );
      return;
    }

    const tags = form.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    if (tags.length === 0) {
      setError("Masukkan minimal satu tag artikel.");
      return;
    }

    const formData = new FormData();
    formData.append("title", form.title.trim());
    formData.append("excerpt", form.excerpt.trim());
    formData.append("content", form.content.trim());
    formData.append("tags", JSON.stringify(tags));
    formData.append("status", targetStatus);

    if (form.thumbnail instanceof File) {
      formData.append("thumbnail", form.thumbnail);
    }

    setSaving(true);

    try {
      const url = editingId
        ? `${API_URL}/articles/${editingId}`
        : `${API_URL}/articles`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menyimpan artikel.");
      }

      setShowModal(false);
      setForm({ ...emptyForm });
      setPreview("");

      setPopup({
        type: "success",
        title: editingId ? "Artikel berhasil diperbarui!" : "Artikel berhasil disimpan!",
        message:
          targetStatus === "published"
            ? "Artikel sudah berstatus terbit dan siap ditampilkan pada website."
            : "Artikel tersimpan sebagai draft dan belum ditampilkan sebagai artikel terbit.",
      });

      await loadArticles();
    } catch (err) {
      setError(err.message || "Terjadi kesalahan saat menyimpan artikel.");
    } finally {
      setSaving(false);
    }
  };

  // Menghapus artikel menggunakan popup konfirmasi.
  const remove = (article) => {
    setPopup({
      type: "warning",
      title: "Hapus artikel?",
      message: `Artikel "${article.title}" akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`,
      confirm: true,
      confirmText: "Ya, hapus artikel",
      cancelText: "Batal",
      action: "delete",
      article,
    });
  };

  const confirmDelete = async (article) => {
    if (!article || deletingId !== null) return;

    setDeletingId(article.id);
    setPopupBusy(true);

    try {
      const response = await fetch(
        `${API_URL}/articles/${article.id}`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal menghapus artikel.");
      }

      setPopup({
        type: "success",
        title: "Artikel berhasil dihapus",
        message: `Artikel "${article.title}" sudah dihapus.`,
      });

      await loadArticles();
    } catch (err) {
      setPopup({
        type: "error",
        title: "Gagal menghapus artikel",
        message: err.message || "Terjadi kesalahan saat menghapus artikel.",
      });
    } finally {
      setDeletingId(null);
      setPopupBusy(false);
    }
  };

  const selectThumbnail = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Thumbnail harus berformat JPG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran thumbnail maksimal 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");

    setPreview((previous) => {
      if (previous.startsWith("blob:")) {
        URL.revokeObjectURL(previous);
      }

      return URL.createObjectURL(file);
    });

    setForm((previous) => ({ ...previous, thumbnail: file }));
  };

  const handlePopupConfirm = async () => {
    if (popup?.action === "delete") {
      await confirmDelete(popup.article);
      return;
    }

    if (popup?.action === "close-form") {
      setShowModal(false);
      setForm({ ...emptyForm });
      setPreview("");
    }

    setPopup(null);
  };

  const handlePopupClose = () => {
    if (popupBusy) return;
    setPopup(null);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="min-w-0 flex-1 overflow-y-auto">
        <Topbar title="Manajemen Artikel" />

        <div className="mx-auto max-w-7xl space-y-6 p-5 md:p-8">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center md:p-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#00923D]">
                <span className="h-2 w-2 rounded-full bg-[#00923D]" />
                BEM KM UNAND
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                Manajemen Artikel
              </h1>

              <p className="mt-1 text-sm text-gray-500">
                Kelola, simpan sebagai draft, dan terbitkan artikel website BEM.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00923D] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#007d34] hover:shadow-md"
            >
              <Plus size={18} />
              Tambah Artikel
            </button>
          </div>

          {/* Statistik */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-green-50 p-3 text-[#00923D]">
                  <FileText size={22} />
                </div>
                <span className="text-xs font-medium text-gray-400">
                  Semua artikel
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {articles.length}
              </p>
              <p className="mt-1 text-sm text-gray-500">Total artikel</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <Eye size={22} />
                </div>
                <span className="text-xs font-medium text-gray-400">
                  Dipublikasikan
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {publishedCount}
              </p>
              <p className="mt-1 text-sm text-gray-500">Artikel terbit</p>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-amber-50 p-3 text-amber-600">
                  <FilePenLine size={22} />
                </div>
                <span className="text-xs font-medium text-gray-400">
                  Belum terbit
                </span>
              </div>
              <p className="mt-4 text-3xl font-bold text-gray-900">
                {draftCount}
              </p>
              <p className="mt-1 text-sm text-gray-500">Artikel draft</p>
            </div>
          </div>

          {/* Notifikasi inline untuk error pemuatan data */}
          {error && !showModal && (
            <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => setError("")}
                className="rounded-lg p-1 hover:bg-red-100"
                aria-label="Tutup pesan error"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {notice && (
            <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 size={19} />
              <span className="flex-1">{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="rounded-lg p-1 hover:bg-green-100"
                aria-label="Tutup pemberitahuan"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {/* Daftar artikel */}
          <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 p-5 md:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Semua Artikel
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {filteredArticles.length} artikel ditemukan
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 transition focus-within:border-[#00923D] focus-within:ring-2 focus-within:ring-green-50">
                    <Search size={17} className="shrink-0 text-gray-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari artikel..."
                      aria-label="Cari artikel"
                      className="w-full min-w-0 py-2.5 text-sm outline-none sm:w-52"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => setSearch("")}
                        aria-label="Hapus pencarian"
                        className="text-gray-400 hover:text-gray-700"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    aria-label="Filter status artikel"
                    className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-600 outline-none transition focus:border-[#00923D]"
                  >
                    <option value="semua">Semua status</option>
                    <option value="draft">Draft</option>
                    <option value="published">Terbit</option>
                  </select>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <LoaderCircle
                  size={30}
                  className="animate-spin text-[#00923D]"
                />
                <p className="mt-3 text-sm text-gray-500">
                  Memuat artikel...
                </p>
              </div>
            ) : filteredArticles.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 text-gray-300">
                  <FileText size={32} />
                </div>
                <h3 className="mt-4 font-semibold text-gray-800">
                  {search || statusFilter !== "semua"
                    ? "Artikel tidak ditemukan"
                    : "Belum ada artikel"}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-gray-500">
                  {search || statusFilter !== "semua"
                    ? "Coba ubah kata kunci pencarian atau filter status."
                    : "Mulai dengan membuat artikel pertama untuk website BEM."}
                </p>

                {!search && statusFilter === "semua" && (
                  <button
                    type="button"
                    onClick={openCreate}
                    className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#00923D] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#007d34]"
                  >
                    <Plus size={17} />
                    Buat Artikel
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3 md:p-6">
                {filteredArticles.map((article) => (
                  <article
                    key={article.id}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white transition duration-200 hover:-translate-y-1 hover:border-green-100 hover:shadow-lg"
                  >
                    <div className="relative h-48 overflow-hidden bg-gray-100">
                      {article.thumbnailPreview ? (
                        <img
                          src={article.thumbnailPreview}
                          alt={article.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-gray-300">
                          <ImagePlus size={42} />
                        </div>
                      )}

                      <span
                        className={`absolute left-3 top-3 rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm ${
                          article.status === "published"
                            ? "bg-green-100 text-green-800"
                            : "bg-white text-gray-600"
                        }`}
                      >
                        {article.status === "published" ? "TERBIT" : "DRAFT"}
                      </span>
                    </div>

                    <div className="p-4">
                      <h3 className="line-clamp-2 min-h-12 text-base font-bold leading-6 text-gray-900">
                        {article.title}
                      </h3>

                      <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-gray-500">
                        {article.excerpt}
                      </p>

                      <div className="mt-3 flex min-h-6 flex-wrap gap-1.5">
                        {article.tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
                          >
                            #{tag}
                          </span>
                        ))}
                        {article.tags.length > 4 && (
                          <span className="px-1 py-1 text-xs text-gray-400">
                            +{article.tags.length - 4}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                        <span className="text-xs text-gray-400">
                          ID artikel: {article.id}
                        </span>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(article)}
                            title="Edit artikel"
                            aria-label={`Edit ${article.title}`}
                            className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition hover:border-green-200 hover:bg-green-50 hover:text-[#00923D]"
                          >
                            <Edit3 size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => remove(article)}
                            title="Hapus artikel"
                            aria-label={`Hapus ${article.title}`}
                            disabled={deletingId === article.id}
                            className="rounded-xl border border-gray-200 p-2.5 text-gray-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                          >
                            {deletingId === article.id ? (
                              <LoaderCircle size={16} className="animate-spin" />
                            ) : (
                              <Trash2 size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modal tambah/edit artikel */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 p-3 backdrop-blur-sm sm:p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <form
            onSubmit={(event) => save(event, form.status)}
            className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#00923D]">
                  BEM KM UNAND
                </p>
                <h2 className="mt-1 text-xl font-bold text-gray-900">
                  {editingId ? "Edit Artikel" : "Buat Artikel Baru"}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Lengkapi seluruh informasi sebelum menyimpan.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                aria-label="Tutup formulir"
                className="rounded-xl p-2.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-7">
              {error && (
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <p className="flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError("")}
                    aria-label="Tutup pesan error"
                    className="rounded p-0.5 hover:bg-red-100"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Judul Artikel <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#00923D] focus:ring-4 focus:ring-green-50"
                  placeholder="Masukkan judul artikel"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Ringkasan <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={form.excerpt}
                  onChange={(event) =>
                    setForm({ ...form, excerpt: event.target.value })
                  }
                  rows={3}
                  className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-[#00923D] focus:ring-4 focus:ring-green-50"
                  placeholder="Tulis ringkasan singkat yang menggambarkan isi artikel..."
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Isi Artikel <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  value={form.content}
                  onChange={(event) =>
                    setForm({ ...form, content: event.target.value })
                  }
                  rows={9}
                  className="w-full resize-y rounded-xl border border-gray-200 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-gray-400 focus:border-[#00923D] focus:ring-4 focus:ring-green-50"
                  placeholder="Tulis isi lengkap artikel di sini..."
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Gunakan paragraf yang rapi agar nyaman dibaca.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Thumbnail <span className="text-red-500">*</span>
                </label>

                {preview ? (
                  <div className="relative mb-3 overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                    <img
                      src={preview}
                      alt="Preview thumbnail artikel"
                      className="max-h-64 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPreview("");
                        setForm({ ...form, thumbnail: null });
                      }}
                      className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-semibold text-red-600 shadow transition hover:bg-white"
                    >
                      <Trash2 size={14} />
                      Hapus gambar
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center transition hover:border-green-300 hover:bg-green-50/50">
                    <div className="mb-3 rounded-xl bg-white p-3 text-[#00923D] shadow-sm">
                      <ImagePlus size={25} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      Klik untuk memilih thumbnail
                    </span>
                    <span className="mt-1 text-xs text-gray-400">
                      JPG, PNG, atau WebP · Maksimal 5 MB
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={selectThumbnail}
                      required={!preview}
                      className="sr-only"
                    />
                  </label>
                )}

                {preview && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50">
                    <ImagePlus size={15} />
                    Ganti thumbnail
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={selectThumbnail}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Tag Artikel <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={form.tags}
                  onChange={(event) =>
                    setForm({ ...form, tags: event.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#00923D] focus:ring-4 focus:ring-green-50"
                  placeholder="Contoh: BEM, kegiatan, kampus"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Pisahkan setiap tag menggunakan tanda koma.
                </p>
              </div>
             </div>
            

            {/* Tombol aksi utama */}
            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-xl px-4 py-3 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 disabled:opacity-50"
              >
                Batal
              </button>

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(null, "draft")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && form.status === "draft" ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  Simpan Draft
                </button>

                <button
                  type="button"
                  disabled={saving}
                  onClick={() => save(null, "published")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00923D] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#007d34] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving && form.status === "published" ? (
                    <LoaderCircle size={17} className="animate-spin" />
                  ) : (
                    <Send size={17} />
                  )}
                  Terbitkan
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Popup konfirmasi dan notifikasi */}
      <AppPopup
        popup={popup}
        busy={popupBusy}
        onClose={handlePopupClose}
        onConfirm={handlePopupConfirm}
      />
    </div>
  );
}
