import { useState, useRef } from "react";
import AppShell from "../components/layout/AppShell";

export default function HomePage() {
  const [formData, setFormData] = useState({
    playerName: "",
    maxPlayers: 10,
    numRounds: 3,
    timePerRound: "120",
  });

  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(null);
  };

  const handleSliderChange = (name: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      timePerRound: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.playerName.trim()) {
      setError("Please enter your name");
      return;
    }

    console.log(JSON.stringify(formData, null, 2));
  };

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <AppShell>
      {/* Hero Section */}
      <section className="w-full min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-16">
        <div className="text-center space-y-6">
          <h1 className="font-mono text-4xl md:text-6xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            quordle//
          </h1>
          <p className="text-gray-400 text-lg">
            Solve four words. Beat your friends. Race the clock.
          </p>
          <button
            onClick={scrollToForm}
            className="mt-8 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all"
          >
            Create a game
          </button>
        </div>
      </section>

      {/* Game Creation Form */}
      <section ref={formRef} className="w-full px-4 py-16">
        <div className="max-w-md mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-gray-900 border border-gray-800 rounded-xl p-8 space-y-6"
          >
            {/* Player Name */}
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-gray-200 mb-2">
                Your name
              </label>
              <input
                id="playerName"
                type="text"
                name="playerName"
                value={formData.playerName}
                onChange={handleInputChange}
                placeholder="Enter your name"
                maxLength={20}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-400 transition-colors"
              />
              {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
            </div>

            {/* Max Players */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="maxPlayers" className="text-sm font-medium text-gray-200">
                  Max players
                </label>
                <span className="font-mono text-lg text-indigo-400">
                  {formData.maxPlayers}
                </span>
              </div>
              <input
                id="maxPlayers"
                type="range"
                name="maxPlayers"
                min="2"
                max="20"
                step="1"
                value={formData.maxPlayers}
                onChange={(e) => handleSliderChange("maxPlayers", parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Number of Rounds */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="numRounds" className="text-sm font-medium text-gray-200">
                  Number of rounds
                </label>
                <span className="font-mono text-lg text-indigo-400">
                  {formData.numRounds}
                </span>
              </div>
              <input
                id="numRounds"
                type="range"
                name="numRounds"
                min="1"
                max="5"
                step="1"
                value={formData.numRounds}
                onChange={(e) => handleSliderChange("numRounds", parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Time Per Round */}
            <div>
              <label htmlFor="timePerRound" className="block text-sm font-medium text-gray-200 mb-2">
                Time per round
              </label>
              <select
                id="timePerRound"
                value={formData.timePerRound}
                onChange={handleSelectChange}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-indigo-400 transition-colors"
              >
                <option value="60">60s</option>
                <option value="90">90s</option>
                <option value="120">120s</option>
                <option value="180">180s</option>
              </select>
            </div>

            {/* Fixed Settings */}
            <div className="pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-600 text-center font-mono">
                4 boards · 5-letter words · 9 attempts per board
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium rounded-lg transition-all"
            >
              Create game →
            </button>
          </form>
        </div>
      </section>

      {/* How to Play Section */}
      <section id="how-to-play" className="w-full px-4 py-16 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-100">How to play</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🎮</div>
              <h3 className="text-lg font-bold text-gray-100 mb-2">Create a game</h3>
              <p className="text-gray-400 text-sm">
                Set your rules and get a shareable invite link.
              </p>
            </div>

            {/* Card 2 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🔗</div>
              <h3 className="text-lg font-bold text-gray-100 mb-2">Invite your group</h3>
              <p className="text-gray-400 text-sm">
                Share the link. Friends join instantly, no account needed.
              </p>
            </div>

            {/* Card 3 */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">⏱️</div>
              <h3 className="text-lg font-bold text-gray-100 mb-2">Race to solve</h3>
              <p className="text-gray-400 text-sm">
                Four words, one timer. Guess fast and score big.
              </p>
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
