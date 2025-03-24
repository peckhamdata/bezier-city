import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

interface Point {
  x: number;
  y: number;
}

interface Geometry {
  start: Point;
  control: Point;
  end: Point;
}

interface Junction {
  x: number;
  y: number;
}

interface Street {
  id: number;
  length: number;
  type: string
  geometry: Geometry;
  junctions: Junction[];
}

type PlayerPosition = {
  x: number;
  y: number;
};

type StreetCanvasProps = {
  playerPosition: PlayerPosition;
};

interface NPC {
  name: string;
  street_id: number;
  x_position: number;
  dialogue: string[];
}

function calculateWorldPosition(playerX: number, street: Street): Point {
  let t = playerX / street.length;
  t = Math.max(0, Math.min(1, t));

  if (street.type === "bezier"){
    const { start, control, end } = street.geometry;

    const x =
      (1 - t) * (1 - t) * start.x +
      2 * (1 - t) * t * control.x +
      t * t * end.x;
  
    const y =
      (1 - t) * (1 - t) * start.y +
      2 * (1 - t) * t * control.y +
      t * t * end.y;
  
    return { x, y };
  } else {
    console.log("Unsupported street type", street.type, street.id);
    return { x: 0, y: 0 };
  }
}

const StreetCanvas = ({ playerPosition }: StreetCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streets, setStreets] = useState<Street[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [zoom, setZoom] = useState(1); // Default zoom multiplier
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStateRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/npcs`)
        .then((res) => res.json())
        .then(setNpcs)
        .catch(console.error);
    }, 200); // 🔁 200ms is a good starting point
  
    return () => clearInterval(interval);
  }, []);
  
  // Fetch street data on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/streets`)
      .then((response) => response.json())
      .then((data: { streets: number[] }) => {
        const streetIds = data.streets;
        return Promise.all(
          streetIds.map((id) =>
            fetch(`${API_BASE_URL}/street/${id}`)
              .then((response) => response.json())
              .catch((error) => console.error(`Error fetching street ${id}:`, error))
          )
        );
      })
      .then((streetsData) => {
        setStreets(streetsData.filter(Boolean));
      })
      .catch((error) => console.error("Error fetching street list:", error));
  }, []);

  // Memoize worldPosition to avoid loops
  const worldPosition = useMemo(() => {
    if (!streets.length) return { x: 0, y: 0 };
    return calculateWorldPosition(playerPosition.x, streets[1]); // Assuming street ID 1
  }, [playerPosition, streets]);

  // Draw canvas when position or streets change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !streets.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Find bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    streets.forEach(({ type, geometry }) => {
      if (type === "bezier") {
        const { start, control, end } = geometry;
        [start, control, end].forEach(({ x, y }) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      }
    });

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;

    const scale = height / bboxHeight * 0.9 * zoom;
    const xOffset = (width - bboxWidth * scale) / 2 - minX * scale + panOffset.x;
    const yOffset = (height - bboxHeight * scale) / 2 - minY * scale + panOffset.y;

    ctx.clearRect(0, 0, width, height);

    const bezierStreets = streets.filter(street => street.type === "bezier");
    bezierStreets.forEach((street) => {
      const { start, control, end } = street.geometry;

        // Draw curve
        ctx.beginPath();
        ctx.moveTo(start.x * scale + xOffset, start.y * scale + yOffset);
        ctx.quadraticCurveTo(
          control.x * scale + xOffset,
          control.y * scale + yOffset,
          end.x * scale + xOffset,
          end.y * scale + yOffset
        );
        ctx.strokeStyle = "cyan";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw junctions
        ctx.fillStyle = "red";
        street.junctions.forEach((junction) => {
          ctx.beginPath();
          ctx.arc(
            junction.x * scale + xOffset,
            junction.y * scale + yOffset,
            1,
            0,
            Math.PI * 2
          );
          ctx.fill();
        });
    });

    const bresenhamStreets = streets.filter(street => street.type === "bresenham");
    bresenhamStreets.forEach((street) => {
      const { start, end } = street.geometry;

        // Draw curve
        ctx.beginPath();
        ctx.moveTo(start.x * scale + xOffset, start.y * scale + yOffset);
        ctx.lineTo(end.x * scale + xOffset, end.y * scale + yOffset);
        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.stroke();
    });


    // Draw turquoise player dot
    ctx.beginPath();
    ctx.arc(
      worldPosition.x * scale + xOffset,
      worldPosition.y * scale + yOffset,
      5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "turquoise";
    ctx.fill();
    ctx.closePath();

    // Draw NPCs
    ctx.fillStyle = "gold";
    npcs.forEach((npc) => {
      const street = streets.find((s) => s.id === npc.street_id);
      if (!street) return;

      const npcPos = calculateWorldPosition(npc.x_position, street);
      ctx.beginPath();
      ctx.arc(
        npcPos.x * scale + xOffset,
        npcPos.y * scale + yOffset,
        5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.closePath();
    });

  }, [streets, worldPosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
  
    const handleMouseDown = (e: MouseEvent) => {
      panStateRef.current.isDragging = true;
      panStateRef.current.lastX = e.clientX;
      panStateRef.current.lastY = e.clientY;
    };
  
    const handleMouseMove = (e: MouseEvent) => {
      if (!panStateRef.current.isDragging) return;
  
      const dx = e.clientX - panStateRef.current.lastX;
      const dy = e.clientY - panStateRef.current.lastY;
  
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  
      panStateRef.current.lastX = e.clientX;
      panStateRef.current.lastY = e.clientY;
    };
  
    const handleMouseUp = () => {
      panStateRef.current.isDragging = false;
    };
  
    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  
    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);
  

  return (
    <div>
      <p>
        Player scene X: {playerPosition.x.toFixed(2)} — World X: {worldPosition.x.toFixed(2)}, Y:{" "}
        {worldPosition.y.toFixed(2)}
      </p>
      <div style={{ marginBottom: "10px" }}>
        <label>
          Zoom: {zoom.toFixed(2)}x
          <input
            type="range"
            min="1"
            max="100"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            style={{ marginLeft: "10px", verticalAlign: "middle" }}
          />
        </label>
      </div>
      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        style={{ border: "1px solid white", background: "black" }}
      />
    </div>
  );
};

export default StreetCanvas;
