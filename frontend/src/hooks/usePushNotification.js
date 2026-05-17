// ============================================================
// FILE INI: taruh di folder  src/hooks/usePushNotification.js
// ============================================================
import { useState, useEffect } from "react";
import API from "../config/api"; // sesuaikan path config API kamu

// Helper: convert VAPID key dari string ke format yang dimengerti browser
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

const usePushNotification = (userId) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  // Cek saat pertama load: apakah browser ini sudah pernah subscribe?
 useEffect(() => {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

  navigator.serviceWorker.ready.then((reg) => {
    reg.pushManager.getSubscription().then(async (sub) => {
      console.log("Subscription saat ini:", sub);
      if (sub && userId) {
        // Kirim ulang subscription ke backend setiap load
        // karena backend simpan di memory (hilang saat restart)
        try {
         // usePushNotification.js — bagian useEffect, ganti URL-nya
                await fetch(`${API}/notification/subscribe`, {   // ← pakai API dari config
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId, subscription: sub }),
                });
          console.log("Subscription dikirim ulang ke backend");
        } catch (err) {
          console.error("Gagal kirim ulang subscription:", err);
        }
        setIsSubscribed(true);
      } else {
        setIsSubscribed(false);
      }
    });
  });
}, [userId]);

  const subscribe = async () => {
     console.log("Fungsi subscribe dipanggil, userId:", userId);
    // Cek apakah browser mendukung push notification
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Browser kamu tidak mendukung notifikasi push.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Minta izin notifikasi ke user (muncul popup browser)
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Izin notifikasi ditolak. Aktifkan di pengaturan browser.");
        setIsLoading(false);
        return;
      }

      // 2. Ambil VAPID public key dari backend
      const res       = await fetch(`${API}/notification/vapid-public-key`);
      const { publicKey } = await res.json();

      // 3. Daftarkan browser ke push service
      const reg          = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Kirim subscription ke backend kita, sertakan user_id
      await fetch(`${API}/notification/subscribe`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ user_id: userId, subscription }),
      });

      setIsSubscribed(true);
    } catch (err) {
      console.error("Gagal subscribe notifikasi:", err);
      alert("Gagal mengaktifkan notifikasi. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return { isSubscribed, isLoading, subscribe };
};

export default usePushNotification;