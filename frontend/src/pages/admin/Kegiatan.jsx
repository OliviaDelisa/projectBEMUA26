import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { exportAbsensiExcel, buildRekapKementerian } from "../../hooks/ExportKegiatan";

import {
  Plus, Search, X, Calendar, MapPin, Users, LayoutGrid, Clock,
  CheckCircle, Trash2, Download, FileSpreadsheet, Edit3, RefreshCw, Camera,
  UserCheck, UserX, Navigation, AlertTriangle,
} from "lucide-react";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const isValidCoord = (lat, lng) => {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return !isNaN(la) && !isNaN(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
};

const geocodeSearch = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=id`;
  const res = await fetch(url, { headers: { "Accept-Language": "id" } });
  return res.json();
};

const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: { "Accept-Language": "id" } });
  return res.json();
};

const formatReverseResult = (data) => {
  if (!data || !data.address) return data?.display_name || "";
  const a = data.address;
  return (
    data.name ||
    a.amenity || a.building || a.shop || a.tourism || a.leisure ||
    [a.road, a.suburb || a.neighbourhood || a.village, a.city || a.town || a.county]
      .filter(Boolean).join(", ")
  );
};

const formatDateTime = (dtStr) => {
  const d = new Date(dtStr);
  const tgl = d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { tgl, jam };
};

const getStatus = (k) => {
  const now = new Date();
  const start = new Date(k.start_datetime);
  const end = new Date(k.end_datetime);
  if (now < start) return "mendatang";
  if (now >= start && now <= end) return "berlangsung";
  return "selesai";
};

// ── Sub-components ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const config = {
    mendatang:   { label: "Mendatang",   cls: "bg-blue-50 text-blue-600" },
    berlangsung: { label: "Berlangsung", cls: "bg-amber-50 text-amber-600" },
    selesai:     { label: "Selesai",     cls: "bg-gray-100 text-gray-500" },
    hadir:       { label: "Hadir",       cls: "bg-emerald-50 text-emerald-600" },
    alfa:        { label: "Alfa",        cls: "bg-red-50 text-red-500" },
  };
  const s = config[status] || config.selesai;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${s.cls}`}>
      
      {s.label}
    </span>
  );
};

const StatBox = ({ label, value, sub, icon, color, active, onClick }) => {
  const borderActive = {
    "":      "border-emerald-300 ring-2 ring-emerald-100",
    blue:    "border-blue-300 ring-2 ring-blue-100",
    amber:   "border-amber-300 ring-2 ring-amber-100",
    rose:    "border-rose-300 ring-2 ring-rose-100",
  };
  const topBar = {
    "":    "bg-emerald-500",
    blue:  "bg-blue-500",
    amber: "bg-amber-500",
    rose:  "bg-rose-500",
  };
  const iconColor = {
    "":    "text-emerald-600",
    blue:  "text-blue-500",
    amber: "text-amber-500",
    rose:  "text-rose-500",
  };
  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-xl border overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${active ? borderActive[color] + " shadow-sm" : "border-gray-200 shadow-sm"}`}
    >
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${topBar[color]}`} />
      <div className="p-5">
        <div className={`mb-3 ${iconColor[color]}`}>{icon}</div>
        <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">{label}</div>
        <div className="text-3xl font-semibold text-gray-800 tabular-nums">{value}</div>
        <div className="text-[11px] text-gray-400 mt-1">{sub}</div>
      </div>
    </div>
  );
};

// ── Leaflet map style injected once ──────────────────────────────────────────
const LEAFLET_OVERRIDE = `
#kg-map { width:110%; height:580px; border-radius:10px; border:1px solid #e5e7eb; margin-top:8px; }
.kg-geocode-dropdown { position:absolute; top:calc(100% + 4px); left:0; right:0; background:white; border:1px solid #e5e7eb; border-radius:10px; box-shadow:0 8px 24px rgba(0,0,0,.1); z-index:9999; overflow:hidden; max-height:200px; overflow-y:auto; }
`;

// ── Main Component ────────────────────────────────────────────────────────────

