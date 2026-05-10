import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../config/api";

const SEKRE_LAT    = -0.92366;
const SEKRE_LNG    = 100.44358;
const RADIUS_METER = 50;


function hitungJarak(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatJarak(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

export default function Home() {
  const navigate = useNavigate();

  const stored = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user   = stored ? JSON.parse(stored) : null;

  const [homeData, setHomeData]   = useState(null);
  const [history, setHistory]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);

  const [showCamera, setShowCamera]                   = useState(false);
  const [currentAction, setCurrentAction]             = useState(null);
  const [location, setLocation]                       = useState(null);
  const [locationName, setLocationName]               = useState(null);
  const [currentLocationName, setCurrentLocationName] = useState("Mendapatkan lokasi...");
  const [loadingLocationName, setLoadingLocationName] = useState(false);
  const [loadingCheckin, setLoadingCheckin]           = useState(false);
  const [capturedPhoto, setCapturedPhoto]             = useState(null);
  const [captureTime, setCaptureTime]                 = useState(null);
  const [distanceSekre, setDistanceSekre]             = useState(null);
  const [photoModal, setPhotoModal]                   = useState(null);
  const [radiusError, setRadiusError]                 = useState(null);
  // Error radius per kegiatan: { [activity_id]: string }
  const [activityRadiusErrors, setActivityRadiusErrors] = useState({});
  const [showProfileMenu, setShowProfileMenu]         = useState(false);

  // null = tidak ada, "sekre" = tombol sekre, number = activity_id kegiatan
  const [loadingFor, setLoadingFor] = useState(null);

  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const today    = new Date();
  const hariList  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const bulanList = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
  const todayStr  = `${hariList[today.getDay()]}, ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}`;

  const getCekWaktu = () => {
    return { bisa: true, pesan: null };
  };
  const waktu = getCekWaktu();

  const isKegiatanBisaAbsen = (act) => new Date() >= new Date(act.start_datetime);
  const isKegiatanMasihBerlangsung = (act) => new Date() <= new Date(act.end_datetime);

  const formatWaktuMulai = (dt) => {
    const d   = new Date(dt);
    const now = new Date();
    const diffMs    = d - now;
    if (diffMs <= 0) return null;
    const diffMenit = Math.floor(diffMs / 60000);
    const diffJam   = Math.floor(diffMenit / 60);
    const diffHari  = Math.floor(diffJam / 24);
    if (diffHari > 0) return `Mulai ${d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })} pukul ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    if (diffJam > 0)  return `Mulai ${diffJam} jam lagi · ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`;
    return `Mulai ${diffMenit} menit lagi`;
  };

  useEffect(() => {
    if (!user) { window.location.href = "/"; return; }
    fetchData();
    ambilLokasiTopbar();
  }, []);

  const ambilLokasiTopbar = () => {
    if (!navigator.geolocation) { setCurrentLocationName("Lokasi tidak tersedia"); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&addressdetails=1&zoom=18`);
          const data = await res.json();
          const addr = data.address;
          const namaGedung = data.name || addr?.amenity || addr?.building || addr?.office || addr?.shop || addr?.tourism || addr?.leisure || null;
          const jalan      = addr?.road ? `${addr.road}${addr?.house_number ? ` No.${addr.house_number}` : ""}` : null;
          const parts      = [namaGedung, jalan, addr?.quarter || addr?.hamlet, addr?.neighbourhood || addr?.suburb, addr?.city_district || addr?.county, addr?.city || addr?.town || addr?.village].filter(Boolean);
          setCurrentLocationName(parts.length > 0 ? parts.join(", ") : "Lokasi tidak diketahui");
        } catch { setCurrentLocationName("Lokasi tidak diketahui"); }
      },
      () => setCurrentLocationName("Gagal mendapatkan lokasi"),
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (showCamera && !capturedPhoto) startCamera();
    return () => { if (!showCamera) stopCamera(); };
  }, [showCamera, capturedPhoto]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [homeRes, sekreHistRes, kegHistRes] = await Promise.all([
        fetch(`${API}/attendance/home/${user.id}`),
        fetch(`${API}/attendance/secretariat/history/${user.id}?limit=10`),
        fetch(`${API}/attendance/activity/history/${user.id}?limit=10`),
      ]);

      const homeJson   = await homeRes.json();
      const sekreHist  = await sekreHistRes.json();
      const kegHistAll = await kegHistRes.json();

      setHomeData(homeJson);

      const kegHist = Array.isArray(kegHistAll)
        ? kegHistAll.filter(i => i.status === "hadir")
        : [];

      const kegOngoing = (homeJson?.activities || [])
        .filter(act => act.att_status === "hadir")
        .map(act => ({
          id:            act.id,
          activity_id:   act.id,
          check_in_time: act.att_check_in,
          location_name: act.att_location_name || act.location_name,
          selfie_photo:  act.att_selfie_photo || null,
          status:        "hadir",
          title:         act.title,
          _jenis:        "kegiatan",
          _sortTime:     act.att_check_in,
        }));

      const sekreTagged = (Array.isArray(sekreHist) ? sekreHist : []).map(i => ({
        ...i,
        _jenis:    "sekre",
        _sortTime: i.check_in_time || i.date,
      }));

      const kegTagged = kegHist.map(i => ({
        ...i,
        _jenis:    "kegiatan",
        _sortTime: i.check_in_time,
      }));

      const seenActivityIds = new Set();
      const allKegiatan = [...kegOngoing, ...kegTagged].filter(i => {
        if (seenActivityIds.has(i.activity_id)) return false;
        seenActivityIds.add(i.activity_id);
        return true;
      });

      const merged = [...sekreTagged, ...allKegiatan]
        .sort((a, b) => new Date(b._sortTime) - new Date(a._sortTime))
        .slice(0, 5);

      setHistory(merged);
    } catch {
      setToast({ type: "error", msg: "Gagal memuat data" });
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setToast({ type: "error", msg: "Tidak dapat mengakses kamera" });
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.8));
    setCaptureTime(new Date());
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCaptureTime(null);
    startCamera();
  };

  const getReverseGeocode = async (lat, lng) => {
    const res  = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=18`);
    const data = await res.json();
    const addr = data.address;
    const namaGedung = data.name || addr?.amenity || addr?.building || addr?.shop || addr?.tourism || addr?.leisure || addr?.office || null;
    const jalan      = addr?.road ? `${addr.road}${addr?.house_number ? ` No.${addr.house_number}` : ""}` : null;
    const parts      = [namaGedung, jalan, addr?.quarter || addr?.hamlet, addr?.neighbourhood || addr?.suburb, addr?.city_district || addr?.county, addr?.city || addr?.town || addr?.village].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Lokasi tidak diketahui";
  };

  const getGPS = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject("Geolocation tidak didukung"); return; }
      setLoadingLocationName(true);
      setLocationName(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => reject("Gagal mendapatkan lokasi. Pastikan GPS aktif."),
        { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 }
      );
    });

  const handleAmbilAbsensi = async (type, activity_id = null) => {
    const key = type === "sekre" ? "sekre" : activity_id;
    setLoadingFor(key);
    setRadiusError(null);

    // Reset error radius untuk kegiatan ini saja
    if (type === "kegiatan" && activity_id) {
      setActivityRadiusErrors(prev => ({ ...prev, [activity_id]: null }));
    }

    try {
      const loc = await getGPS();
      setLocation(loc);

      if (type === "sekre") {
        const jarak = hitungJarak(loc.latitude, loc.longitude, SEKRE_LAT, SEKRE_LNG);
        setDistanceSekre(jarak);
        if (jarak > RADIUS_METER) {
          setRadiusError(`Anda berada ${formatJarak(jarak)} dari Sekre BEM. Absensi hanya bisa dilakukan dalam radius ${RADIUS_METER}m.`);
          setLoadingFor(null);
          return;
        }
      }
      // Untuk kegiatan: validasi radius dilakukan di backend setelah foto diambil
      // karena koordinat & radius kegiatan ada di DB

      setCurrentAction({ type, activity_id });
      setShowCamera(true);
      setCapturedPhoto(null);
      setCaptureTime(null);
      getReverseGeocode(loc.latitude, loc.longitude)
        .then((nama) => setLocationName(nama))
        .catch(() => setLocationName("Lokasi tidak diketahui"))
        .finally(() => setLoadingLocationName(false));
    } catch (err) {
      setToast({ type: "error", msg: err });
    } finally {
      setLoadingFor(null);
    }
  };

  const handleSubmitAbsensi = async () => {
    if (!capturedPhoto || !location) return;
    setLoadingCheckin(true);
    try {
      const url  = currentAction.type === "sekre"
        ? `${API}/attendance/secretariat/checkin`
        : `${API}/attendance/activity/checkin`;

      const body = currentAction.type === "sekre"
        ? {
            user_id:       user.id,
            latitude:      location.latitude,
            longitude:     location.longitude,
            location_name: locationName || "Sekre BEM",
            selfie_photo:  capturedPhoto,
          }
        : {
            activity_id:   currentAction.activity_id,
            user_id:       user.id,
            latitude:      location.latitude,
            longitude:     location.longitude,
            location_name: locationName || "Lokasi Kegiatan",
            selfie_photo:  capturedPhoto,
          };

      const res  = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();

      if (!res.ok) {
        // Jika error radius dari kegiatan (403) → tampilkan di kartu kegiatan, tutup kamera
        if (res.status === 403 && currentAction.type === "kegiatan") {
          setActivityRadiusErrors(prev => ({
            ...prev,
            [currentAction.activity_id]: data.message,
          }));
          setShowCamera(false);
          setCapturedPhoto(null);
          setCaptureTime(null);
        } else {
          setToast({ type: "error", msg: data.message });
        }
        return;
      }

      setToast({ type: "success", msg: data.updated ? "Absen berhasil diperbarui!" : "Absen berhasil dicatat!" });
      setShowCamera(false);
      setCapturedPhoto(null);
      setCaptureTime(null);
      setRadiusError(null);
      fetchData();
    } catch {
      setToast({ type: "error", msg: "Gagal terhubung ke server" });
    } finally {
      setLoadingCheckin(false);
    }
  };

  const handleLogout = () => { localStorage.clear(); sessionStorage.clear(); window.location.href = "/"; };

  const formatTime = (dt) => {
    if (!dt) return "-";
    return new Date(dt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  };
  const formatDatetime = (dt) => {
    if (!dt) return "-";
    const d = new Date(dt);
    return `${formatTime(dt)}, ${d.getDate()} ${bulanList[d.getMonth()]} ${d.getFullYear()}`;
  };

  const sudahAbsenSekre = homeData?.secretariat_attendance !== null;

  const jabatan    = user?.jabatan    || "-";
  const kementerian = user?.kementerian || null;

  const IconCheck = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
    </svg>
  );
  const IconWarning = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
  const IconClock = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
  const IconPin = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.5 7-11a7 7 0 10-14 0c0 6.5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
  const Spinner = () => (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
  const IconRefresh = () => (
    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <div style={{
        position: "fixed", top: 24, left: "50%",
        transform: `translateX(-50%) translateY(${toast ? "0" : "-120%"})`,
        transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 60, pointerEvents: toast ? "auto" : "none",
      }}>
        {toast && (
          <div className={`flex items-center gap-3 bg-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg whitespace-nowrap border
            ${toast.type === "success" ? "border-green-100 text-green-600" : "border-red-100 text-red-500"}`}>
            {toast.type === "success" ? <IconCheck /> : <IconWarning />}
            <span className="max-w-xs truncate">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-1 opacity-50 hover:opacity-100">✕</button>
          </div>
        )}
      </div>

      {/* ── Modal Foto Riwayat ────────────────────────────────────────────── */}
      {photoModal && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setPhotoModal(null)}>
          <div className="w-full max-w-xs bg-white rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">Foto Absensi</p>
              <button onClick={() => setPhotoModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="relative" style={{ aspectRatio: "3/4" }}>
              <img src={photoModal.src} alt="Selfie Absensi" className="w-full h-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-white"><IconClock /><p className="text-xs font-medium">{photoModal.time}</p></div>
                <div className="flex items-start gap-2 text-white"><IconPin /><p className="text-xs leading-relaxed">{photoModal.lokasi}</p></div>
                {photoModal.jarak && (
                  <div className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                    {formatJarak(photoModal.jarak)} dari Sekre BEM
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Kamera ──────────────────────────────────────────────────── */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/80 z-40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{capturedPhoto ? "Konfirmasi Absensi" : "Ambil Selfie"}</p>
              <button onClick={() => { setShowCamera(false); stopCamera(); setCapturedPhoto(null); setCaptureTime(null); }} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="relative bg-black" style={{ aspectRatio: "3/4" }}>
              {!capturedPhoto ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent p-4">
                    <div className="flex items-start gap-2 text-white">
                      <IconPin />
                      <div>
                        {loadingLocationName ? <p className="text-xs text-white/70">Mendapatkan nama lokasi...</p> : (
                          <>
                            <p className="text-xs font-medium leading-relaxed">{locationName || "-"}</p>
                            {location && <p className="text-xs text-white/50 mt-0.5">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <img src={capturedPhoto} alt="Selfie" className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 text-white">
                      <IconClock />
                      <p className="text-xs font-semibold">
                        {captureTime?.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        {" · "}
                        {captureTime?.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-start gap-2 text-white">
                      <IconPin />
                      <div>
                        <p className="text-xs font-medium leading-relaxed">{locationName || "-"}</p>
                        {location && <p className="text-xs text-white/50 mt-0.5">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>}
                      </div>
                    </div>
                    {currentAction?.type === "sekre" && distanceSekre !== null && (
                      <div className="self-start flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-medium">
                        {formatJarak(distanceSekre)} dari Sekre BEM
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-4 flex gap-3">
              {!capturedPhoto ? (
                <button onClick={capturePhoto} className="flex-1 h-12 bg-[#00923D] text-white text-sm font-semibold rounded-xl hover:bg-[#007a32] transition active:scale-[0.98]">
                  Ambil Foto
                </button>
              ) : (
                <>
                  <button onClick={retakePhoto} className="flex-1 h-12 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition">
                    Ulangi
                  </button>
                  <button onClick={handleSubmitAbsensi} disabled={loadingCheckin}
                    className="flex-1 h-12 bg-[#00923D] text-white text-sm font-semibold rounded-xl hover:bg-[#007a32] transition active:scale-[0.98] disabled:opacity-60">
                    {loadingCheckin ? "Menyimpan..." : "Konfirmasi"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-[#00923D] px-5 pt-10 pb-16">
        <div className="max-w-lg mx-auto flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-green-200 text-xs mb-1">Selamat Datang</p>
            <h1 className="text-white font-bold text-lg leading-tight">{user?.name?.toUpperCase()}</h1>
            <p className="text-green-100 text-xs mt-0.5">{user?.nim}</p>
            <p className="text-green-100 text-xs font-medium mt-1">
              {jabatan}{kementerian ? ` — ${kementerian}` : ""}
            </p>
            <div className="flex flex-col gap-1 mt-3">
              <div className="flex items-start gap-1.5 text-green-100 text-xs">
                <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="leading-relaxed">{currentLocationName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-green-100 text-xs">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {todayStr}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1 shrink-0">
            {/* Notifikasi */}
            <button className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Profil Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(v => !v)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition flex items-center justify-center"
              >
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>

              {showProfileMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-lg shadow-black/10 border border-gray-100 overflow-hidden z-20">
                    <button
                      onClick={() => { setShowProfileMenu(false); navigate("/profile"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profil
                    </button>
                    <div className="h-px bg-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Keluar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Konten ────────────────────────────────────────────────────────── */}
      <div className="max-w-lg mx-auto px-4 -mt-10 pb-10 flex flex-col gap-4">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 flex items-center justify-center">
            <svg className="animate-spin w-6 h-6 text-[#00923D]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        ) : (
          <>
            {/* ── Notif Piket ── */}
            {homeData?.has_duty && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-800">Piket Hari Ini!</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    {kementerian || "Kementerian Anda"} mendapat jadwal piket sekretariat hari ini.
                  </p>
                </div>
              </div>
            )}

            {/* ── Absensi Sekretariat ── */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-800">Absensi Sekretariat</h2>
                {distanceSekre !== null && (
                  <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full
                    ${distanceSekre <= RADIUS_METER ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    {formatJarak(distanceSekre)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 mb-3 text-xs text-gray-400">
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Absensi sekre hanya dalam radius {RADIUS_METER}m dari Sekre BEM
              </div>

              {radiusError && (
                <div className="flex items-start gap-2 mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="leading-relaxed">{radiusError}</p>
                </div>
              )}

              {sudahAbsenSekre ? (
                <div className="flex flex-col gap-2.5 mb-3 p-4 rounded-2xl bg-green-50 border border-green-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-green-600 text-sm font-semibold">
                      <IconCheck />
                      <span>Anda sudah absen</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <IconClock />
                    <span>{formatTime(homeData.secretariat_attendance.check_in_time)}, {new Date(homeData.secretariat_attendance.check_in_time).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-500">
                    <IconPin /><span className="leading-relaxed">{homeData.secretariat_attendance.location_name || "Sekre BEM"}</span>
                  </div>
                  {homeData.secretariat_attendance.distance_meters != null && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>{formatJarak(homeData.secretariat_attendance.distance_meters)} dari Sekre BEM</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-3"><IconWarning /><span>Anda belum absen hari ini</span></div>
              )}

              <button
                onClick={() => handleAmbilAbsensi("sekre")}
                disabled={loadingFor !== null || !waktu.bisa}
                className="w-full h-11 bg-[#00923D] hover:bg-[#007a32] text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingFor === "sekre" ? (
                  <span className="flex items-center justify-center gap-2"><Spinner />Mencari lokasi...</span>
                ) : !waktu.bisa ? (
                  "Absensi Tidak Tersedia"
                ) : sudahAbsenSekre ? (
                  <span className="flex items-center justify-center gap-2"><IconRefresh />Absen Ulang</span>
                ) : (
                  "Ambil Absensi Sekre"
                )}
              </button>

              {!waktu.bisa && (
                <div className="flex items-center justify-center gap-1.5 mt-2">
                  <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <p className="text-xs text-amber-500 font-medium">{waktu.pesan}</p>
                </div>
              )}
            </div>

            {/* ── Absensi Kegiatan ── */}
            {homeData?.activities?.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm p-5">
                <h2 className="text-sm font-bold text-gray-800 mb-3">Absensi Kegiatan</h2>
                <div className="flex flex-col gap-4">
                  {homeData.activities.map((act) => {
                    const sudahAbsen         = act.att_status === "hadir";
                    const bisaAbsen          = isKegiatanBisaAbsen(act);
                    const masihBerlangsung   = isKegiatanMasihBerlangsung(act);
                    const sudahSelesai       = !masihBerlangsung;
                    const infoWaktu          = !bisaAbsen ? formatWaktuMulai(act.start_datetime) : null;
                    const isLoadingThis      = loadingFor === act.id;
                    const radiusErrKegiatan  = activityRadiusErrors[act.id];

                    // Tombol disabled jika: ada loading lain, belum mulai, atau sudah selesai
                    const tombolDisabled = loadingFor !== null || !bisaAbsen || sudahSelesai;

                    return (
                      <div key={act.id} className="border border-gray-100 rounded-xl p-4">

                        {/* Badge status waktu */}
                        {!bisaAbsen && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                              </svg>
                              Akan Datang
                            </span>
                          </div>
                        )}
                        {sudahSelesai && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-medium">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                              Kegiatan Selesai
                            </span>
                          </div>
                        )}

                        <p className="text-sm font-semibold text-gray-800 mb-2">{act.title}</p>
                        {act.description && <p className="text-xs text-gray-400 mb-2 leading-relaxed">{act.description}</p>}

                        <div className="flex flex-col gap-1.5 mb-3">
                          <div className="flex items-start gap-2 text-xs text-gray-400"><IconPin /><span className="leading-relaxed">{act.location_name}</span></div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <IconClock />
                            <span>{formatDatetime(act.start_datetime)} – {formatDatetime(act.end_datetime)}</span>
                          </div>
                          {/* Info radius kegiatan */}
                          {act.radius_meters > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                              </svg>
                              <span>Absensi dalam radius {act.radius_meters}m dari lokasi kegiatan</span>
                            </div>
                          )}
                        </div>

                        {/* Error radius kegiatan */}
                        {radiusErrKegiatan && (
                          <div className="flex items-start gap-2 mb-3 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            <p className="leading-relaxed">{radiusErrKegiatan}</p>
                          </div>
                        )}

                        {/* Status sudah absen */}
                        {sudahAbsen && (
                          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-xs text-green-600 font-semibold mb-2">
                            <IconCheck /><span>Sudah absen · {formatTime(act.att_check_in)}</span>
                          </div>
                        )}

                        {/* Tombol aksi */}
                        <button
                          onClick={() => handleAmbilAbsensi("kegiatan", act.id)}
                          disabled={tombolDisabled}
                          className="w-full h-10 bg-gray-700 hover:bg-gray-800 text-white text-sm font-semibold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoadingThis ? (
                            <span className="flex items-center justify-center gap-2"><Spinner />Mencari lokasi...</span>
                          ) : sudahSelesai ? (
                            "Absensi Ditutup"
                          ) : !bisaAbsen ? (
                            "Belum Dibuka"
                          ) : sudahAbsen ? (
                            <span className="flex items-center justify-center gap-2"><IconRefresh />Absen Ulang</span>
                          ) : (
                            "Ambil Absensi Kegiatan"
                          )}
                        </button>

                        {/* Keterangan bawah tombol */}
                        {!sudahSelesai && !bisaAbsen && infoWaktu && (
                          <div className="flex items-center justify-center gap-1.5 mt-1.5">
                            <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                            </svg>
                            <p className="text-xs text-blue-400 font-medium">{infoWaktu}</p>
                          </div>
                        )}
                        {!sudahSelesai && bisaAbsen && !sudahAbsen && (
                          <p className="text-xs text-gray-400 text-center mt-1.5">Absen dapat diambil sesuai waktu pelaksanaan</p>
                        )}
                        {!sudahSelesai && bisaAbsen && sudahAbsen && (
                          <p className="text-xs text-gray-400 text-center mt-1.5">Absen ulang tersedia selama kegiatan berlangsung</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Riwayat Absensi ── */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-sm font-bold text-gray-800 mb-3">Riwayat Absensi</h2>
              {history.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Belum ada riwayat absensi</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {history.map((item, idx) => {
                    const d          = item.check_in_time ? new Date(item.check_in_time) : null;
                    const timeStr    = d ? d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-";
                    const dateStr    = d ? `${d.getDate()} ${bulanList[d.getMonth()]} ${d.getFullYear()}` : "-";
                    const isKegiatan = item._jenis === "kegiatan";
                    const fotoSrc    = item.selfie_photo
                      ? (item.selfie_photo.startsWith("data:") ? item.selfie_photo : `data:image/jpeg;base64,${item.selfie_photo}`)
                      : null;

                    return (
                      <div key={item.id ?? idx} className="py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.status === "hadir" ? "bg-green-50" : "bg-red-50"}`}>
                            {item.status === "hadir" ? (
                              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-semibold text-gray-700">{timeStr} · {dateStr}</p>
                              <span className={`text-xs font-semibold shrink-0 ${item.status === "hadir" ? "text-green-500" : "text-red-400"}`}>
                                {item.status === "hadir" ? "Hadir" : "Tidak Hadir"}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                              {item.location_name || (isKegiatan ? "Lokasi Kegiatan" : "Sekre BEM")}
                            </p>
                            {!isKegiatan && item.distance_meters != null && (
                              <p className="text-xs text-gray-400 mt-0.5">{formatJarak(item.distance_meters)} dari Sekre BEM</p>
                            )}
                            <div className="mt-0.5">
                              {isKegiatan ? (
                                <><p className="text-xs text-gray-400">{item.title || "Kegiatan"}</p><p className="text-xs text-gray-300">Absen Kegiatan</p></>
                              ) : (
                                <p className="text-xs text-gray-300">Absen Sekre</p>
                              )}
                            </div>
                            {fotoSrc && (
                              <button
                                onClick={() => setPhotoModal({ src: fotoSrc, time: `${timeStr}, ${dateStr}`, lokasi: item.location_name || (isKegiatan ? "Lokasi Kegiatan" : "Sekre BEM"), jarak: isKegiatan ? null : item.distance_meters })}
                                className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#00923D] hover:opacity-70 transition"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                Lihat Foto
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <button
                onClick={() => navigate("/riwayat-absensi")}
                className="w-full mt-3 flex items-center justify-center gap-1.5 text-xs text-[#00923D] font-semibold hover:opacity-70 transition"
              >
                Lihat Semua Riwayat
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}