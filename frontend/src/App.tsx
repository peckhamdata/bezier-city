import { useRef, useState, useEffect } from "react";
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame";

function App() {
  const [showGame, setShowGame] = useState(true);
  const phaserRef = useRef<IRefPhaserGame | null>(null);

  useEffect(() => {
    if (phaserRef.current?.game) {
      const canvas = phaserRef.current.game.canvas;
      if (canvas) {
        canvas.style.display = showGame ? "block" : "none";
      }
    }
  }, [showGame]);

  return (
    <div className="flex flex-col items-center p-4">
      {/* Toggle Button */}
      <button
        onClick={() => setShowGame(!showGame)}
        className="px-4 py-2 mb-4 bg-blue-500 text-white rounded-lg"
      >
        {showGame ? "Map" : "Game"}
      </button>

      {/* Always keep PhaserGame in the DOM, but hide its canvas */}
      <div id="app" className="w-full h-96 border">
        <PhaserGame ref={phaserRef} />
      </div>

      {/* Map Container - Visible when showGame is false */}
      <div
        id="map-container"
        className={`w-full h-96 border ${showGame ? "hidden" : "block"}`}
      >
        <p>Map View</p>
      </div>
    </div>
  );
}

export default App;
