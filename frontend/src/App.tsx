import { useRef, useState, useEffect } from "react";
import { IRefPhaserGame, PhaserGame } from "./game/PhaserGame";
import StreetCanvas from "./game/map";
import { EventBus } from './game/EventBus';


type PlayerPosition = {
    x: number;
    y: number;
  };

function App() {
    const [showGame, setShowGame] = useState(true);
    const [playerPosition, setPlayerPosition] = useState<PlayerPosition>({ x: 0, y: 0 });


    const phaserRef = useRef<IRefPhaserGame | null>(null);

    useEffect(() => {
        if (phaserRef.current?.game) {
            const game = phaserRef.current.game;

            if (showGame) {
                game.scene.resume("MainScene"); // Resume when game is shown
            } else {
                game.scene.pause("MainScene"); // Pause when game is hidden
            }

            // Keep the game div in the DOM but control visibility
            const canvas = game.canvas;
            if (canvas) {
                canvas.style.visibility = showGame ? "visible" : "hidden";
                canvas.style.pointerEvents = showGame ? "auto" : "none"; // Disable interaction when hidden
            }
        }

    // New: Listen for player position updates
    const handlePositionUpdate = (pos) => {
        setPlayerPosition(pos);
      };
  
      EventBus.on("playerPosition", handlePositionUpdate);
  
      // Cleanup function to remove listener
      return () => {
        EventBus.off("playerPosition", handlePositionUpdate);
        console.log("Effect cleanup: removing event listener");
      };

    }, [showGame]);

    const toggleView = () => {
        setShowGame((prev) => !prev);
    };

    return (
        <div style={{ textAlign: "center", marginTop: "50px" }}>
            {/* Outer container to ensure proper alignment */}
            <div id="app" style={{ 
                position: "relative", 
                display: "inline-block", // Keeps everything properly aligned 
                width: "1200px",   // 👈 Fix the width
                height: "800px",   // 👈 Fix the height
            }}>
                {/* Button now correctly positioned inside the same container */}
                <button
                    onClick={toggleView}
                    style={{
                        position: "absolute",
                        top: 10,
                        left: 10,
                        zIndex: 2, // Ensures button stays on top
                        padding: "10px 20px",
                    }}
                >
                    {showGame ? "Show Map" : "Show Game"}
                </button>

                {/* Game Div - Stacked on top */}
                <div
                    id="gameContainer"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        visibility: showGame ? "visible" : "hidden",
                    }}
                >
                    <PhaserGame ref={phaserRef} />
                </div>

                {/* Map Div - Same size & position, behind game when hidden */}
                <div
                    id="mapContainer"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        visibility: showGame ? "hidden" : "visible",
                    }}
                >
                    <StreetCanvas playerPosition={playerPosition}/>
                </div>
            </div>
        </div>
    );
}

export default App;
