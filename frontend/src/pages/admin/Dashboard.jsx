import Sidebar from "../../components/Sidebar";
import Topbar from "../../components/Topbar";

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title="Dashboard" />
        <main className="flex-1 overflow-y-auto p-6">
          <p className="text-gray-500">Konten dashboard di sini</p>
        </main>
      </div>
    </div>
  );
}