export default function ManajemenKegiatan() {
  const [kegiatanList, setKegiatanList] = useState([]);
  const [memberList, setMemberList] = useState([]);
  const [activeFilter, setActiveFilter] = useState("semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing, setIsEditing] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const todayStr = toLocalDateString(new Date());

  const [form, setForm] = useState({
    nama: "", desc: "",
    tglMulai: todayStr, tglSelesai: todayStr,
    jamMulai: "09:00", jamSelesai: "17:00",
    lokasi: "", radius: 100, lat: -0.9471, lng: 100.4172,
  });

  const [coordInput, setCoordInput] = useState({ lat: "-0.947100", lng: "100.417200" });
  const [coordError, setCoordError] = useState("");

  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseToast, setReverseToast] = useState(false);
  const geoDebounceRef = useRef(null);
  const geoWrapRef = useRef(null);

  const [detailId, setDetailId] = useState(null);
  const [absensiDetail, setAbsensiDetail] = useState([]);
  const [refreshingAbsensi, setRefreshingAbsensi] = useState(false);
  const [drawerAbsenFilter, setDrawerAbsenFilter] = useState(null);
  const [previewPhoto, setPreviewPhoto] = useState(null);
  const [drawerTab, setDrawerTab] = useState("daftar");
  const [memberModal, setMemberModal] = useState(null);
  const [memberModalData, setMemberModalData] = useState([]);
  const [memberModalLoading, setMemberModalLoading] = useState(false);

  const mapRef = useRef(null);
  const leafletInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  // Inject leaflet override once
  useEffect(() => {
    const el = document.createElement("style");
    el.id = "kg-override";
    el.textContent = LEAFLET_OVERRIDE;
    document.head.appendChild(el);
    fetchKegiatan();
    fetchMembers();
    return () => document.getElementById("kg-override")?.remove();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (geoWrapRef.current && !geoWrapRef.current.contains(e.target)) setGeoResults([]);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!detailId) return;
    const interval = setInterval(() => fetchAttendance(detailId), 15000);
    return () => clearInterval(interval);
  }, [detailId]);

  useEffect(() => {
    setCoordInput({ lat: form.lat.toFixed(6), lng: form.lng.toFixed(6) });
  }, [form.lat, form.lng]);

  // ── API ──────────────────────────────────────────────────────────────────

  const fetchKegiatan = async () => {
    try {
      const res = await fetch(`${API}/activities`);
      setKegiatanList(await res.json());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API}/users`);
      const data = await res.json();
      setMemberList(data.filter((u) => u.role === "user"));
    } catch (err) { console.error(err); }
  };

  const fetchAttendance = async (id) => {
    try {
      const res = await fetch(`${API}/activities/${id}/attendance`);
      setAbsensiDetail(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleRefreshAbsensi = async () => {
    if (!detailId || refreshingAbsensi) return;
    setRefreshingAbsensi(true);
    try {
      const res = await fetch(`${API}/activities/${detailId}/attendance`);
      setAbsensiDetail(await res.json());
    } catch (err) { console.error(err); }
    finally { setRefreshingAbsensi(false); }
  };

  const handleOpenMemberModal = async (kegiatanId, filter, titleLabel) => {
    setMemberModal({ kegiatanId, filter, title: titleLabel });
    setMemberModalLoading(true);
    setMemberModalData([]);
    try {
      const res = await fetch(`${API}/activities/${kegiatanId}/attendance`);
      setMemberModalData(await res.json());
    } catch (err) { console.error(err); }
    finally { setMemberModalLoading(false); }
  };

  // ── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: kegiatanList.length,
    mendatang: kegiatanList.filter((k) => getStatus(k) === "mendatang").length,
    berlangsung: kegiatanList.filter((k) => getStatus(k) === "berlangsung").length,
    selesai: kegiatanList.filter((k) => getStatus(k) === "selesai").length,
  }), [kegiatanList]);

  // ── Map helpers ───────────────────────────────────────────────────────────

  const moveMarkerAndCircle = useCallback((lat, lng) => {
    markerRef.current?.setLatLng([lat, lng]);
    circleRef.current?.setLatLng([lat, lng]);
    leafletInstance.current?.panTo([lat, lng]);
  }, []);

  const handleMapClick = useCallback(async (lat, lng) => {
    setForm((prev) => ({ ...prev, lat, lng }));
    moveMarkerAndCircle(lat, lng);
    setReverseLoading(true);
    try {
      const data = await reverseGeocode(lat, lng);
      const nama = formatReverseResult(data);
      if (nama) {
        setForm((prev) => ({ ...prev, lat, lng, lokasi: nama }));
        setReverseToast(true);
        setTimeout(() => setReverseToast(false), 2500);
        setFormErrors((p) => ({ ...p, lokasi: null }));
      }
    } catch (err) { console.error(err); }
    finally { setReverseLoading(false); }
  }, [moveMarkerAndCircle]);

  // Init Leaflet when step 2 opens
  useEffect(() => {
    if (currentStep === 2 && showModal && mapRef.current) {
      const timer = setTimeout(() => {
        if (!leafletInstance.current) {
          leafletInstance.current = L.map(mapRef.current).setView([form.lat, form.lng], 15);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(leafletInstance.current);
          markerRef.current = L.marker([form.lat, form.lng], { draggable: true, icon: DefaultIcon }).addTo(leafletInstance.current);
          circleRef.current = L.circle([form.lat, form.lng], { radius: form.radius, color: "#10b981", fillOpacity: 0.1 }).addTo(leafletInstance.current);
          markerRef.current.on("dragend", async (e) => {
            const { lat, lng } = e.target.getLatLng();
            await handleMapClick(lat, lng);
          });
          leafletInstance.current.on("click", async (e) => {
            const { lat, lng } = e.latlng;
            markerRef.current.setLatLng([lat, lng]);
            circleRef.current.setLatLng([lat, lng]);
            await handleMapClick(lat, lng);
          });
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        if (leafletInstance.current) {
          leafletInstance.current.remove();
          leafletInstance.current = null;
          markerRef.current = null;
          circleRef.current = null;
        }
      };
    }
  }, [currentStep, showModal]);

  useEffect(() => {
    circleRef.current?.setRadius(Number(form.radius) || 100);
  }, [form.radius]);

  // ── Geocode ───────────────────────────────────────────────────────────────

  const handleGeoQueryChange = (e) => {
    const val = e.target.value;
    setGeoQuery(val);
    setGeoResults([]);
    clearTimeout(geoDebounceRef.current);
    if (val.trim().length < 3) return;
    setGeoLoading(true);
    geoDebounceRef.current = setTimeout(async () => {
      try { setGeoResults(await geocodeSearch(val)); }
      catch (err) { console.error(err); }
      finally { setGeoLoading(false); }
    }, 600);
  };

  const handleGeoSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const namaLokasi = item.name || item.display_name.split(",")[0].trim();
    setForm((prev) => ({ ...prev, lat, lng, lokasi: namaLokasi }));
    moveMarkerAndCircle(lat, lng);
    setGeoQuery("");
    setGeoResults([]);
    setFormErrors((p) => ({ ...p, lokasi: null }));
  };

  const handleApplyCoord = () => {
    const latStr = coordInput.lat.trim();
    const lngStr = coordInput.lng.trim();
    if (!isValidCoord(latStr, lngStr)) {
      setCoordError("Koordinat tidak valid. Lat: -90 s/d 90, Lng: -180 s/d 180");
      return;
    }
    setCoordError("");
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    setForm((prev) => ({ ...prev, lat, lng }));
    moveMarkerAndCircle(lat, lng);
    setReverseLoading(true);
    reverseGeocode(lat, lng).then((data) => {
      const nama = formatReverseResult(data);
      if (nama) {
        setForm((prev) => ({ ...prev, lokasi: nama }));
        setReverseToast(true);
        setTimeout(() => setReverseToast(false), 2500);
        setFormErrors((p) => ({ ...p, lokasi: null }));
      }
    }).catch(console.error).finally(() => setReverseLoading(false));
  };

  // ── Form validation ───────────────────────────────────────────────────────

  const isStartLocked = isEditing && (editingStatus === "berlangsung" || editingStatus === "selesai");

  const isStep1Valid = useMemo(() => {
    const namaOk = form.nama.trim().length > 0 && form.nama.trim().length <= 50;
    const descOk = form.desc.trim().length <= 150;
    const mulaiOk = (!isEditing || editingStatus === "mendatang") ? (!!form.tglMulai && !!form.jamMulai) : true;
    return namaOk && descOk && mulaiOk && !!form.tglSelesai && !!form.jamSelesai;
  }, [form, isEditing, editingStatus]);

  const isStep2Valid = useMemo(() => form.lokasi.trim().length > 0, [form.lokasi]);

  const validateStep1 = () => {
    const errors = {};
    if (!form.nama.trim()) errors.nama = "Nama kegiatan wajib diisi.";
    else if (form.nama.trim().length > 50) errors.nama = "Maksimal 50 karakter.";
    if (form.desc && form.desc.trim().length > 150) errors.desc = "Maksimal 150 karakter.";
    if (!isEditing || editingStatus === "mendatang") {
      if (!form.tglMulai) errors.tglMulai = "Tanggal mulai wajib diisi.";
      if (!form.jamMulai) errors.jamMulai = "Jam mulai wajib diisi.";
    }
    if (!form.tglSelesai) errors.tglSelesai = "Tanggal selesai wajib diisi.";
    if (!form.jamSelesai) errors.jamSelesai = "Jam selesai wajib diisi.";
    return errors;
  };

  const validateStep2 = () => {
    const errors = {};
    if (!form.lokasi.trim()) errors.lokasi = "Nama lokasi wajib diisi.";
    return errors;
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleDeleteClick = (id, title) => setConfirmDelete({ id, title });

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setConfirmDelete(null);
    try {
      const res = await fetch(`${API}/activities/${id}`, { method: "DELETE" });
      if (res.ok) setKegiatanList((prev) => prev.filter((k) => k.id !== id));
      else alert("Gagal menghapus kegiatan");
    } catch (err) { console.error(err); }
  };

  const handleEditOpen = (k) => {
    const status = getStatus(k);
    if (status === "selesai") return;
    const start = new Date(k.start_datetime);
    const end = new Date(k.end_datetime);
    const padTime = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    const latVal = parseFloat(k.latitude);
    const lngVal = parseFloat(k.longitude);
    setForm({ nama: k.title, desc: k.description, tglMulai: toLocalDateString(start), tglSelesai: toLocalDateString(end), jamMulai: padTime(start), jamSelesai: padTime(end), lokasi: k.location_name, radius: k.radius_meters, lat: latVal, lng: lngVal });
    setCoordInput({ lat: latVal.toFixed(6), lng: lngVal.toFixed(6) });
    setCoordError("");
    setFormErrors({});
    setIsEditing(k.id);
    setEditingStatus(status);
    setCurrentStep(1);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (currentStep === 1) {
      const errors = validateStep1();
      if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
      setFormErrors({});
      return setCurrentStep(2);
    }
    const errors = validateStep2();
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    const payload = {
      title: form.nama, description: form.desc, location_name: form.lokasi,
      latitude: form.lat, longitude: form.lng, radius_meters: form.radius,
      metode: "selfie",
      start_datetime: `${form.tglMulai} ${form.jamMulai}`,
      end_datetime: `${form.tglSelesai} ${form.jamSelesai}`,
      participant_ids: memberList.map((m) => m.id),
    };
    try {
      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `${API}/activities/${isEditing}` : `${API}/activities`;
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await res.json();
      if (!res.ok) { alert(result.message || "Gagal menyimpan kegiatan"); return; }
      setShowModal(false);
      fetchKegiatan();
    } catch (err) { alert("Gagal menyimpan"); }
  };

  // ── Derived filtered lists ────────────────────────────────────────────────

  const filteredKegiatan = kegiatanList.filter((k) => {
    const s = getStatus(k);
    const matchFilter = activeFilter === "semua" || s === activeFilter;
    return matchFilter && k.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeKegiatan = kegiatanList.find((k) => k.id === detailId);

  const rekapKementerian = useMemo(() => buildRekapKementerian(absensiDetail), [absensiDetail]);

  const filteredAbsensiDrawer = useMemo(() => {
    if (!drawerAbsenFilter) return absensiDetail;
    if (drawerAbsenFilter === "hadir") return absensiDetail.filter((a) => a.status === "hadir");
    if (drawerAbsenFilter === "alfa") return absensiDetail.filter((a) => a.status !== "hadir");
    return absensiDetail;
  }, [absensiDetail, drawerAbsenFilter]);

  const filteredMemberModalData = useMemo(() => {
    if (!memberModal) return [];
    if (memberModal.filter === "hadir") return memberModalData.filter((a) => a.status === "hadir");
    if (memberModal.filter === "alfa") return memberModalData.filter((a) => a.status !== "hadir");
    return memberModalData;
  }, [memberModal, memberModalData]);

  const minTglSelesai = form.tglMulai || todayStr;
  const charLen = (s) => s.length;
  const charWarn = (len, max) => len > max ? "text-red-500 font-semibold" : len >= max * 0.85 ? "text-amber-500 font-semibold" : "text-gray-400";

  // ── Selfie preview ────────────────────────────────────────────────────────

  const renderFotoSelfie = (foto) => {
    if (!foto) return <span className="text-xs text-gray-400 italic">–</span>;
    const src = foto.startsWith("data:") ? foto : `data:image/jpeg;base64,${foto}`;
    return (
      <img src={src} alt="selfie" onClick={() => setPreviewPhoto(src)}
        className="w-9 h-9 rounded-lg object-cover border border-gray-200 cursor-pointer hover:scale-105 transition-transform" />
    );
  };

  // ── Input shared classes ──────────────────────────────────────────────────
  const inputCls = (err) =>
    `w-full h-10 px-3 text-sm border rounded-lg outline-none transition focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 ${err ? "border-red-400" : "border-gray-200"}`;

  // ═════════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
  <div className="flex h-screen bg-gray-50 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden min-h-0">
        <Topbar title="Manajemen Kegiatan" />

        {/* Top action bar */}
        <div className="flex justify-end px-7 py-4">
          <button
            onClick={() => {
              setIsEditing(null); setEditingStatus(null); setFormErrors({});
              setGeoQuery(""); setGeoResults([]); setCoordError("");
              const defLat = -0.9471, defLng = 100.4172;
              setForm({ nama: "", desc: "", tglMulai: todayStr, tglSelesai: todayStr, jamMulai: "09:00", jamSelesai: "17:00", lokasi: "", radius: 100, lat: defLat, lng: defLng });
              setCoordInput({ lat: defLat.toFixed(6), lng: defLng.toFixed(6) });
              setCurrentStep(1); setShowModal(true);
            }}
            className="inline-flex items-center gap-2 h-9 px-4 text-white text-sm font-medium rounded-lg transition"
              style={{ backgroundColor: "#00923D" }}
          >
            <Plus size={15} /> Buat Kegiatan
          </button>
        </div>

        <div className="px-7 pb-7 space-y-5 overflow-y-auto">

          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4">
            <StatBox label="Total Kegiatan"  value={stats.total}       sub="Semua kegiatan"       icon={<LayoutGrid size={18}/>} color=""      active={activeFilter === "semua"}        onClick={() => setActiveFilter("semua")} />
            <StatBox label="Mendatang"        value={stats.mendatang}   sub="Segera dilaksanakan"  icon={<Calendar   size={18}/>} color="blue"  active={activeFilter === "mendatang"}    onClick={() => setActiveFilter("mendatang")} />
            <StatBox label="Berlangsung"      value={stats.berlangsung} sub="Sedang berjalan"      icon={<Clock      size={18}/>} color="amber" active={activeFilter === "berlangsung"}  onClick={() => setActiveFilter("berlangsung")} />
            <StatBox label="Selesai"          value={stats.selesai}     sub="Kegiatan lampau"      icon={<CheckCircle size={18}/>} color="rose" active={activeFilter === "selesai"}      onClick={() => setActiveFilter("selesai")} />
          </div>

          {/* Kegiatan list */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <LayoutGrid size={15} className="text-emerald-500" />
                {activeFilter === "semua" ? "Semua Kegiatan" : activeFilter === "mendatang" ? "Kegiatan Mendatang" : activeFilter === "berlangsung" ? "Kegiatan Berlangsung" : "Kegiatan Selesai"}
                <span className="text-xs font-normal text-gray-400">({filteredKegiatan.length})</span>
              </div>
              <div className="relative w-64">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                  placeholder="Cari nama kegiatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="p-5">
              {filteredKegiatan.length === 0 ? (
                <div className="text-center py-14 text-sm text-gray-400">Belum ada kegiatan</div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {filteredKegiatan.map((k) => {
                    const s = getStatus(k);
                    const jmlPeserta = Number(k.peserta) || 0;
                    const jmlHadir = Number(k.hadir) || 0;
                    const jmlAlfa = jmlPeserta - jmlHadir;
                    const startDT = formatDateTime(k.start_datetime);
                    const endDT = formatDateTime(k.end_datetime);

                    return (
                      <div key={k.id} className="flex flex-col border border-gray-200 rounded-xl bg-white hover:-translate-y-0.5 hover:shadow-md transition-all">
                        {/* Card body */}
                        <div className="p-5 flex-1">
                          <div className="flex justify-between items-start mb-3 gap-2">
                            <h3 className="text-sm font-semibold text-gray-800 leading-snug">{k.title}</h3>
                            <StatusBadge status={s} />
                          </div>
                          <div className="grid grid-cols-[12px_48px_1fr] gap-x-2 gap-y-2 items-center text-xs text-gray-500">
                        <Calendar size={12} className="text-gray-400" />
                        <span className="text-gray-400">Mulai</span>
                        <span className="text-gray-600">{startDT.tgl} {startDT.jam}</span>

                        <Clock size={12} className="text-gray-400" />
                        <span className="text-gray-400">Selesai</span>
                        <span className="text-gray-600">{endDT.tgl} {endDT.jam}</span>

                        <MapPin size={12} className="text-gray-400" />
                        <span className="text-gray-400">Lokasi</span>
                        <span className="text-gray-600 truncate">{k.location_name}</span>
                      </div>
                        </div>

                        {/* Quick stats */}
                        <div className="flex gap-2 px-5 py-3 border-t border-gray-100 bg-gray-50 rounded-b-none">
                          {[
                            { label: "Total", val: jmlPeserta, filter: "semua", cls: "text-gray-500 bg-white border-gray-200 hover:border-gray-300" },
                            { label: "Hadir", val: jmlHadir,   filter: "hadir", cls: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:border-emerald-300" },
                            { label: "Alfa",  val: jmlAlfa,    filter: "alfa", cls: "text-red-500 bg-red-50 border-red-200 hover:border-red-300" },
                          ].map((item) => (
                            <button key={item.label}
                              onClick={() => handleOpenMemberModal(k.id, item.filter, `${item.label === "Total" ? "Semua Anggota - " : item.label === "Hadir" ? "" : ""} ${k.title}`)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border rounded-lg transition ${item.cls}`}
                            >
                              {item.icon}
                              <span className="font-semibold tabular-nums">{item.val}</span>
                              <span className="text-[10px] opacity-70">{item.label}</span>
                            </button>
                          ))}
                        </div>

                        {/* Footer actions */}
                        <div className="flex gap-2 p-4 border-t border-gray-100">
                          <button
                            onClick={() => { setDetailId(k.id); fetchAttendance(k.id); setDrawerTab("daftar"); setDrawerAbsenFilter(null); }}
                            className="flex-1 h-8 text-xs font-medium text-white rounded-lg transition"
                            style={{ backgroundColor: "#00923D" }}
                          >
                            Kelola Absensi
                          </button>
                          {s !== "selesai" && (
                            <button onClick={() => handleEditOpen(k)} className="h-8 w-8 flex items-center justify-center border border-gray-200 hover:border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 transition">
                              <Edit3 size={14} />
                            </button>
                          )}
                          {s === "mendatang" && (
                            <button onClick={() => handleDeleteClick(k.id, k.title)} className="h-8 w-8 flex items-center justify-center border border-red-200 hover:border-red-300 rounded-lg text-red-400 hover:text-red-600 transition">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ══ MODAL BUAT/EDIT ══════════════════════════════════════════════ */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {isEditing ? `Edit Kegiatan${editingStatus ? ` · ${editingStatus.charAt(0).toUpperCase() + editingStatus.slice(1)}` : ""}` : "Buat Kegiatan Baru"}
                  </div>
                  {isStartLocked && (
                    <div className="text-xs text-amber-600 mt-0.5 font-medium">
                      Tanggal &amp; jam mulai terkunci — kegiatan sudah berlangsung
                    </div>
                  )}
                </div>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition"><X size={17} /></button>
              </div>

              {/* Stepper */}
              <div className="flex items-center px-6 py-3 bg-gray-50 border-b border-gray-100 gap-3">
                {[{ n: 1, label: "Info Dasar" }, { n: 2, label: "Lokasi" }].map(({ n, label }, idx) => (
                  <div key={n} className="flex items-center gap-2">
                    {idx > 0 && <div className="w-10 h-px bg-gray-200" />}
                    <div className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition ${currentStep >= n ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                      {currentStep > n ? "✓" : n}
                    </div>
                    <span className={`text-xs font-medium ${currentStep >= n ? "text-gray-700" : "text-gray-400"}`}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
                {currentStep === 1 ? (
                  <div className="space-y-4">
                    {/* Nama */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Nama Kegiatan *</label>
                      <input className={inputCls(formErrors.nama)} placeholder="Masukkan nama kegiatan..." maxLength={50} value={form.nama}
                        onChange={(e) => { setForm({ ...form, nama: e.target.value }); setFormErrors((p) => ({ ...p, nama: null })); }} />
                      <div className="flex justify-between mt-1">
                        {formErrors.nama ? <span className="text-xs text-red-500">{formErrors.nama}</span> : <span />}
                        <span className={`text-xs ${charWarn(charLen(form.nama), 50)}`}>{form.nama.length}/50</span>
                      </div>
                    </div>
                    {/* Deskripsi */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Deskripsi <span className="normal-case text-gray-400 font-normal"></span></label>
                      <textarea className={`${inputCls(formErrors.desc)} h-20 py-2 resize-none`} placeholder="Deskripsi singkat..." maxLength={150} value={form.desc}
                        onChange={(e) => { setForm({ ...form, desc: e.target.value }); setFormErrors((p) => ({ ...p, desc: null })); }} />
                      <div className="flex justify-between mt-1">
                        {formErrors.desc ? <span className="text-xs text-red-500">{formErrors.desc}</span> : <span />}
                        <span className={`text-xs ${charWarn(charLen(form.desc), 150)}`}>{form.desc.length}/150</span>
                      </div>
                    </div>
                    {/* Tanggal & Jam */}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Tanggal Mulai", key: "tglMulai", type: "date", locked: isStartLocked, min: isStartLocked ? undefined : todayStr },
                        { label: "Jam Mulai",      key: "jamMulai", type: "time", locked: isStartLocked },
                        { label: "Tanggal Selesai", key: "tglSelesai", type: "date", min: minTglSelesai },
                        { label: "Jam Selesai",    key: "jamSelesai", type: "time" },
                      ].map(({ label, key, type, locked, min }) => (
                        <div key={key}>
                          <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                            {label} *
                            {locked && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">🔒</span>}
                          </label>
                          <input type={type} className={inputCls(formErrors[key])} value={form[key]} disabled={locked} min={min}
                            onChange={(e) => {
                              if (locked) return;
                              if (key === "tglMulai") {
                                const v = e.target.value;
                                setForm((prev) => ({ ...prev, tglMulai: v, tglSelesai: prev.tglSelesai < v ? v : prev.tglSelesai }));
                              } else {
                                setForm({ ...form, [key]: e.target.value });
                              }
                              setFormErrors((p) => ({ ...p, [key]: null }));
                            }}
                          />
                          {formErrors[key] && <span className="text-xs text-red-500">{formErrors[key]}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Geocode search */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Cari Lokasi</label>
                      <div className="relative" ref={geoWrapRef}>
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input className="w-full h-10 pl-9 pr-9 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                          placeholder="Ketik nama tempat, jalan, gedung..."
                          value={geoQuery} onChange={handleGeoQueryChange} autoComplete="off" />
                        {geoLoading && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                        )}
                        {geoResults.length > 0 && (
                          <div className="kg-geocode-dropdown">
                            {geoResults.map((item, i) => (
                              <div key={i} onMouseDown={() => handleGeoSelect(item)}
                                className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition">
                                <MapPin size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                                <div>
                                  <div className="text-xs font-semibold text-gray-700">{item.name || item.display_name.split(",")[0]}</div>
                                  <div className="text-[11px] text-gray-400 mt-0.5 leading-snug">{item.display_name}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nama lokasi */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">
                        Nama Lokasi *
                        {reverseLoading && <span className="ml-2 text-xs text-emerald-600 font-normal normal-case">Mendeteksi...</span>}
                      </label>
                      <input className={inputCls(formErrors.lokasi)} placeholder="Terisi otomatis atau ketik manual..."
                        value={form.lokasi}
                        onChange={(e) => { setForm({ ...form, lokasi: e.target.value }); setFormErrors((p) => ({ ...p, lokasi: null })); }} />
                      {formErrors.lokasi && <span className="text-xs text-red-500 mt-1 block">{formErrors.lokasi}</span>}
                    </div>

                    {/* Koordinat manual */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Koordinat Manual</label>
                      <div className="flex gap-2">
                        {[{ label: "Latitude", key: "lat", ph: "-0.947100" }, { label: "Longitude", key: "lng", ph: "100.417200" }].map(({ label, key, ph }) => (
                          <div key={key} className="flex-1">
                            <div className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{label}</div>
                            <input className={`w-full h-9 px-3 text-sm font-mono border rounded-lg outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 transition ${coordError ? "border-red-400" : "border-gray-200"}`}
                              placeholder={ph} value={coordInput[key]}
                              onChange={(e) => { setCoordInput((p) => ({ ...p, [key]: e.target.value })); setCoordError(""); }}
                              onKeyDown={(e) => e.key === "Enter" && handleApplyCoord()} />
                          </div>
                        ))}
                        <button onClick={handleApplyCoord}
                          className="h-9 mt-5 px-3 text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-200 flex items-center gap-1.5 transition whitespace-nowrap">
                          <Navigation size={12} /> Terapkan
                        </button>
                      </div>
                      {coordError && <p className="text-xs text-red-500 mt-1">{coordError}</p>}
                    </div>

                    {/* Map */}
                    <div className="relative">
                      <div id="kg-map" ref={mapRef} />
                      {reverseToast && (
                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-emerald-600/90 text-white text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap animate-bounce pointer-events-none">
                          📍 Nama lokasi diperbarui
                        </div>
                      )}
                    </div>

                    {/* Coords + radius */}
                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5">
                      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-mono">
                        <MapPin size={11} />
                        {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>Radius</span>
                        <input type="number" className="w-16 h-7 px-2 text-center text-sm font-medium border border-gray-200 rounded-md outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                          value={form.radius} onChange={(e) => setForm({ ...form, radius: e.target.value })} />
                        <span>m</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-between px-6 py-4 border-t border-gray-100">
                <button onClick={() => currentStep === 2 ? setCurrentStep(1) : setShowModal(false)}
                  className="h-9 px-4 text-sm text-gray-600 border border-gray-200 rounded-lg hover:border-gray-300 transition">
                  Kembali
                </button>
               <button
                  disabled={currentStep === 1 ? !isStep1Valid : !isStep2Valid}
                  onClick={handleSave}
                  className="h-9 px-5 text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition"
                  style={{ backgroundColor: "#00923D" }}
                >
                  {currentStep === 1 ? "Lanjut →" : "Simpan Kegiatan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ DETAIL DRAWER ════════════════════════════════════════════════ */}
        {detailId && (
          <div className="fixed inset-0 bg-black/40 z-40 flex justify-end" onClick={(e) => e.target === e.currentTarget && setDetailId(null)}>
            <div className="w-[700px] max-w-full bg-white h-full flex flex-col shadow-2xl animate-[slideIn_0.3s_ease-out]"
              style={{ animation: "slideInRight 0.25s ease-out" }}>

              {/* Drawer header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-400 mb-0.5">Riwayat kehadiran anggota</div>
                    <div className="text-lg font-semibold text-gray-800 truncate">{activeKegiatan?.title}</div>
                    {activeKegiatan && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5"><MapPin size={11} className="text-gray-400" />{activeKegiatan.location_name}</span>
                        <span className="flex items-center gap-1.5"><Calendar size={11} className="text-gray-400" />
                          {new Date(activeKegiatan.start_datetime).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          {" "}{new Date(activeKegiatan.start_datetime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                        <span className="flex items-center gap-1.5"><Clock size={11} className="text-gray-400" />
                          {new Date(activeKegiatan.end_datetime).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          {" "}{new Date(activeKegiatan.end_datetime).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })}
                        </span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => setDetailId(null)} className="text-gray-400 hover:text-gray-600 transition"><X size={18} /></button>
                </div>
              </div>

              {/* Stats row */}
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Hadir", val: absensiDetail.filter((a) => a.status === "hadir").length, filter: "hadir", cls: "bg-emerald-50 border-emerald-200", valCls: "text-emerald-700", active: drawerAbsenFilter === "hadir" },
                    { label: "Alfa",  val: absensiDetail.filter((a) => a.status !== "hadir").length, filter: "alfa",  cls: "bg-red-50 border-red-200",     valCls: "text-red-600",     active: drawerAbsenFilter === "alfa"  },
                  ].map((item) => (
                    <button key={item.label}
                      onClick={() => { setDrawerAbsenFilter((prev) => prev === item.filter ? null : item.filter); setDrawerTab("daftar"); }}
                      className={`border rounded-xl p-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm ${item.cls} ${item.active ? "ring-2 ring-offset-1 ring-emerald-300" : ""}`}>
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{item.label}</div>
                      <div className={`text-2xl font-semibold tabular-nums ${item.valCls}`}>{item.val}</div>
                      <div className="text-xs text-gray-400 mt-0.5">dari {absensiDetail.length} staf</div>
                    </button>
                  ))}
                </div>
                {drawerAbsenFilter && (
                  <div className="mt-3 flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs">
                    <span className="text-gray-500">
                      {filteredAbsensiDrawer.length} anggota ·{" "}
                      <span className={drawerAbsenFilter === "hadir" ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                        {drawerAbsenFilter === "hadir" ? "Hadir" : "Alfa"}
                      </span>
                    </span>
                    <button onClick={() => setDrawerAbsenFilter(null)} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 transition">
                      <X size={11} /> Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Tabs + actions */}
              <div className="flex items-center justify-between px-6 border-b border-gray-100">
                <div className="flex">
                  {[{ key: "daftar", label: "Daftar Kehadiran" }, { key: "rekap", label: "Rekap Kementerian" }].map((t) => (
                    <button key={t.key} onClick={() => setDrawerTab(t.key)}
                      className={`py-3 px-4 text-xs font-semibold border-b-2 transition ${drawerTab === t.key ? "border-emerald-600 text-emerald-700" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleRefreshAbsensi} disabled={refreshingAbsensi}
                    className="flex items-center gap-1.5 h-7 px-3 text-xs text-gray-500 border border-gray-200 rounded-lg hover:border-gray-300 transition disabled:opacity-50">
                    <RefreshCw size={12} className={refreshingAbsensi ? "animate-spin" : ""} />
                    {refreshingAbsensi ? "Memuat..." : "Refresh"}
                  </button>
                  <button
                    onClick={() => exportAbsensiExcel(activeKegiatan, absensiDetail)}
                    className="flex items-center gap-1.5 h-7 px-3 text-xs text-white rounded-lg transition"
                    style={{ backgroundColor: "#00923D" }}
                  >
                    <FileSpreadsheet size={12} /> Export
                  </button>
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto">
                {drawerTab === "daftar" && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Nama", "Kementerian", "Status", "Foto", "Waktu"].map((h) => (
                          <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredAbsensiDrawer.length === 0 ? (
                        <tr><td colSpan={5} className="text-center py-14 text-sm text-gray-400 italic">
                          {drawerAbsenFilter ? `Tidak ada anggota dengan status ${drawerAbsenFilter}` : "Belum ada data absensi"}
                        </td></tr>
                      ) : filteredAbsensiDrawer.map((a, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3 font-medium text-gray-700 text-xs">{a.name}</td>
                          <td className="px-5 py-3 text-xs text-gray-400">{a.kementerian || "–"}</td>
                          <td className="px-5 py-3"><StatusBadge status={a.status === "hadir" ? "hadir" : "alfa"} /></td>
                          <td className="px-5 py-3">{renderFotoSelfie(a.selfie_photo)}</td>
                          <td className="px-5 py-3 text-xs font-mono text-gray-500">
                            {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : <span className="italic text-gray-300">–</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {drawerTab === "rekap" && (
                  <div className="p-6">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Ringkasan per Kementerian</div>
                    {rekapKementerian.length === 0 ? (
                      <div className="text-center py-14 text-sm text-gray-400 italic">Belum ada data</div>
                    ) : (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                              {["Kementerian", "Total", "Hadir", "Alfa", "Kehadiran"].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left font-semibold uppercase tracking-wide text-[10px] text-gray-400">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {rekapKementerian.map((r, i) => {
                              const pct = r.total > 0 ? Math.round((r.hadir / r.total) * 100) : 0;
                              return (
                                <tr key={i} className="hover:bg-gray-50 transition">
                                  <td className="px-4 py-3 font-medium text-gray-700">{r.nama}</td>
                                  <td className="px-4 py-3 text-gray-500 tabular-nums">{r.total}</td>
                                  <td className="px-4 py-3"><span className="text-emerald-600 font-semibold tabular-nums">{r.hadir}</span></td>
                                  <td className="px-4 py-3"><span className="text-red-500 font-semibold tabular-nums">{r.alfa}</span></td>
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-gray-500 font-mono w-8 text-right">{pct}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══ PREVIEW FOTO ════════════════════════════════════════════════ */}
        {previewPhoto && (
          <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-5" onClick={() => setPreviewPhoto(null)}>
           <div className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <img src={previewPhoto} alt="Selfie absensi" className="w-full block" />
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="flex items-center gap-2 text-xs text-gray-500"><Camera size={13} /> Bukti foto selfie absensi</span>
                <button onClick={() => setPreviewPhoto(null)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 h-7 transition">
                  <X size={12} /> Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ MINI MODAL ANGGOTA ══════════════════════════════════════════ */}
        {memberModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-5" onClick={() => setMemberModal(null)}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">
                    {memberModal.filter === "semua" ? "" : memberModal.filter === "hadir" ? "" : ""}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{memberModal.title}</div>
                </div>
                <button onClick={() => setMemberModal(null)} className="text-gray-400 hover:text-gray-600 transition"><X size={16} /></button>
              </div>
              <div className="overflow-y-auto flex-1">
                {memberModalLoading ? (
                  <div className="text-center py-14">
                    <div className="w-6 h-6 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-gray-400">Memuat data...</p>
                  </div>
                ) : filteredMemberModalData.length === 0 ? (
                  <div className="text-center py-14 text-sm text-gray-400 italic">Tidak ada anggota</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        {["Nama", "Kementerian", "Status",
                          ...(memberModal.filter !== "alfa" ? ["Foto", "Waktu"] : [])
                        ].map((h) => <th key={h} className="px-5 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-400">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredMemberModalData.map((a, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-5 py-3 font-medium text-gray-700">{a.name}</td>
                          <td className="px-5 py-3 text-gray-400">{a.kementerian || "–"}</td>
                          <td className="px-5 py-3"><StatusBadge status={a.status === "hadir" ? "hadir" : "alfa"} /></td>
                          {memberModal.filter !== "alfa" && <td className="px-5 py-3">{renderFotoSelfie(a.selfie_photo)}</td>}
                          {memberModal.filter !== "alfa" && (
                            <td className="px-5 py-3 font-mono text-gray-500">
                              {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : <span className="italic text-gray-300">–</span>}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{filteredMemberModalData.length} anggota</span>
                
              </div>
            </div>
          </div>
        )}

        {/* ══ KONFIRMASI HAPUS ════════════════════════════════════════════ */}
        {confirmDelete && (
          <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-5 animate-[fadeIn_0.15s_ease]" onClick={() => setConfirmDelete(null)}>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-7 pt-8 pb-6 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={22} className="text-red-500" />
                </div>
                <div className="text-base font-semibold text-gray-800 mb-2">Hapus Kegiatan?</div>
                <div className="text-sm text-gray-500 leading-relaxed">
                  Kegiatan <span className="font-semibold text-gray-700">"{confirmDelete.title}"</span> akan dihapus secara permanen.
                </div>
              </div>
              <div className="flex gap-3 px-7 pb-7">
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 h-9 text-sm border border-gray-200 rounded-lg text-gray-600 hover:border-gray-300 transition">
                  Batal
                </button>
                <button onClick={handleDeleteConfirm}
                  className="flex-1 h-9 text-sm bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition">
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}