export default function Footer() {
  return (
    <footer className="w-full bg-gray-950 border-t border-gray-800 py-6 mt-16">
      <div className="px-4 md:px-8 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div>
          <span className="font-mono font-bold bg-linear-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            quordle//
          </span>
        </div>
        <div className="text-gray-600 text-sm">
          <p>Solve four words. Beat your friends. Race the clock.</p>
        </div>
      </div>
    </footer>
  );
}
