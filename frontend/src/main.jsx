import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// ← TAMBAH INI
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(() => {
    console.log("Service Worker terdaftar");
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);