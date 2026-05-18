import NavBar from "./NavBar";
import Footer from "./Footer";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-950 text-gray-100">
      <NavBar />
      <main className="flex-1 pt-14">{children}</main>
      <Footer />
    </div>
  );
}
