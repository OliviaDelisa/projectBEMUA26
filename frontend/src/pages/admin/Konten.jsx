import { useEffect, useState } from "react";
import { CalendarDays, Edit3, ImagePlus, Megaphone, Plus, Trash2, X } from "lucide-react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";

const TYPES = {
  event: { label: "Event", icon: CalendarDays },
  announcement: { label: "Pengumuman", icon: Megaphone },
  gallery: { label: "Galeri", icon: ImagePlus },
};

const emptyForm = { title: "", description: "", event_start: "", event_end: "", is_published: false, images: [] };
const formatDate = (value) => value ? new Date(value.replace(" ", "T")).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "";

export default function Konten() {
  const [activeType, setActiveType] = useState("event");
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/content?type=${activeType}`);
      setItems(await response.json());
    } catch {
      setNotice({ type: "error", text: "Gagal memuat konten" });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [activeType]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title,
      description: item.description || "",
      event_start: item.event_start ? item.event_start.slice(0, 16).replace(" ", "T") : "",
      event_end: item.event_end ? item.event_end.slice(0, 16).replace(" ", "T") : "",
      is_published: item.is_published,
      images: item.images || [],
    });
    setShowModal(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setNotice({ type: "error", text: "Judul wajib diisi" });
    setSaving(true);
    const body = new FormData();
    body.append("content_type", activeType);
    body.append("title", form.title);
    body.append("description", form.description);
    body.append("event_start", activeType === "event" ? form.event_start : "");
    body.append("event_end", activeType === "event" ? form.event_end : "");
    body.append("is_published", form.is_published);
    if (editingId) body.append("existing_images", JSON.stringify(form.images));
    form.newImages?.forEach((image) => body.append("images", image));

    try {
      const response = await fetch(editingId ? `${API}/content/${editingId}` : `${API}/content`, { method: editingId ? "PUT" : "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setShowModal(false);
      setNotice({ type: "success", text: editingId ? "Konten diperbarui" : "Konten ditambahkan" });
      fetchItems();
    } catch (error) { setNotice({ type: "error", text: error.message || "Gagal menyimpan konten" }); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Hapus konten ini?")) return;
    try {
      const response = await fetch(`${API}/content/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setNotice({ type: "success", text: "Konten dihapus" });
      fetchItems();
    } catch { setNotice({ type: "error", text: "Gagal menghapus konten" }); }
  };

  const TypeIcon = TYPES[activeType].icon;
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Topbar title="Manajemen Konten" />
        <div className="-mt-5 md:-mt-8 p-5 md:p-8 max-w-7xl mx-auto space-y-5">
          <div className="bg-white rounded-none border border-x-0 border-t-0 border-gray-100 shadow-none -mx-5 md:-mx-8 px-9 md:px-14">
            <div className="flex items-center gap-3 border-b border-gray-100">
            <div className="flex gap-2">
              {Object.entries(TYPES).map(([type, config]) => { const Icon = config.icon; return <button key={type} onClick={() => setActiveType(type)} className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 ${activeType === type ? "text-[#00923D] border-[#00923D]" : "text-gray-400 border-transparent"}`}><Icon size={17} />{config.label}</button>; })}
            </div>
            </div>
          </div>
          <div className="flex justify-end py-3">
            <button onClick={openCreate} className="flex items-center gap-2 bg-[#00923D] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#007d34]"><Plus size={17} /> Tambah {TYPES[activeType].label}</button>
          </div>
          {notice && <div className={`mb-4 px-4 py-3 rounded-xl text-sm ${notice.type === "error" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>{notice.text}</div>}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 md:p-6 min-h-[430px]">
            <div className="flex items-center gap-3 -mx-5 md:-mx-6 px-5 md:px-6 pb-4 border-b border-gray-100 mb-5">
              <TypeIcon size={20} className="text-[#00923D]" />
              <h2 className="text-base font-semibold text-gray-800">Semua {TYPES[activeType].label}</h2>
              <span className="text-sm text-gray-400">({items.length})</span>
            </div>
            {loading ? <div className="py-16 text-center text-gray-400 text-sm">Memuat konten...</div> : items.length === 0 ? <div className="py-16 text-center border border-dashed border-gray-200 rounded-xl"><TypeIcon className="mx-auto text-gray-300" size={36} /><p className="mt-3 text-sm font-semibold text-gray-500">Belum ada {TYPES[activeType].label.toLowerCase()}</p></div> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{items.map((item) => <article key={item.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm"><div className="h-44 bg-gray-100">{item.cover_image ? <img src={`${API.replace("/api", "")}${item.cover_image}`} alt={item.title} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-gray-300"><TypeIcon size={42} /></div>}</div><div className="p-4"><div className="flex justify-between items-start gap-3"><h2 className="font-bold text-gray-800 line-clamp-2">{item.title}</h2><span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${item.is_published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{item.is_published ? "TERBIT" : "DRAFT"}</span></div>{item.event_start && <p className="text-xs text-[#00923D] mt-2">{formatDate(item.event_start)}{item.event_end ? ` - ${formatDate(item.event_end)}` : ""}</p>}<p className="text-sm text-gray-500 mt-2 line-clamp-3">{item.description || "Tidak ada deskripsi."}</p><div className="flex justify-end gap-2 mt-4"><button onClick={() => openEdit(item)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg" title="Edit"><Edit3 size={16} /></button><button onClick={() => remove(item.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus"><Trash2 size={16} /></button></div></div></article>)}</div>}
          </section>
        </div>
      </main>
      {showModal && <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"><form onSubmit={save} className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6"><div className="flex justify-between items-center mb-5"><h2 className="text-lg font-bold">{editingId ? "Edit" : "Tambah"} {TYPES[activeType].label}</h2><button type="button" onClick={() => setShowModal(false)} className="text-gray-400"><X /></button></div><label className="block text-sm font-semibold text-gray-700 mb-1">Judul</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mb-4 outline-none focus:border-[#00923D]" placeholder={activeType === "event" ? "Rakit Akademik" : "Judul konten"} /><label className="block text-sm font-semibold text-gray-700 mb-1">Deskripsi</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows="4" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 mb-4 outline-none focus:border-[#00923D]" placeholder="Tulis informasi lengkap di sini..." />{activeType === "event" && <div className="grid sm:grid-cols-2 gap-3 mb-4"><div><label className="block text-sm font-semibold text-gray-700 mb-1">Mulai</label><input type="datetime-local" value={form.event_start} onChange={(e) => setForm({ ...form, event_start: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5" /></div><div><label className="block text-sm font-semibold text-gray-700 mb-1">Selesai</label><input type="datetime-local" value={form.event_end} onChange={(e) => setForm({ ...form, event_end: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5" /></div></div>}<label className="block text-sm font-semibold text-gray-700 mb-1">Gambar {activeType === "gallery" ? "(bisa lebih dari satu)" : ""}</label>{form.images?.length > 0 && <div className="flex flex-wrap gap-2 mb-2">{form.images.map((image) => <div key={image} className="relative"><img src={`${API.replace("/api", "")}${image}`} alt="" className="w-16 h-16 object-cover rounded-lg" /><button type="button" onClick={() => setForm({ ...form, images: form.images.filter((current) => current !== image) })} className="absolute -right-1 -top-1 bg-red-500 text-white rounded-full p-0.5"><X size={11} /></button></div>)}</div>}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={activeType === "gallery"} onChange={(e) => setForm({ ...form, newImages: Array.from(e.target.files) })} className="w-full text-sm mb-4" /><label className="flex items-center gap-2 text-sm text-gray-700 mb-6"><input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} className="accent-[#00923D]" /> Terbitkan sekarang</label><div className="flex justify-end gap-2"><button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl text-sm text-gray-500">Batal</button><button disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#00923D] text-white text-sm font-semibold disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan"}</button></div></form></div>}
    </div>
  );
}
