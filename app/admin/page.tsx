import Navbar from "@/components/Navbar";
import AdminRoleManager from "@/components/AdminRoleManager";

export const metadata = {
  title: "Admin Panel | Supply Chain DApp",
  description: "Manage system roles for the Supply Chain DApp.",
};

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <Navbar />
      
      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">System Administration</h1>
          <p className="text-gray-500 mt-2">Secure portal for the contract owner to manage the dApp.</p>
        </div>
        
        <AdminRoleManager />
      </main>
    </div>
  );
}
