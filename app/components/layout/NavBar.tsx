import { Link } from "react-router";

export default function NavBar() {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <nav className="fixed top-0 w-full h-14 bg-gray-950 border-b border-gray-800 z-50">
      <div className="h-full px-4 md:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <span className="font-mono text-xl md:text-xl font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            quordle//
          </span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex gap-6">
          <button
            onClick={() => scrollToSection("how-to-play")}
            className="text-gray-400 hover:text-gray-100 transition-colors text-sm font-medium"
          >
            How to play
          </button>
          <a
            href="https://github.com/GenerousWeb/quordle-hurdle"
            target="_blank"
            rel="noreferrer"
            className="text-gray-400 hover:text-gray-100 transition-colors text-sm font-medium"
          >
            GitHub
          </a>
        </div>
      </div>
    </nav>
  );
}
