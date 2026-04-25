import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";
import API from "../../config/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as XLSX from "xlsx";

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

:root {
  --g900:#14532d;--g800:#166534;--g700:#15803d;--g600:#16a34a;
  --g500:#22c55e;--g400:#4ade80;--g200:#bbf7d0;--g100:#dcfce7;--g50:#f0fdf4;
  --font:'Plus Jakarta Sans',sans-serif;--mono:'DM Mono',monospace;
  --bg:#f4f4ef;--white:#ffffff;--border:#e5e7eb;--text:#111827;--muted:#6b7280;
  --radius:12px;--shadow:0 1px 3px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);
}

.kg-page { font-family:var(--font); background:var(--bg); color:var(--text); font-size:14px; min-height:100vh; display: flex; }
.kg-main-content { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }

.kg-topbar { background:var(--white); border-bottom:1px solid var(--border); padding:16px 28px; display:flex; align-items:center; justify-content:space-between; }
.kg-topbar-title { font-size:20px; font-weight:700; color:var(--g800); }
.kg-topbar-sub { font-size:12px; color:var(--muted); font-style:italic; }

.kg-btn-primary { height:36px; padding:0 16px; background:var(--g600); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; transition:background .15s; }
.kg-btn-primary:hover { background:var(--g700); }
.kg-btn-primary:disabled { background:#9ca3af; cursor:not-allowed; opacity: 0.7; }
.kg-btn-outline { height:34px; padding:0 14px; background:transparent; color:var(--text); border:1px solid var(--border); border-radius:8px; font-size:13px; font-weight:500; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
.kg-btn-danger { height:34px; padding:0 14px; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:8px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
.kg-btn-edit { height:34px; padding:0 10px; background:#f0fdf4; color:var(--g700); border:1px solid var(--g200); border-radius:8px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }

.kg-content { padding:24px 28px; display:flex; flex-direction:column; gap:24px; overflow-y: auto; }

.kg-stats-row { display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; }
.kg-stat-card { background:var(--white); border-radius:var(--radius); border:1px solid var(--border); box-shadow:var(--shadow); padding:18px; position:relative; overflow:hidden; cursor:pointer; transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s; }
.kg-stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
.kg-stat-card.active-filter { border-color: var(--g400); box-shadow: 0 0 0 3px rgba(34,197,94,0.15); }
.kg-stat-card.blue.active-filter { border-color: #93c5fd; box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
.kg-stat-card.amber.active-filter { border-color: #fcd34d; box-shadow: 0 0 0 3px rgba(245,158,11,0.15); }
.kg-stat-card.rose.active-filter { border-color: #fca5a5; box-shadow: 0 0 0 3px rgba(244,63,94,0.15); }
.kg-stat-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--g500); }
.kg-stat-card.blue::before { background:#3b82f6; }
.kg-stat-card.amber::before { background:#f59e0b; }
.kg-stat-card.rose::before { background:#f43f5e; }
.kg-stat-label { font-size:11px; font-weight:600; text-transform:uppercase; color:var(--muted); margin-bottom:4px; }
.kg-stat-value { font-size:28px; font-weight:700; font-family:var(--mono); color:var(--text); }
.kg-stat-sub { font-size:11px; color:var(--muted); margin-top:4px; }

.kg-card { background:var(--white); border-radius:var(--radius); border:1px solid var(--border); box-shadow:var(--shadow); }
.kg-card-header { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; }
.kg-card-title { font-size:14px; font-weight:600; display:flex; align-items:center; gap:8px; color: var(--text); }

.kg-kegiatan-grid { display:grid; grid-template-columns:repeat(3, 1fr); gap:16px; }
.kg-k-card { background:var(--white); border-radius:var(--radius); border:1px solid var(--border); box-shadow:var(--shadow); display:flex; flex-direction:column; height: 100%; transition: transform 0.2s; }
.kg-k-card:hover { transform: translateY(-3px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.kg-k-card-top { padding:20px; flex-grow: 1; }
.kg-k-name { font-size:15px; font-weight:700; color:var(--text); margin-bottom:12px; }
.kg-k-meta { display:flex; flex-direction:column; gap:8px; }
.kg-k-meta-row { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--muted); font-weight:500; }

.kg-k-quick-stats { display:flex; gap:8px; padding:12px 20px; border-top:1px solid #f3f4f6; background:#fafafa; }
.kg-k-qs-item { flex:1; display:flex; align-items:center; gap:6px; padding:8px 10px; border-radius:8px; cursor:pointer; border:1px solid transparent; transition: all 0.15s; font-size:12px; font-weight:600; }
.kg-k-qs-item:hover { transform: translateY(-1px); }
.kg-k-qs-item.total { background:#f1f5f9; color:#475569; border-color:#e2e8f0; }
.kg-k-qs-item.total:hover { background:#e2e8f0; border-color:#cbd5e1; }
.kg-k-qs-item.hadir { background:var(--g50); color:var(--g700); border-color:var(--g200); }
.kg-k-qs-item.hadir:hover { background:var(--g100); border-color:var(--g400); }
.kg-k-qs-item.alfa { background:#fef2f2; color:#ef4444; border-color:#fecaca; }
.kg-k-qs-item.alfa:hover { background:#fee2e2; border-color:#fca5a5; }
.kg-k-qs-num { font-size:16px; font-weight:800; font-family:var(--mono); }

.kg-k-card-footer { padding:14px 20px; border-top:1px solid #f3f4f6; background:#fff; display:flex; gap:8px; }

.kg-detail-overlay { position:fixed; inset:0; background:rgba(0,0,0,.4); z-index:4000; display:flex; justify-content:flex-end; }
.kg-detail-panel { width:740px; max-width:100vw; background:var(--white); height: 100%; display:flex; flex-direction:column; box-shadow: -10px 0 30px rgba(0,0,0,0.1); animation: slideIn 0.3s ease-out; }

@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }

.kg-abs-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.kg-abs-stat-box { padding: 16px; border-radius: 16px; text-align: center; border: 1px solid var(--border); cursor: pointer; transition: all 0.15s; }
.kg-abs-stat-box:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.kg-abs-stat-box.active-filter { box-shadow: 0 0 0 3px rgba(34,197,94,0.2); border-color: var(--g400); }
.kg-abs-stat-box.alfa-box.active-filter { box-shadow: 0 0 0 3px rgba(239,68,68,0.2); border-color: #fca5a5; }

.kg-abs-table { width: 100%; border-collapse: collapse; }
.kg-abs-table th { padding: 10px 14px; background: #f9fafb; font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; border-bottom: 1px solid var(--border); text-align: left; white-space: nowrap; }
.kg-abs-table td { padding: 12px 14px; border-bottom: 1px solid #f3f4f6; font-size: 13px; vertical-align: middle; }
.kg-abs-table tr:last-child td { border-bottom: none; }

.kg-selfie-thumb { width: 40px; height: 40px; border-radius: 8px; object-fit: cover; border: 1px solid var(--border); cursor: pointer; transition: transform .15s, box-shadow .15s; }
.kg-selfie-thumb:hover { transform: scale(1.08); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }

.kg-kem-table { width: 100%; border-collapse: collapse; }
.kg-kem-table th { padding: 10px 14px; background: #f9fafb; font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; border-bottom: 1px solid var(--border); text-align: left; }
.kg-kem-table td { padding: 11px 14px; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
.kg-kem-table tr:last-child td { border-bottom: none; }

.kg-progress-wrap { display: flex; align-items: center; gap: 8px; }
.kg-progress-bar { flex: 1; height: 6px; background: #e5e7eb; border-radius: 99px; overflow: hidden; }
.kg-progress-fill { height: 100%; background: var(--g500); border-radius: 99px; transition: width .4s; }

.kg-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:3000; display:flex; align-items:center; justify-content:center; padding:20px; }
.kg-modal { background:var(--white); border-radius:20px; width:100%; max-width:620px; box-shadow:0 20px 60px rgba(0,0,0,.2); overflow:hidden; }
.kg-modal-header { padding:18px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; }
.kg-form-grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; }
.kg-form-group { display:flex; flex-direction:column; gap:6px; margin-bottom: 14px; }
.kg-form-group.full { grid-column: 1 / -1; }
.kg-form-label { font-size:12px; font-weight:700; color:var(--text); text-transform: uppercase; letter-spacing: 0.02em; }
.kg-form-input { height:40px; padding:0 12px; border:1px solid var(--border); border-radius:8px; font-family:var(--font); font-size:14px; transition: border-color .15s, box-shadow .15s; }
.kg-form-input:focus { outline: none; border-color: var(--g400); box-shadow: 0 0 0 3px rgba(34,197,94,0.1); }
.kg-form-input.error { border-color: #ef4444; }
.kg-form-input.error:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.1); }
.kg-form-input:disabled { background: #f3f4f6; color: var(--muted); cursor: not-allowed; }

.kg-char-counter { font-size: 11px; color: var(--muted); text-align: right; }
.kg-char-counter.warn { color: #f59e0b; font-weight: 600; }
.kg-char-counter.over { color: #ef4444; font-weight: 700; }
.kg-field-error { font-size: 11px; color: #ef4444; font-weight: 600; }

.kg-stepper { display: flex; align-items: center; padding: 16px 24px; background: #fafafa; border-bottom: 1px solid var(--border); gap: 0; }
.kg-step-item { display: flex; align-items: center; gap: 10px; flex: 1; }
.kg-step-circle { width: 28px; height: 28px; border-radius: 50%; background: #e5e7eb; color: var(--muted); font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
.kg-step-item.active .kg-step-circle { background: var(--g600); color: white; }
.kg-step-item span { font-size: 13px; font-weight: 600; color: var(--muted); transition: color 0.2s; }
.kg-step-item.active span { color: var(--g700); }
.kg-step-line { flex: 1; height: 2px; background: #e5e7eb; margin: 0 12px; border-radius: 2px; flex-shrink: 0; width: 60px; }

#kg-leaflet-map { width:100%; height:220px; border-radius:12px; border:1px solid var(--border); margin-top: 10px; }
.kg-map-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 10px 14px; background: #f9fafb; border: 1px solid var(--border); border-radius: 8px; flex-wrap: wrap; gap: 8px; }
.kg-map-coords { font-size: 12px; color: var(--muted); font-family: var(--mono); display: flex; align-items: center; gap: 6px; }
.kg-radius-wrap { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 500; color: var(--text); }
.kg-radius-input { width: 72px; height: 32px; padding: 0 10px; border: 1px solid var(--border); border-radius: 6px; font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--g700); text-align: center; background: white; }
.kg-radius-input:focus { outline: none; border-color: var(--g400); box-shadow: 0 0 0 3px rgba(34,197,94,0.1); }
.kg-radius-input:disabled { background: #f3f4f6; color: var(--muted); cursor: not-allowed; }

/* ── Manual coord inputs ── */
.kg-coord-row { display: flex; gap: 8px; align-items: flex-end; }
.kg-coord-group { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.kg-coord-label { font-size: 10px; font-weight: 700; color: var(--muted); text-transform: uppercase; }
.kg-coord-input { height: 34px; padding: 0 10px; border: 1px solid var(--border); border-radius: 8px; font-family: var(--mono); font-size: 13px; font-weight: 600; color: var(--text); background: white; width: 100%; box-sizing: border-box; transition: border-color .15s, box-shadow .15s; }
.kg-coord-input:focus { outline: none; border-color: var(--g400); box-shadow: 0 0 0 3px rgba(34,197,94,0.1); }
.kg-coord-input.error { border-color: #ef4444; }
.kg-coord-apply-btn { height: 34px; padding: 0 14px; background: var(--g50); color: var(--g700); border: 1px solid var(--g200); border-radius: 8px; font-size: 12px; font-weight: 700; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; transition: background .15s; flex-shrink: 0; }
.kg-coord-apply-btn:hover { background: var(--g100); border-color: var(--g400); }

.kg-geocode-wrap { position: relative; margin-bottom: 10px; }
.kg-geocode-input-wrap { position: relative; display: flex; align-items: center; }
.kg-geocode-input { width: 100%; height: 40px; padding: 0 40px 0 40px; border: 1px solid var(--border); border-radius: 8px; font-family: var(--font); font-size: 14px; transition: border-color .15s, box-shadow .15s; background: white; box-sizing: border-box; }
.kg-geocode-input:focus { outline: none; border-color: var(--g400); box-shadow: 0 0 0 3px rgba(34,197,94,0.1); }
.kg-geocode-input:disabled { background: #f3f4f6; color: var(--muted); cursor: not-allowed; }
.kg-geocode-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--muted); pointer-events: none; }
.kg-geocode-spinner { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; border: 2px solid var(--g200); border-top-color: var(--g600); border-radius: 50%; animation: kg-spin 0.7s linear infinite; }
@keyframes kg-spin { to { transform: translateY(-50%) rotate(360deg); } }
.kg-geocode-results { position: absolute; top: calc(100% + 4px); left: 0; right: 0; background: white; border: 1px solid var(--border); border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 9999; overflow: hidden; max-height: 220px; overflow-y: auto; }
.kg-geocode-item { padding: 11px 14px; font-size: 13px; cursor: pointer; display: flex; align-items: flex-start; gap: 10px; border-bottom: 1px solid #f3f4f6; transition: background 0.1s; }
.kg-geocode-item:last-child { border-bottom: none; }
.kg-geocode-item:hover { background: var(--g50); }
.kg-geocode-item-name { font-weight: 600; color: var(--text); line-height: 1.3; }
.kg-geocode-item-addr { font-size: 11px; color: var(--muted); margin-top: 2px; line-height: 1.3; }
.kg-reverse-toast { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); background: rgba(22,163,74,0.92); color: white; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 20px; white-space: nowrap; z-index: 999; pointer-events: none; animation: kg-fadeup 0.3s ease; }
@keyframes kg-fadeup { from { opacity:0; transform: translate(-50%, 8px); } to { opacity:1; transform: translate(-50%, 0); } }

.kg-photo-overlay { position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:6000; display:flex; align-items:center; justify-content:center; padding:20px; }
.kg-photo-modal { position:relative; max-width:420px; width:100%; background:var(--white); border-radius:20px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,.4); animation: kg-qr-pop .25s cubic-bezier(.34,1.56,.64,1); }
.kg-photo-modal img { width:100%; display:block; }
.kg-photo-modal-footer { padding:14px 20px; display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); }
@keyframes kg-qr-pop { from { opacity:0; transform: scale(0.88); } to { opacity:1; transform: scale(1); } }

.kg-member-overlay { position:fixed; inset:0; background:rgba(0,0,0,.45); z-index:5000; display:flex; align-items:center; justify-content:center; padding:20px; }
.kg-member-modal { background:var(--white); border-radius:20px; width:100%; max-width:560px; max-height:80vh; display:flex; flex-direction:column; box-shadow:0 20px 60px rgba(0,0,0,.2); overflow:hidden; animation: kg-qr-pop .25s cubic-bezier(.34,1.56,.64,1); }
.kg-member-modal-header { padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; flex-shrink:0; }
.kg-member-modal-body { overflow-y:auto; flex:1; }
.kg-member-table { width:100%; border-collapse:collapse; }
.kg-member-table th { padding:10px 14px; background:#f9fafb; font-size:10px; font-weight:700; color:var(--muted); text-transform:uppercase; border-bottom:1px solid var(--border); text-align:left; white-space:nowrap; }
.kg-member-table td { padding:11px 14px; border-bottom:1px solid #f3f4f6; font-size:13px; vertical-align:middle; }
.kg-member-table tr:last-child td { border-bottom:none; }

.kg-drawer-dt-row { display: flex; gap: 16px; flex-wrap: wrap; }
.kg-drawer-dt-chip { display: inline-flex; align-items: center; gap: 6px; background: #f9fafb; border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; font-size: 12px; color: var(--text); }
.kg-drawer-dt-chip .label { font-weight: 700; color: var(--muted); font-size: 10px; text-transform: uppercase; margin-right: 2px; }
.kg-drawer-dt-chip .time-badge { font-family: var(--mono); font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 4px; }
.kg-drawer-dt-chip.start .time-badge { background: var(--g50); color: var(--g700); }
.kg-drawer-dt-chip.end .time-badge { background: #fffbeb; color: #92400e; }
`;

import {
  Plus, Search, X, Calendar, MapPin, Users, LayoutGrid, Clock,
  CheckCircle, Trash2, Download, FileSpreadsheet, Edit3, RefreshCw, Camera,
  UserCheck, UserX, Navigation
} from "lucide-react";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const toLocalDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isValidCoord = (lat, lng) => {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return !isNaN(la) && !isNaN(ln) && la >= -90 && la <= 90 && ln >= -180 && ln <= 180;
};

const geocodeSearch = async (query) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=id`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'id' } });
  return res.json();
};

const reverseGeocode = async (lat, lng) => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
  const res = await fetch(url, { headers: { 'Accept-Language': 'id' } });
  return res.json();
};

const formatReverseResult = (data) => {
  if (!data || !data.address) return data?.display_name || '';
  const a = data.address;
  return (
    data.name ||
    a.amenity || a.building || a.shop || a.tourism || a.leisure ||
    [a.road, a.suburb || a.neighbourhood || a.village, a.city || a.town || a.county]
      .filter(Boolean).join(', ')
  );
};

const buildRekapKementerian = (absensiDetail) => {
  const map = {};
  absensiDetail.forEach(a => {
    const kem = a.kementerian || 'Tidak Diketahui';
    if (!map[kem]) map[kem] = { hadir: 0, alfa: 0, total: 0 };
    map[kem].total += 1;
    if (a.status === 'hadir') map[kem].hadir += 1;
    else map[kem].alfa += 1;
  });
  return Object.entries(map)
    .map(([nama, val]) => ({ nama, ...val }))
    .sort((a, b) => a.nama.localeCompare(b.nama));
};

const formatDateTime = (dtStr) => {
  const d = new Date(dtStr);
  const tgl = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  return { tgl, jam };
};

export default function ManajemenKegiatan() {
  const [kegiatanList, setKegiatanList] = useState([]);
  const [memberList, setMemberList] = useState([]);
  const [activeFilter, setActiveFilter] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isEditing, setIsEditing] = useState(null);
  const [editingStatus, setEditingStatus] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const todayStr = toLocalDateString(new Date());

  const [form, setForm] = useState({
    nama: "", desc: "",
    tglMulai: todayStr, tglSelesai: todayStr,
    jamMulai: "09:00", jamSelesai: "17:00",
    lokasi: "", radius: 100, lat: -0.9471, lng: 100.4172
  });

  // ── State untuk input koordinat manual (string sementara) ────────────────
  const [coordInput, setCoordInput] = useState({ lat: '-0.9471', lng: '100.4172' });
  const [coordError, setCoordError] = useState('');

  const [geoQuery, setGeoQuery] = useState('');
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
  const [drawerTab, setDrawerTab] = useState('daftar');
  const [memberModal, setMemberModal] = useState(null);
  const [memberModalData, setMemberModalData] = useState([]);
  const [memberModalLoading, setMemberModalLoading] = useState(false);

  const mapRef = useRef(null);
  const leafletInstance = useRef(null);
  const markerRef = useRef(null);
  const circleRef = useRef(null);

  useEffect(() => {
    const style = document.createElement("style");
    style.id = "kg-custom-style";
    style.textContent = GLOBAL_CSS;
    document.head.appendChild(style);
    fetchKegiatan();
    fetchMembers();
    return () => document.getElementById("kg-custom-style")?.remove();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (geoWrapRef.current && !geoWrapRef.current.contains(e.target)) setGeoResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!detailId) return;
    const interval = setInterval(() => fetchAttendance(detailId), 15000);
    return () => clearInterval(interval);
  }, [detailId]);

  // ── Sync coordInput saat form.lat/lng berubah dari luar (geocode / map click)
  useEffect(() => {
    setCoordInput({
      lat: form.lat.toFixed(6),
      lng: form.lng.toFixed(6),
    });
  }, [form.lat, form.lng]);

  const fetchKegiatan = async () => {
    try {
      const res = await fetch(`${API}/activities`);
      const data = await res.json();
      setKegiatanList(data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${API}/users`);
      const data = await res.json();
      setMemberList(data.filter(u => u.role === 'user'));
    } catch (err) { console.error(err); }
  };

  const fetchAttendance = async (id) => {
    try {
      const res = await fetch(`${API}/activities/${id}/attendance`);
      const data = await res.json();
      setAbsensiDetail(data);
    } catch (err) { console.error(err); }
  };

  const handleRefreshAbsensi = async () => {
    if (!detailId || refreshingAbsensi) return;
    setRefreshingAbsensi(true);
    try {
      const res = await fetch(`${API}/activities/${detailId}/attendance`);
      const data = await res.json();
      setAbsensiDetail(data);
    } catch (err) { console.error(err); }
    finally { setRefreshingAbsensi(false); }
  };

  const handleOpenMemberModal = async (kegiatanId, filter, titleLabel) => {
    setMemberModal({ kegiatanId, filter, title: titleLabel });
    setMemberModalLoading(true);
    setMemberModalData([]);
    try {
      const res = await fetch(`${API}/activities/${kegiatanId}/attendance`);
      const data = await res.json();
      setMemberModalData(data);
    } catch (err) { console.error(err); }
    finally { setMemberModalLoading(false); }
  };

  const handleExportExcel = () => {
    if (!activeKegiatan || absensiDetail.length === 0) {
      alert("Belum ada data absensi untuk diekspor.");
      return;
    }
    const dataIndividu = absensiDetail.map((a, idx) => ({
      "No": idx + 1,
      "Nama": a.name,
      "Kementerian": a.kementerian || '-',
      "Status": a.status === 'hadir' ? 'Hadir' : 'Alfa',
      "Waktu Absen": a.check_in_time ? new Date(a.check_in_time).toLocaleString('id-ID') : '-',
    }));
    const totalHadir = absensiDetail.filter(a => a.status === 'hadir').length;
    const totalAlfa  = absensiDetail.filter(a => a.status !== 'hadir').length;
    dataIndividu.push({});
    dataIndividu.push({ "No": "", "Nama": "TOTAL", "Kementerian": "", "Status": `Hadir: ${totalHadir} | Alfa: ${totalAlfa}`, "Waktu Absen": "" });
    const rekapKem = buildRekapKementerian(absensiDetail);
    const dataRekap = rekapKem.map(r => ({
      "Kementerian": r.nama,
      "Total Staf": r.total,
      "Hadir": r.hadir,
      "Alfa": r.alfa,
      "% Kehadiran": r.total > 0 ? `${Math.round((r.hadir / r.total) * 100)}%` : '0%',
    }));
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(dataIndividu);
    ws1['!cols'] = [{ wch: 4 }, { wch: 28 }, { wch: 30 }, { wch: 10 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Daftar Absensi");
    const ws2 = XLSX.utils.json_to_sheet(dataRekap);
    ws2['!cols'] = [{ wch: 32 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Rekap Kementerian");
    const filename = `Absensi_${activeKegiatan.title}_${toLocalDateString(new Date())}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const getStatus = (k) => {
    const now = new Date();
    const start = new Date(k.start_datetime);
    const end = new Date(k.end_datetime);
    if (now < start) return 'mendatang';
    if (now >= start && now <= end) return 'berlangsung';
    return 'selesai';
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus kegiatan ini?")) return;
    try {
      const res = await fetch(`${API}/activities/${id}`, { method: 'DELETE' });
      if (res.ok) setKegiatanList(prev => prev.filter(k => k.id !== id));
      else alert("Gagal menghapus kegiatan");
    } catch (err) { console.error(err); }
  };

  // ── Edit hanya untuk mendatang & berlangsung — selesai tidak bisa diedit ──
  const handleEditOpen = (k) => {
    const status = getStatus(k);
    if (status === 'selesai') return; // guard tambahan, tombol sudah disembunyikan
    const start = new Date(k.start_datetime);
    const end = new Date(k.end_datetime);
    const padTime = (d) =>
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const latVal = parseFloat(k.latitude);
    const lngVal = parseFloat(k.longitude);
    setForm({
      nama: k.title,
      desc: k.description,
      tglMulai: toLocalDateString(start),
      tglSelesai: toLocalDateString(end),
      jamMulai: padTime(start),
      jamSelesai: padTime(end),
      lokasi: k.location_name,
      radius: k.radius_meters,
      lat: latVal,
      lng: lngVal,
    });
    setCoordInput({ lat: latVal.toFixed(6), lng: lngVal.toFixed(6) });
    setCoordError('');
    setFormErrors({});
    setIsEditing(k.id);
    setEditingStatus(status);
    setCurrentStep(1);
    setShowModal(true);
  };

  const stats = useMemo(() => ({
    total: kegiatanList.length,
    mendatang: kegiatanList.filter(k => getStatus(k) === 'mendatang').length,
    berlangsung: kegiatanList.filter(k => getStatus(k) === 'berlangsung').length,
    selesai: kegiatanList.filter(k => getStatus(k) === 'selesai').length
  }), [kegiatanList]);

  const moveMarkerAndCircle = useCallback((lat, lng) => {
    if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
    if (circleRef.current) circleRef.current.setLatLng([lat, lng]);
    if (leafletInstance.current) leafletInstance.current.panTo([lat, lng]);
  }, []);

  const handleGeoQueryChange = (e) => {
    const val = e.target.value;
    setGeoQuery(val);
    setGeoResults([]);
    clearTimeout(geoDebounceRef.current);
    if (val.trim().length < 3) return;
    setGeoLoading(true);
    geoDebounceRef.current = setTimeout(async () => {
      try {
        const results = await geocodeSearch(val);
        setGeoResults(results);
      } catch (err) { console.error('Geocoding error:', err); }
      finally { setGeoLoading(false); }
    }, 600);
  };

  const handleGeoSelect = (item) => {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const namaLokasi = item.name || item.display_name.split(',')[0].trim();
    setForm(prev => ({ ...prev, lat, lng, lokasi: namaLokasi }));
    moveMarkerAndCircle(lat, lng);
    setGeoQuery('');
    setGeoResults([]);
    if (formErrors.lokasi) setFormErrors(p => ({ ...p, lokasi: null }));
  };

  const handleMapClick = useCallback(async (lat, lng) => {
    setForm(prev => ({ ...prev, lat, lng }));
    moveMarkerAndCircle(lat, lng);
    setReverseLoading(true);
    try {
      const data = await reverseGeocode(lat, lng);
      const nama = formatReverseResult(data);
      if (nama) {
        setForm(prev => ({ ...prev, lat, lng, lokasi: nama }));
        setReverseToast(true);
        setTimeout(() => setReverseToast(false), 2500);
        if (formErrors.lokasi) setFormErrors(p => ({ ...p, lokasi: null }));
      }
    } catch (err) { console.error('Reverse geocoding error:', err); }
    finally { setReverseLoading(false); }
  }, [moveMarkerAndCircle, formErrors.lokasi]);

  // ── Terapkan input koordinat manual ke peta ───────────────────────────────
  const handleApplyCoord = () => {
    const latStr = coordInput.lat.trim();
    const lngStr = coordInput.lng.trim();
    if (!isValidCoord(latStr, lngStr)) {
      setCoordError('Koordinat tidak valid. Lat: -90 s/d 90, Lng: -180 s/d 180');
      return;
    }
    setCoordError('');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    setForm(prev => ({ ...prev, lat, lng }));
    moveMarkerAndCircle(lat, lng);
    // Reverse geocode otomatis
    setReverseLoading(true);
    reverseGeocode(lat, lng).then(data => {
      const nama = formatReverseResult(data);
      if (nama) {
        setForm(prev => ({ ...prev, lokasi: nama }));
        setReverseToast(true);
        setTimeout(() => setReverseToast(false), 2500);
        if (formErrors.lokasi) setFormErrors(p => ({ ...p, lokasi: null }));
      }
    }).catch(console.error).finally(() => setReverseLoading(false));
  };

  // ── Tangani Enter pada input koordinat ───────────────────────────────────
  const handleCoordKeyDown = (e) => {
    if (e.key === 'Enter') handleApplyCoord();
  };

  useEffect(() => {
    if (currentStep === 2 && showModal && mapRef.current) {
      const timer = setTimeout(() => {
        if (!leafletInstance.current) {
          leafletInstance.current = L.map(mapRef.current).setView([form.lat, form.lng], 15);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(leafletInstance.current);
          markerRef.current = L.marker([form.lat, form.lng], {
            draggable: true,
            icon: DefaultIcon
          }).addTo(leafletInstance.current);
          circleRef.current = L.circle([form.lat, form.lng], {
            radius: form.radius,
            color: '#16a34a',
            fillOpacity: 0.1
          }).addTo(leafletInstance.current);

          markerRef.current.on('dragend', async (e) => {
            const { lat, lng } = e.target.getLatLng();
            await handleMapClick(lat, lng);
          });
          leafletInstance.current.on('click', async (e) => {
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
    if (circleRef.current) circleRef.current.setRadius(Number(form.radius) || 100);
  }, [form.radius]);

  const validateStep1 = () => {
    const errors = {};
    if (!form.nama.trim()) errors.nama = "Nama kegiatan wajib diisi.";
    else if (form.nama.trim().length > 50) errors.nama = "Nama kegiatan maksimal 50 karakter.";
    if (form.desc && form.desc.trim().length > 150) errors.desc = "Deskripsi maksimal 150 karakter.";
    if (!isEditing || editingStatus === 'mendatang') {
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

  const isStep1Valid = useMemo(() => {
    const namaOk = form.nama.trim().length > 0 && form.nama.trim().length <= 50;
    const descOk = form.desc.trim().length <= 150;
    const mulaiOk = (!isEditing || editingStatus === 'mendatang')
      ? (!!form.tglMulai && !!form.jamMulai)
      : true;
    return namaOk && descOk && mulaiOk && !!form.tglSelesai && !!form.jamSelesai;
  }, [form.nama, form.desc, form.tglMulai, form.tglSelesai, form.jamMulai, form.jamSelesai, isEditing, editingStatus]);

  const isStep2Valid = useMemo(() => form.lokasi.trim().length > 0, [form.lokasi]);

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
      metode: 'selfie',
      start_datetime: `${form.tglMulai} ${form.jamMulai}`,
      end_datetime: `${form.tglSelesai} ${form.jamSelesai}`,
      participant_ids: memberList.map(m => m.id)
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

  const minTglSelesai = form.tglMulai || todayStr;

  const filteredKegiatan = kegiatanList.filter(k => {
    const s = getStatus(k);
    const matchFilter = activeFilter === 'semua' || s === activeFilter;
    return matchFilter && k.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const charCounterClass = (len, max) => {
    if (len > max) return "kg-char-counter over";
    if (len >= max * 0.85) return "kg-char-counter warn";
    return "kg-char-counter";
  };

  const activeKegiatan = kegiatanList.find(k => k.id === detailId);

  const rekapKementerian = useMemo(
    () => buildRekapKementerian(absensiDetail),
    [absensiDetail]
  );

  const filteredAbsensiDrawer = useMemo(() => {
    if (!drawerAbsenFilter) return absensiDetail;
    if (drawerAbsenFilter === 'hadir') return absensiDetail.filter(a => a.status === 'hadir');
    if (drawerAbsenFilter === 'alfa') return absensiDetail.filter(a => a.status !== 'hadir');
    return absensiDetail;
  }, [absensiDetail, drawerAbsenFilter]);

  const filteredMemberModalData = useMemo(() => {
    if (!memberModal) return [];
    if (memberModal.filter === 'hadir') return memberModalData.filter(a => a.status === 'hadir');
    if (memberModal.filter === 'alfa') return memberModalData.filter(a => a.status !== 'hadir');
    return memberModalData;
  }, [memberModal, memberModalData]);

  const isStartLocked = isEditing && (editingStatus === 'berlangsung' || editingStatus === 'selesai');

  const renderFotoSelfie = (foto) => {
    if (!foto) return <span style={{fontSize:'11px', color:'var(--muted)', fontStyle:'italic'}}>Tanpa foto</span>;
    const src = foto.startsWith('data:') ? foto : `data:image/jpeg;base64,${foto}`;
    return (
      <img
        src={src}
        alt="selfie"
        className="kg-selfie-thumb"
        onClick={() => setPreviewPhoto(src)}
        title="Klik untuk perbesar"
      />
    );
  };

  return (
    <div className="kg-page">
      <Sidebar />
      <div className="kg-main-content">
        <Topbar title="Manajemen Kegiatan" />

        <div className="kg-topbar" style={{borderBottom:'none'}}>
          <div>
            <div className="kg-topbar-title">Daftar Kegiatan</div>
            <div className="kg-topbar-sub">Total {stats.total} kegiatan tercatat</div>
          </div>
          <button className="kg-btn-primary" onClick={() => {
            setIsEditing(null); setEditingStatus(null); setFormErrors({}); setGeoQuery(''); setGeoResults([]);
            setCoordError('');
            const defLat = -0.9471; const defLng = 100.4172;
            setForm({ nama: "", desc: "", tglMulai: todayStr, tglSelesai: todayStr, jamMulai: "09:00", jamSelesai: "17:00", lokasi: "", radius: 100, lat: defLat, lng: defLng });
            setCoordInput({ lat: defLat.toFixed(6), lng: defLng.toFixed(6) });
            setCurrentStep(1); setShowModal(true);
          }}>
            <Plus size={16} /> Buat Kegiatan
          </button>
        </div>

        <div className="kg-content">

          {/* ── STAT CARDS ── */}
          <div className="kg-stats-row">
            <StatBox label="Total Kegiatan" value={stats.total} sub="Semua kegiatan" icon={<LayoutGrid size={18}/>} color="" active={activeFilter === 'semua'} onClick={() => setActiveFilter('semua')} />
            <StatBox label="Mendatang" value={stats.mendatang} sub="Segera dilaksanakan" icon={<Calendar size={18}/>} color="blue" active={activeFilter === 'mendatang'} onClick={() => setActiveFilter('mendatang')} />
            <StatBox label="Berlangsung" value={stats.berlangsung} sub="Sedang berjalan" icon={<Clock size={18}/>} color="amber" active={activeFilter === 'berlangsung'} onClick={() => setActiveFilter('berlangsung')} />
            <StatBox label="Selesai" value={stats.selesai} sub="Kegiatan lampau" icon={<CheckCircle size={18}/>} color="rose" active={activeFilter === 'selesai'} onClick={() => setActiveFilter('selesai')} />
          </div>

          <div className="kg-card">
            <div className="kg-card-header">
              <div className="kg-card-title">
                <LayoutGrid size={16} color="var(--g600)"/>
                {activeFilter === 'semua' ? 'Semua Kegiatan' :
                 activeFilter === 'mendatang' ? 'Kegiatan Mendatang' :
                 activeFilter === 'berlangsung' ? 'Kegiatan Berlangsung' :
                 'Kegiatan Selesai'}
                <span style={{fontSize:'12px', fontWeight:500, color:'var(--muted)'}}>({filteredKegiatan.length} kegiatan)</span>
              </div>
              <div style={{maxWidth:'300px', position:'relative'}}>
                <span style={{position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'var(--muted)', zIndex:1, pointerEvents:'none'}}>
                  <Search size={14}/>
                </span>
                <input
                  className="kg-form-input"
                  style={{width:'100%', paddingLeft:'40px', height:'36px'}}
                  placeholder="Cari nama kegiatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div style={{padding:'20px'}}>
              <div className="kg-kegiatan-grid">
                {filteredKegiatan.length === 0 ? (
                  <div style={{gridColumn:'1/-1', textAlign:'center', padding:'40px', color:'var(--muted)', fontSize:'14px', fontWeight:'500'}}>
                    Belum ada kegiatan yang dibuat
                  </div>
                ) : (
                  filteredKegiatan.map(k => {
                    const s = getStatus(k);
                    const jmlHadir = Number(k.hadir) || 0;
                    const jmlPeserta = Number(k.peserta) || 0;
                    const jmlAlfa = jmlPeserta - jmlHadir;
                    const startDT = formatDateTime(k.start_datetime);
                    const endDT = formatDateTime(k.end_datetime);

                    return (
                      <div key={k.id} className="kg-k-card">
                        <div className="kg-k-card-top">
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px'}}>
                            <div className="kg-k-name" style={{marginBottom:0}}>{k.title}</div>
                            <StatusBadge status={s} />
                          </div>
                          <div className="kg-k-meta">
                            <div className="kg-k-meta-row">
                              <Calendar size={14} color="var(--g600)"/>
                              <span>
                                <span style={{fontWeight:600, color:'var(--text)'}}>Mulai:</span>{' '}
                                {startDT.tgl}{' '}
                                <span style={{fontFamily:'var(--mono)', fontSize:'11px', background:'var(--g50)', color:'var(--g700)', padding:'1px 6px', borderRadius:'4px', fontWeight:600}}>
                                  {startDT.jam}
                                </span>
                              </span>
                            </div>
                            <div className="kg-k-meta-row">
                              <Clock size={14} color="#f59e0b"/>
                              <span>
                                <span style={{fontWeight:600, color:'var(--text)'}}>Selesai:</span>{' '}
                                {endDT.tgl}{' '}
                                <span style={{fontFamily:'var(--mono)', fontSize:'11px', background:'#fffbeb', color:'#92400e', padding:'1px 6px', borderRadius:'4px', fontWeight:600}}>
                                  {endDT.jam}
                                </span>
                              </span>
                            </div>
                            <div className="kg-k-meta-row">
                              <MapPin size={14} color="var(--g600)"/>{k.location_name}
                            </div>
                          </div>
                        </div>

                        <div className="kg-k-quick-stats">
                          <div className="kg-k-qs-item total" onClick={() => handleOpenMemberModal(k.id, 'semua', `Semua Anggota — ${k.title}`)} title="Lihat semua anggota">
                            <Users size={14}/>
                            <div>
                              <div className="kg-k-qs-num">{jmlPeserta}</div>
                              <div style={{fontSize:'10px', fontWeight:500, opacity:0.8}}>Total</div>
                            </div>
                          </div>
                          <div className="kg-k-qs-item hadir" onClick={() => handleOpenMemberModal(k.id, 'hadir', `Anggota Hadir — ${k.title}`)} title="Lihat anggota hadir">
                            <UserCheck size={14}/>
                            <div>
                              <div className="kg-k-qs-num">{jmlHadir}</div>
                              <div style={{fontSize:'10px', fontWeight:500, opacity:0.8}}>Hadir</div>
                            </div>
                          </div>
                          <div className="kg-k-qs-item alfa" onClick={() => handleOpenMemberModal(k.id, 'alfa', `Anggota Alfa — ${k.title}`)} title="Lihat anggota alfa">
                            <UserX size={14}/>
                            <div>
                              <div className="kg-k-qs-num">{jmlAlfa}</div>
                              <div style={{fontSize:'10px', fontWeight:500, opacity:0.8}}>Alfa</div>
                            </div>
                          </div>
                        </div>

                        <div className="kg-k-card-footer">
                          <button
                            className="kg-btn-primary"
                            style={{flex:1, justifyContent:'center'}}
                            onClick={() => {
                              setDetailId(k.id);
                              fetchAttendance(k.id);
                              setDrawerTab('daftar');
                              setDrawerAbsenFilter(null);
                            }}
                          >
                            Kelola Absensi
                          </button>

                          {/* ── Tombol Edit: hanya untuk mendatang & berlangsung ── */}
                          {s !== 'selesai' && (
                            <button className="kg-btn-edit" onClick={() => handleEditOpen(k)} title="Edit Kegiatan">
                              <Edit3 size={16}/>
                            </button>
                          )}

                          {/* ── Hapus: hanya untuk mendatang ── */}
                          {s === 'mendatang' && (
                            <button className="kg-btn-danger" onClick={() => handleDelete(k.id)} title="Hapus Kegiatan">
                              <Trash2 size={16}/>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── MODAL BUAT/EDIT ───────────────────────────────────────────────── */}
        {showModal && (
          <div className="kg-modal-overlay">
            <div className="kg-modal">
              <div className="kg-modal-header">
                <div>
                  <div style={{fontWeight:700}}>
                    {isEditing
                      ? `Update Kegiatan${editingStatus ? ` — ${editingStatus.charAt(0).toUpperCase() + editingStatus.slice(1)}` : ''}`
                      : 'Buat Kegiatan Baru'}
                  </div>
                  {isStartLocked && (
                    <div style={{fontSize:'11px', color:'#f59e0b', marginTop:'2px', fontWeight:600}}>
                      ⚠ Tanggal &amp; jam mulai tidak dapat diubah karena kegiatan sudah berlangsung
                    </div>
                  )}
                </div>
                <button style={{background:'none', border:'none', cursor:'pointer'}} onClick={() => setShowModal(false)}><X size={18}/></button>
              </div>

              <div className="kg-stepper">
                <div className={`kg-step-item ${currentStep >= 1 ? 'active' : ''}`}>
                  <div className="kg-step-circle">{currentStep > 1 ? '✓' : '1'}</div>
                  <span>Info Dasar</span>
                </div>
                <div className="kg-step-line" />
                <div className={`kg-step-item ${currentStep === 2 ? 'active' : ''}`}>
                  <div className="kg-step-circle">2</div>
                  <span>Lokasi</span>
                </div>
              </div>

              <div style={{padding:'24px'}}>
                {currentStep === 1 ? (
                  <div className="kg-form-grid">
                    {/* Nama */}
                    <div className="kg-form-group full">
                      <label className="kg-form-label">Nama Kegiatan *</label>
                      <input className={`kg-form-input ${formErrors.nama ? 'error' : ''}`} placeholder="Masukkan nama kegiatan..." maxLength={50} value={form.nama} onChange={(e) => { setForm({...form, nama: e.target.value}); if (formErrors.nama) setFormErrors(p => ({...p, nama: null})); }} />
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        {formErrors.nama ? <span className="kg-field-error">{formErrors.nama}</span> : <span />}
                        <span className={charCounterClass(form.nama.length, 50)}>{form.nama.length}/50</span>
                      </div>
                    </div>

                    {/* Deskripsi */}
                    <div className="kg-form-group full">
                      <label className="kg-form-label">Deskripsi <span style={{fontWeight:400, textTransform:'none', fontSize:'11px', color:'var(--muted)'}}>— opsional</span></label>
                      <textarea className={`kg-form-input ${formErrors.desc ? 'error' : ''}`} style={{height:'80px', padding:'10px', resize:'vertical'}} placeholder="Deskripsi singkat kegiatan (opsional)..." maxLength={150} value={form.desc} onChange={(e) => { setForm({...form, desc: e.target.value}); if (formErrors.desc) setFormErrors(p => ({...p, desc: null})); }} />
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        {formErrors.desc ? <span className="kg-field-error">{formErrors.desc}</span> : <span />}
                        <span className={charCounterClass(form.desc.length, 150)}>{form.desc.length}/150</span>
                      </div>
                    </div>

                    {/* Tanggal & Jam Mulai */}
                    <div className="kg-form-group">
                      <label className="kg-form-label" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        Tanggal Mulai *
                        {isStartLocked && <span style={{fontSize:'10px', background:'#fef3c7', color:'#92400e', padding:'1px 6px', borderRadius:'4px', fontWeight:700}}>🔒 Terkunci</span>}
                      </label>
                      <input type="date" className={`kg-form-input ${formErrors.tglMulai ? 'error' : ''}`} min={isStartLocked ? undefined : todayStr} value={form.tglMulai} disabled={isStartLocked}
                        onChange={(e) => {
                          if (isStartLocked) return;
                          const newStart = e.target.value;
                          setForm(prev => ({ ...prev, tglMulai: newStart, tglSelesai: prev.tglSelesai < newStart ? newStart : prev.tglSelesai }));
                          if (formErrors.tglMulai) setFormErrors(p => ({...p, tglMulai: null}));
                        }}
                      />
                      {formErrors.tglMulai && <span className="kg-field-error">{formErrors.tglMulai}</span>}
                    </div>
                    <div className="kg-form-group">
                      <label className="kg-form-label" style={{display:'flex', alignItems:'center', gap:'6px'}}>
                        Jam Mulai *
                        {isStartLocked && <span style={{fontSize:'10px', background:'#fef3c7', color:'#92400e', padding:'1px 6px', borderRadius:'4px', fontWeight:700}}>🔒 Terkunci</span>}
                      </label>
                      <input type="time" className={`kg-form-input ${formErrors.jamMulai ? 'error' : ''}`} value={form.jamMulai} disabled={isStartLocked}
                        onChange={(e) => {
                          if (isStartLocked) return;
                          setForm({...form, jamMulai: e.target.value});
                          if (formErrors.jamMulai) setFormErrors(p => ({...p, jamMulai: null}));
                        }}
                      />
                      {formErrors.jamMulai && <span className="kg-field-error">{formErrors.jamMulai}</span>}
                    </div>

                    {/* Tanggal & Jam Selesai */}
                    <div className="kg-form-group">
                      <label className="kg-form-label">Tanggal Selesai *</label>
                      <input type="date" className={`kg-form-input ${formErrors.tglSelesai ? 'error' : ''}`} min={minTglSelesai} value={form.tglSelesai}
                        onChange={(e) => { setForm({...form, tglSelesai: e.target.value}); if (formErrors.tglSelesai) setFormErrors(p => ({...p, tglSelesai: null})); }}
                      />
                      {formErrors.tglSelesai && <span className="kg-field-error">{formErrors.tglSelesai}</span>}
                    </div>
                    <div className="kg-form-group">
                      <label className="kg-form-label">Jam Selesai *</label>
                      <input type="time" className={`kg-form-input ${formErrors.jamSelesai ? 'error' : ''}`} value={form.jamSelesai} min={form.tglSelesai === form.tglMulai ? form.jamMulai : undefined}
                        onChange={(e) => { setForm({...form, jamSelesai: e.target.value}); if (formErrors.jamSelesai) setFormErrors(p => ({...p, jamSelesai: null})); }}
                      />
                      {formErrors.jamSelesai && <span className="kg-field-error">{formErrors.jamSelesai}</span>}
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Geocode search */}
                    <div className="kg-form-group" style={{marginBottom:'10px'}}>
                      <label className="kg-form-label">
                        Cari Lokasi{' '}
                        <span style={{fontWeight:400, textTransform:'none', fontSize:'11px', color:'var(--muted)', marginLeft:'6px'}}>
                          — ketik nama tempat, atau klik/drag pin di peta, atau isi koordinat manual
                        </span>
                      </label>
                      <div className="kg-geocode-wrap" ref={geoWrapRef}>
                        <div className="kg-geocode-input-wrap">
                          <span className="kg-geocode-icon"><Search size={15}/></span>
                          <input
                            className="kg-geocode-input"
                            placeholder="Cari nama tempat, jalan, gedung..."
                            value={geoQuery}
                            onChange={handleGeoQueryChange}
                            autoComplete="off"
                          />
                          {geoLoading && <span className="kg-geocode-spinner" />}
                        </div>
                        {geoResults.length > 0 && (
                          <div className="kg-geocode-results">
                            {geoResults.map((item, i) => (
                              <div key={i} className="kg-geocode-item" onMouseDown={() => handleGeoSelect(item)}>
                                <MapPin size={14} color="var(--g600)" style={{flexShrink:0, marginTop:'2px'}}/>
                                <div>
                                  <div className="kg-geocode-item-name">{item.name || item.display_name.split(',')[0]}</div>
                                  <div className="kg-geocode-item-addr">{item.display_name}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nama lokasi */}
                    <div className="kg-form-group" style={{marginBottom:'10px'}}>
                      <label className="kg-form-label">
                        Nama Lokasi *{' '}
                        {reverseLoading && <span style={{fontWeight:400, textTransform:'none', fontSize:'11px', color:'var(--g600)', marginLeft:'8px'}}>⏳ Mendeteksi lokasi...</span>}
                      </label>
                      <input
                        className={`kg-form-input ${formErrors.lokasi ? 'error' : ''}`}
                        placeholder="Nama lokasi terisi otomatis atau ketik manual..."
                        value={form.lokasi}
                        onChange={(e) => { setForm({...form, lokasi: e.target.value}); if (formErrors.lokasi) setFormErrors(p => ({...p, lokasi: null })); }}
                      />
                      {formErrors.lokasi && <span className="kg-field-error" style={{marginTop:'4px'}}>{formErrors.lokasi}</span>}
                    </div>

                    {/* ── Input koordinat manual ── */}
                    <div style={{marginBottom:'8px'}}>
                      <div style={{fontSize:'10px', fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'6px', display:'flex', alignItems:'center', gap:'6px'}}>
                        <Navigation size={11}/> Input Koordinat Manual
                        <span style={{fontWeight:400, textTransform:'none', fontSize:'10px', color:'var(--muted)'}}>— atau klik/drag pin di peta</span>
                      </div>
                      <div className="kg-coord-row">
                        <div className="kg-coord-group">
                          <label className="kg-coord-label">Latitude</label>
                          <input
                            className={`kg-coord-input ${coordError ? 'error' : ''}`}
                            placeholder="-0.947100"
                            value={coordInput.lat}
                            onChange={(e) => { setCoordInput(p => ({...p, lat: e.target.value})); setCoordError(''); }}
                            onKeyDown={handleCoordKeyDown}
                          />
                        </div>
                        <div className="kg-coord-group">
                          <label className="kg-coord-label">Longitude</label>
                          <input
                            className={`kg-coord-input ${coordError ? 'error' : ''}`}
                            placeholder="100.417200"
                            value={coordInput.lng}
                            onChange={(e) => { setCoordInput(p => ({...p, lng: e.target.value})); setCoordError(''); }}
                            onKeyDown={handleCoordKeyDown}
                          />
                        </div>
                        <button className="kg-coord-apply-btn" onClick={handleApplyCoord} title="Terapkan koordinat ke peta">
                          <Navigation size={13}/> Terapkan
                        </button>
                      </div>
                      {coordError && (
                        <div style={{fontSize:'11px', color:'#ef4444', fontWeight:600, marginTop:'4px'}}>{coordError}</div>
                      )}
                    </div>

                    {/* Peta */}
                    <div style={{position:'relative'}}>
                      <div id="kg-leaflet-map" ref={mapRef}></div>
                      {reverseToast && <div className="kg-reverse-toast">📍 Nama lokasi diperbarui otomatis</div>}
                    </div>

                    {/* Meta: coords + radius */}
                    <div className="kg-map-meta">
                      <div className="kg-map-coords">
                        <MapPin size={12} style={{display:'inline', marginRight:'4px', verticalAlign:'middle'}}/>
                        {form.lat.toFixed(6)}, {form.lng.toFixed(6)}
                      </div>
                      <div className="kg-radius-wrap">
                        <span style={{color:'var(--muted)', fontSize:'12px'}}>Radius:</span>
                        <input
                          type="number"
                          className="kg-radius-input"
                          value={form.radius}
                          onChange={(e) => setForm({...form, radius: e.target.value})}
                        />
                        <span style={{color:'var(--muted)', fontSize:'12px'}}>meter</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{padding:'16px 24px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between'}}>
                <button className="kg-btn-outline" onClick={() => currentStep === 2 ? setCurrentStep(1) : setShowModal(false)}>Kembali</button>
                <button className="kg-btn-primary" disabled={currentStep === 1 ? !isStep1Valid : !isStep2Valid} onClick={handleSave}>
                  {currentStep === 1 ? "Lanjut" : "Simpan Kegiatan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL DRAWER ─────────────────────────────────── */}
        {detailId && (
          <div className="kg-detail-overlay" onClick={(e) => e.target === e.currentTarget && setDetailId(null)}>
            <div className="kg-detail-panel">
              <div style={{padding:'20px 24px', borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'12px', color:'var(--muted)'}}>Kelola riwayat kehadiran anggota</div>
                    <div style={{fontSize:'18px', fontWeight:800, color:'var(--g800)', marginTop:'2px'}}>{activeKegiatan?.title}</div>
                    {activeKegiatan && (
                      <>
                        <div style={{fontSize:'12px', color:'var(--muted)', marginTop:'6px', display:'flex', alignItems:'center', gap:'6px'}}>
                          <MapPin size={11} style={{flexShrink:0}}/>
                          {activeKegiatan.location_name}
                        </div>
                        <div className="kg-drawer-dt-row" style={{marginTop:'10px'}}>
                          <div className="kg-drawer-dt-chip start">
                            <Calendar size={12} color="var(--g600)"/>
                            <span className="label">Mulai</span>
                            <span>{new Date(activeKegiatan.start_datetime).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</span>
                            <span className="time-badge">{new Date(activeKegiatan.start_datetime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', hour12:false})}</span>
                          </div>
                          <div className="kg-drawer-dt-chip end">
                            <Clock size={12} color="#f59e0b"/>
                            <span className="label">Selesai</span>
                            <span>{new Date(activeKegiatan.end_datetime).toLocaleDateString('id-ID', {day:'numeric', month:'short', year:'numeric'})}</span>
                            <span className="time-badge">{new Date(activeKegiatan.end_datetime).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit', hour12:false})}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <button style={{background:'none', border:'none', cursor:'pointer', flexShrink:0, marginLeft:'12px'}} onClick={() => setDetailId(null)}><X size={20}/></button>
                </div>
              </div>

              <div style={{padding:'16px 24px', borderBottom:'1px solid var(--border)', background:'#fafafa'}}>
                <div className="kg-abs-stats-grid">
                  <div
                    className={`kg-abs-stat-box ${drawerAbsenFilter === 'hadir' ? 'active-filter' : ''}`}
                    style={{background: drawerAbsenFilter === 'hadir' ? 'var(--g100)' : 'var(--g50)'}}
                    onClick={() => { setDrawerAbsenFilter(prev => prev === 'hadir' ? null : 'hadir'); setDrawerTab('daftar'); }}
                    title="Klik untuk filter anggota hadir"
                  >
                    <div style={{fontSize:'10px', color:'var(--muted)', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'4px'}}>
                      <UserCheck size={12} color="var(--g600)"/> HADIR
                    </div>
                    <div style={{fontSize:'26px', fontWeight:800, color:'var(--g700)', fontFamily:'var(--mono)'}}>{absensiDetail.filter(a=>a.status==='hadir').length}</div>
                    <div style={{fontSize:'10px', color:'var(--muted)'}}>dari {absensiDetail.length} staf</div>
                    {drawerAbsenFilter === 'hadir' && <div style={{fontSize:'10px', color:'var(--g600)', fontWeight:700, marginTop:'4px'}}>✓ Difilter</div>}
                  </div>
                  <div
                    className={`kg-abs-stat-box alfa-box ${drawerAbsenFilter === 'alfa' ? 'active-filter' : ''}`}
                    style={{background: drawerAbsenFilter === 'alfa' ? '#fee2e2' : '#fff1f2'}}
                    onClick={() => { setDrawerAbsenFilter(prev => prev === 'alfa' ? null : 'alfa'); setDrawerTab('daftar'); }}
                    title="Klik untuk filter anggota alfa"
                  >
                    <div style={{fontSize:'10px', color:'var(--muted)', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', gap:'4px'}}>
                      <UserX size={12} color="#ef4444"/> ALFA
                    </div>
                    <div style={{fontSize:'26px', fontWeight:800, color:'#ef4444', fontFamily:'var(--mono)'}}>{absensiDetail.filter(a=>a.status!=='hadir').length}</div>
                    <div style={{fontSize:'10px', color:'var(--muted)'}}>belum/tidak absen</div>
                    {drawerAbsenFilter === 'alfa' && <div style={{fontSize:'10px', color:'#ef4444', fontWeight:700, marginTop:'4px'}}>✓ Difilter</div>}
                  </div>
                </div>
                {drawerAbsenFilter && (
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 12px', background:'white', borderRadius:'8px', border:'1px solid var(--border)', fontSize:'12px'}}>
                    <span style={{color:'var(--muted)'}}>
                      Menampilkan {filteredAbsensiDrawer.length} anggota dengan status{' '}
                      <strong style={{color: drawerAbsenFilter === 'hadir' ? 'var(--g700)' : '#ef4444'}}>
                        {drawerAbsenFilter === 'hadir' ? 'Hadir' : 'Alfa'}
                      </strong>
                    </span>
                    <button onClick={() => setDrawerAbsenFilter(null)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'11px', color:'var(--muted)', display:'flex', alignItems:'center', gap:'4px'}}>
                      <X size={12}/> Reset filter
                    </button>
                  </div>
                )}
              </div>

              <div style={{display:'flex', borderBottom:'1px solid var(--border)', background:'var(--white)', padding:'0 24px'}}>
                {[{key:'daftar', label:'Daftar Kehadiran'}, {key:'rekap', label:'Rekap Kementerian'}].map(t => (
                  <div key={t.key} onClick={() => setDrawerTab(t.key)} style={{padding:'10px 16px', fontSize:'12px', fontWeight:600, cursor:'pointer', color: drawerTab === t.key ? 'var(--g700)' : 'var(--muted)', borderBottom: drawerTab === t.key ? '2px solid var(--g600)' : '2px solid transparent', transition:'all .15s'}}>
                    {t.label}
                  </div>
                ))}
                <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
                  <button className="kg-btn-outline" style={{height:'30px', fontSize:'11px', padding:'0 10px'}} onClick={handleRefreshAbsensi} disabled={refreshingAbsensi} title="Refresh data absensi">
                    <RefreshCw size={13} style={{animation: refreshingAbsensi ? 'kg-spin 0.7s linear infinite' : 'none'}}/>
                    {refreshingAbsensi ? 'Memuat...' : 'Refresh'}
                  </button>
                  <button className="kg-btn-primary" style={{height:'30px', fontSize:'11px', padding:'0 10px'}} onClick={handleExportExcel} title="Export ke Excel">
                    <FileSpreadsheet size={13}/> Export Excel
                  </button>
                </div>
              </div>

              <div style={{flex:1, overflowY:'auto'}}>
                {drawerTab === 'daftar' && (
                  <table className="kg-abs-table">
                    <thead>
                      <tr>
                        <th style={{paddingLeft:'20px'}}>Nama</th>
                        <th>Kementerian</th>
                        <th>Status</th>
                        <th>Bukti Foto</th>
                        <th>Waktu Absen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAbsensiDrawer.length === 0 ? (
                        <tr><td colSpan={5} style={{textAlign:'center', padding:'40px', color:'var(--muted)', fontStyle:'italic'}}>{drawerAbsenFilter ? `Tidak ada anggota dengan status ${drawerAbsenFilter === 'alfa' ? 'alfa' : drawerAbsenFilter}` : 'Belum ada data absensi'}</td></tr>
                      ) : (
                        filteredAbsensiDrawer.map((a, i) => (
                          <tr key={i}>
                            <td style={{paddingLeft:'20px'}}><div style={{fontWeight:600, color:'var(--text)'}}>{a.name}</div></td>
                            <td style={{color:'var(--muted)', fontSize:'12px'}}>{a.kementerian || '-'}</td>
                            <td><StatusBadge status={a.status === 'hadir' ? 'hadir' : 'alfa'} /></td>
                            <td>{renderFotoSelfie(a.selfie_photo)}</td>
                            <td style={{fontSize:'12px', color:'var(--muted)', fontFamily:'var(--mono)'}}>
                              {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : <span style={{fontStyle:'italic', color:'#d1d5db'}}>Belum absen</span>}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}

                {drawerTab === 'rekap' && (
                  <div style={{padding:'20px 24px'}}>
                    <div style={{fontSize:'11px', fontWeight:700, color:'var(--muted)', marginBottom:'12px', textTransform:'uppercase', letterSpacing:'0.05em'}}>
                      Ringkasan Kehadiran per Kementerian
                    </div>
                    {rekapKementerian.length === 0 ? (
                      <div style={{textAlign:'center', padding:'40px', color:'var(--muted)', fontStyle:'italic', fontSize:'13px'}}>Belum ada data</div>
                    ) : (
                      <div style={{border:'1px solid var(--border)', borderRadius:'12px', overflow:'hidden'}}>
                        <table className="kg-kem-table">
                          <thead>
                            <tr>
                              <th>Kementerian</th>
                              <th style={{textAlign:'center'}}>Total</th>
                              <th style={{textAlign:'center', color:'var(--g700)'}}>Hadir</th>
                              <th style={{textAlign:'center', color:'#ef4444'}}>Alfa</th>
                              <th style={{minWidth:'140px'}}>Kehadiran</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rekapKementerian.map((r, i) => {
                              const pct = r.total > 0 ? Math.round((r.hadir / r.total) * 100) : 0;
                              return (
                                <tr key={i}>
                                  <td style={{fontWeight:600, color:'var(--text)'}}>{r.nama}</td>
                                  <td style={{textAlign:'center', fontFamily:'var(--mono)', fontWeight:700}}>{r.total}</td>
                                  <td style={{textAlign:'center'}}><span style={{background:'var(--g50)', color:'var(--g700)', fontWeight:700, fontFamily:'var(--mono)', padding:'2px 10px', borderRadius:'6px', fontSize:'12px'}}>{r.hadir}</span></td>
                                  <td style={{textAlign:'center'}}><span style={{background:'#fff1f2', color:'#ef4444', fontWeight:700, fontFamily:'var(--mono)', padding:'2px 10px', borderRadius:'6px', fontSize:'12px'}}>{r.alfa}</span></td>
                                  <td>
                                    <div className="kg-progress-wrap">
                                      <div className="kg-progress-bar"><div className="kg-progress-fill" style={{width:`${pct}%`}} /></div>
                                      <span style={{fontSize:'11px', fontWeight:700, color:'var(--muted)', fontFamily:'var(--mono)', minWidth:'32px'}}>{pct}%</span>
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

        {/* ── MODAL PREVIEW FOTO SELFIE ── */}
        {previewPhoto && (
          <div className="kg-photo-overlay" onClick={() => setPreviewPhoto(null)}>
            <div className="kg-photo-modal" onClick={(e) => e.stopPropagation()}>
              <img src={previewPhoto} alt="Bukti selfie absensi" />
              <div className="kg-photo-modal-footer">
                <div style={{fontSize:'12px', color:'var(--muted)', display:'flex', alignItems:'center', gap:'6px'}}><Camera size={14}/> Bukti foto selfie absensi</div>
                <button className="kg-btn-outline" style={{height:'30px', fontSize:'12px'}} onClick={() => setPreviewPhoto(null)}><X size={14}/> Tutup</button>
              </div>
            </div>
          </div>
        )}

        {/* ── MINI MODAL ANGGOTA ── */}
        {memberModal && (
          <div className="kg-member-overlay" onClick={() => setMemberModal(null)}>
            <div className="kg-member-modal" onClick={(e) => e.stopPropagation()}>
              <div className="kg-member-modal-header">
                <div>
                  <div style={{fontSize:'11px', color:'var(--muted)', marginBottom:'2px'}}>
                    {memberModal.filter === 'semua' ? 'Semua Anggota' : memberModal.filter === 'hadir' ? '✅ Anggota Hadir' : '❌ Anggota Alfa'}
                  </div>
                  <div style={{fontWeight:700, fontSize:'15px', color:'var(--text)'}}>{memberModal.title}</div>
                </div>
                <button style={{background:'none', border:'none', cursor:'pointer'}} onClick={() => setMemberModal(null)}><X size={18}/></button>
              </div>
              <div className="kg-member-modal-body">
                {memberModalLoading ? (
                  <div style={{textAlign:'center', padding:'40px', color:'var(--muted)'}}>
                    <div style={{width:'24px', height:'24px', border:'3px solid var(--g200)', borderTopColor:'var(--g600)', borderRadius:'50%', animation:'kg-spin 0.7s linear infinite', margin:'0 auto 12px'}}/>
                    Memuat data...
                  </div>
                ) : filteredMemberModalData.length === 0 ? (
                  <div style={{textAlign:'center', padding:'40px', color:'var(--muted)', fontStyle:'italic', fontSize:'13px'}}>Tidak ada anggota dengan status ini</div>
                ) : (
                  <table className="kg-member-table">
                    <thead>
                      <tr>
                        <th style={{paddingLeft:'20px'}}>Nama</th>
                        <th>Kementerian</th>
                        <th>Status</th>
                        {memberModal.filter !== 'alfa' && <th>Bukti Foto</th>}
                        {memberModal.filter !== 'alfa' && <th>Waktu Absen</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMemberModalData.map((a, i) => (
                        <tr key={i}>
                          <td style={{paddingLeft:'20px', fontWeight:600}}>{a.name}</td>
                          <td style={{color:'var(--muted)', fontSize:'12px'}}>{a.kementerian || '-'}</td>
                          <td><StatusBadge status={a.status === 'hadir' ? 'hadir' : 'alfa'}/></td>
                          {memberModal.filter !== 'alfa' && <td>{renderFotoSelfie(a.selfie_photo)}</td>}
                          {memberModal.filter !== 'alfa' && (
                            <td style={{fontSize:'12px', color:'var(--muted)', fontFamily:'var(--mono)'}}>
                              {a.check_in_time ? new Date(a.check_in_time).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : <span style={{fontStyle:'italic', color:'#d1d5db'}}>Belum absen</span>}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div style={{padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0}}>
                <span style={{fontSize:'12px', color:'var(--muted)'}}>{filteredMemberModalData.length} anggota ditampilkan</span>
                <button className="kg-btn-outline" style={{height:'30px', fontSize:'12px'}} onClick={() => setMemberModal(null)}><X size={14}/> Tutup</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ── StatBox ──────────────────────────────────────────────────────────────────
const StatBox = ({ label, value, sub, icon, color, active, onClick }) => (
  <div className={`kg-stat-card ${color} ${active ? 'active-filter' : ''}`} onClick={onClick} title={`Klik untuk filter: ${label}`}>
    <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px'}}>
      <div style={{color: color === 'rose' ? '#f43f5e' : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : 'var(--g700)'}}>{icon}</div>
      <div className="kg-stat-label">{label}</div>
    </div>
    <div className="kg-stat-value">{value}</div>
    <div className="kg-stat-sub">{sub}</div>
    {active && (
      <div style={{position:'absolute', bottom:'10px', right:'12px', fontSize:'10px', fontWeight:700, color: color === 'rose' ? '#f43f5e' : color === 'blue' ? '#3b82f6' : color === 'amber' ? '#f59e0b' : 'var(--g600)'}}>
        ● Aktif
      </div>
    )}
  </div>
);

const StatusBadge = ({ status }) => {
  const config = {
    mendatang  : { label: "Mendatang",   color: "#3b82f6", bg: "#eff6ff" },
    berlangsung: { label: "Berlangsung", color: "#f59e0b", bg: "#fffbeb" },
    selesai    : { label: "Selesai",     color: "#9ca3af", bg: "#f9fafb" },
    hadir      : { label: "Hadir",       color: "#16a34a", bg: "#f0fdf4" },
    alfa       : { label: "Alfa",        color: "#ef4444", bg: "#fef2f2" },
  };
  const s = config[status] || config.selesai;
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap:'5px', background: s.bg, color: s.color, fontSize:'10px', fontWeight:700, padding:'3px 8px', borderRadius:'99px', letterSpacing:'0.03em', textTransform:'uppercase', whiteSpace:'nowrap'}}>
      <span style={{width:'5px', height:'5px', borderRadius:'50%', background: s.color, flexShrink:0}}/>
      {s.label}
    </span>
  );
};