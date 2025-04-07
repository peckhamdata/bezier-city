import React, { useEffect, useMemo, useRef, useState } from "react";

const API_BASE_URL = "http://127.0.0.1:8000";

// ==== Types ====

interface Point {
  x: number;
  y: number;
}

interface Segment {
  start: Point;
  end: Point;
}

interface Street {
  id: number;
  segments: Segment[];
}

interface NPC {
  name: string;
  street_id: number;
  x_position: number;
  dialogue: string[];
}

type PlayerPosition = {
  x: number;
  y: number;
};

type StreetCanvasProps = {
  playerPosition: PlayerPosition;
};

// ==== Utility Function ====

function calculateWorldPositionOnStreet(street: Street, distance: number): Point {
  let remaining = distance;
  for (const segment of street.segments) {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const segmentLength = Math.sqrt(dx * dx + dy * dy);

    if (remaining <= segmentLength) {
      const ratio = remaining / segmentLength;
      return {
        x: segment.start.x + dx * ratio,
        y: segment.start.y + dy * ratio,
      };
    }

    remaining -= segmentLength;
  }

  const lastSegment = street.segments[street.segments.length - 1];
  return lastSegment.end;
}

// ==== Component ====

const StreetCanvas = ({ playerPosition }: StreetCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streets, setStreets] = useState<Street[]>([]);
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStateRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });

  // 🚀 Fetch streets ONCE on mount
  useEffect(() => {
    fetch(`${API_BASE_URL}/streets`)
      .then((response) => response.json())
      .then((data: Street[]) => setStreets(data))
      .catch(console.error);
  }, []);

  // 🚀 Poll NPCs separately every 200ms
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/npcs`)
        .then((res) => res.json())
        .then(setNpcs)
        .catch(console.error);
    }, 200);

    return () => clearInterval(interval);
  }, []);

  // 🚀 Calculate player world position
  const worldPosition = useMemo(() => {
    const street = streets.find(s => s.id === 1); // Assume player is on street 1
    if (!street) return { x: 0, y: 0 };
    return calculateWorldPositionOnStreet(street, playerPosition.x);
  }, [playerPosition, streets]);

  // 🚀 Draw scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !streets.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    streets.forEach(({ segments }) => {
      segments.forEach(({ start, end }) => {
        [start, end].forEach(({ x, y }) => {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });
      });
    });

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    const scale = height / bboxHeight * 0.9 * zoom;
    const xOffset = (width - bboxWidth * scale) / 2 - minX * scale + panOffset.x;
    const yOffset = (height - bboxHeight * scale) / 2 - minY * scale + panOffset.y;

    ctx.clearRect(0, 0, width, height);

    // Draw streets
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    streets.forEach(({ segments }) => {
      segments.forEach(({ start, end }) => {
        ctx.beginPath();
        ctx.moveTo(start.x * scale + xOffset, start.y * scale + yOffset);
        ctx.lineTo(end.x * scale + xOffset, end.y * scale + yOffset);
        ctx.stroke();
      });
    });

    // Draw player
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
      const npcPos = calculateWorldPositionOnStreet(street, npc.x_position);

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

  }, [streets, worldPosition, npcs, zoom, panOffset]);

  // 🚀 Pan handling
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
