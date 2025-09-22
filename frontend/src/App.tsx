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
    const [currentStreetId, setCurrentStreetId] = useState(0);


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
        // Extract street ID if available
        if (pos.street_id !== undefined) {
            setCurrentStreetId(pos.street_id);
        }
      };
  
      EventBus.on("playerPosition", handlePositionUpdate);
  
      // Cleanup function to remove listener
      return () => {
        EventBus.off("playerPosition", handlePositionUpdate);
        console.log("Effect cleanup: removing event listener");
      };

    }, [showGame]);

    const toggleView = () => {
        setShowGame(!showGame);
    };

    return (
        <div style={{ 
            display: "flex",
            flexDirection: "column",
            width: "100vw",
            height: "100vh",
            margin: 0,
            padding: 0,
            overflow: "hidden"
        }}>
            {/* Toggle button above the game/map area */}
            <div style={{
                display: "flex",
                justifyContent: "center",
                padding: "10px",
                backgroundColor: "#000000"
            }}>
                <button
                    onClick={toggleView}
                    className="button"
                    style={{
                        margin: 0
                    }}
                >
                    {showGame ? "Show Map" : "Show Game"}
                </button>
            </div>

            {/* Game/Map container that fills remaining space */}
            <div id="app" style={{ 
                position: "relative",
                flex: 1,
                width: "100%",
                overflow: "hidden"
            }}>
                {/* Game Div */}
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

                {/* Map Div */}
                <div
                    id="mapContainer"
                    style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        visibility: !showGame ? "visible" : "hidden",
                    }}
                >
                    <StreetCanvas playerPosition={playerPosition}/>
                </div>

            </div>
        </div>
    );
}

export default App;
