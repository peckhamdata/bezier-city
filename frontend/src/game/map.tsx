import React, { useEffect, useMemo, useRef, useState } from "react";
import { EventBus } from './EventBus';

const API_BASE_URL = "http://127.0.0.1:9000";

// ==== Types ====

interface Point {
  x: number;
  y: number;
}

interface Street {
  id: number;
  edge_ids: number[];
  edges: Edge[];
  length: number;
}

interface Cell {
  id: number;
  coords: Point[];
}

interface NPC {
  id: number;
  name: string;
  current_edge_id: number;
  progress: number;
  speed: number;
  direction: number;
  dialogue: string[];
}

interface Edge {
  id: number;
  geometry: number[][];
  street_id: number;
  junction_ids: number[];
}

type PlayerPosition = {
  x: number;
  y: number;
  streetId?: number;
  streetPosition?: number;
};

type StreetCanvasProps = {
  playerPosition: PlayerPosition;
};

// ==== Utility Functions ====

function calculateWorldPositionOnStreet(street: Street, distanceRatio: number): Point {
  if (!street.edges || street.edges.length === 0) {
    return { x: 0, y: 0 };
  }
  
  // Calculate total street length first
  let totalLength = 0;
  for (const edge of street.edges) {
    const start = edge.geometry[0];
    const end = edge.geometry[1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const edgeLength = Math.sqrt(dx * dx + dy * dy);
    totalLength += edgeLength;
  }
  
  // Convert ratio to actual distance
  let remaining = distanceRatio * totalLength;
  for (const edge of street.edges) {
    const start = edge.geometry[0];
    const end = edge.geometry[1];
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const edgeLength = Math.sqrt(dx * dx + dy * dy);

    if (remaining <= edgeLength) {
      const ratio = remaining / edgeLength;
      return {
        x: start[0] + dx * ratio,
        y: start[1] + dy * ratio,
      };
    }

    remaining -= edgeLength;
  }

  const lastEdge = street.edges[street.edges.length - 1];
  return { x: lastEdge.geometry[1][0], y: lastEdge.geometry[1][1] };
}

function calculateWorldPositionOnEdge(edge: Edge, progress: number): Point {
  const geometry = edge.geometry;
  if (geometry.length < 2) return { x: 0, y: 0 };
  
  // Progress is 0-1, interpolate between start and end of edge
  const start = geometry[0];
  const end = geometry[geometry.length - 1];
  
  return {
    x: start[0] + (end[0] - start[0]) * progress,
    y: start[1] + (end[1] - start[1]) * progress
  };
}

function randomNeonColor() {
  const colors = ['#39FF14', '#FF073A', '#0FF0FC', '#F800FF', '#FE019A', '#FC6C85', '#DFFF00', '#FF5F1F', '#08F7FE', '#B10DC9'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ==== Component ====

const StreetCanvas = ({ playerPosition }: StreetCanvasProps) => {
  const staticCanvasRef = useRef<HTMLCanvasElement>(null);
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [streets, setStreets] = useState<Street[]>([]);
  const [cells, setCells] = useState<Cell[]>([]);         // <== new state
  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const panStateRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [mapBounds, setMapBounds] = useState<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

  // === Handle container resize ===
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        // Use offsetWidth/Height to get the actual content size
        setCanvasSize({ 
          width: containerRef.current.offsetWidth, 
          height: containerRef.current.offsetHeight 
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // === Fetch streets once ===
  useEffect(() => {
    fetch(`${API_BASE_URL}/streets`)
      .then((res) => res.json())
      .then((data: Street[]) => setStreets(data))
      .catch(console.error);
  }, []);

  // === Fetch cells once ===
  useEffect(() => {
    fetch(`${API_BASE_URL}/cells`)
      .then((res) => res.json())
      .then((data: Cell[]) => setCells(data))
      .catch(console.error);
  }, []);

  // === Fetch edges once ===
  useEffect(() => {
    fetch(`${API_BASE_URL}/edges`)
      .then((res) => res.json())
      .then((data: Edge[]) => setEdges(data))
      .catch(console.error);
  }, []);

  // === Poll NPCs separately every 200ms ===
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_BASE_URL}/npcs`)
        .then((res) => res.json())
        .then((npcsData) => {
          setNpcs(npcsData);
          // Only emit if we have all the data needed
          if (streets.length > 0 && edges.length > 0) {
            EventBus.emit('npcUpdate', {
              npcs: npcsData,
              streets: streets,
              edges: edges
            });
          }
        })
        .catch(console.error);
    }, 200);

    return () => clearInterval(interval);
  }, [streets, edges]); // Add dependencies so this updates when streets/edges are loaded

  // === Handle street switch requests from game ===
  useEffect(() => {
    const handleStreetSwitch = (data: { streetId: number }) => {
      console.log(`Map received street switch request to street ${data.streetId}`);
      
      // Immediately emit updated data for the new street
      if (streets.length > 0 && edges.length > 0) {
        EventBus.emit('npcUpdate', {
          npcs: npcs,
          streets: streets,
          edges: edges
        });
      }
    };

    EventBus.on('requestStreetSwitch', handleStreetSwitch);
    
    return () => {
      EventBus.off('requestStreetSwitch', handleStreetSwitch);
    };
  }, [npcs, streets, edges]);

  // === Calculate world position of player ===
  const worldPosition = useMemo(() => {
    // Use the street ID from player position, fallback to street 0
    const streetId = playerPosition.streetId ?? 0;
    const street = streets.find(s => s.id === streetId);
    if (!street) {
      console.log(`Street ${streetId} not found in map data`);
      return { x: 0, y: 0 };
    }
    
    // Use streetPosition if available, otherwise fall back to x
    const position = playerPosition.streetPosition ?? playerPosition.x;
    const worldPos = calculateWorldPositionOnStreet(street, position);
    
    // Debug logging
    if (Math.random() < 0.1) { // Occasional logging
      console.log(`Map: Player on street ${streetId}, position ${position.toFixed(3)} -> world (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`);
    }
    
    return worldPos;
  }, [playerPosition, streets]);

  useEffect(() => {
    const canvas = staticCanvasRef.current;
    if (!canvas || !streets.length || !cells.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  
    const width = canvas.width;
    const height = canvas.height;
  
    // Compute bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    streets.forEach(({ edges }) => {
      if (edges) {
        edges.forEach((edge) => {
          edge.geometry.forEach((point) => {
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
          });
        });
      }
    });
  
    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    
    // Save bounds if not already saved
    if (!mapBounds) {
      setMapBounds({ minX, minY, maxX, maxY });
    }
    
    const scale = height / bboxHeight * 0.9 * zoom;
    const xOffset = (width - bboxWidth * scale) / 2 - minX * scale + panOffset.x;
    const yOffset = (height - bboxHeight * scale) / 2 - minY * scale + panOffset.y;
  
    ctx.clearRect(0, 0, width, height);
  
    // Draw Cells
    ctx.lineWidth = 1;
    cells.forEach((cell) => {
      ctx.strokeStyle = randomNeonColor();
      ctx.beginPath();
      cell.coords.forEach((point, index) => {
        const x = point.x * scale + xOffset;
        const y = point.y * scale + yOffset;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.stroke();
    });
  
    // Draw Streets
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 2;
    streets.forEach(({ edges }) => {
      if (edges) {
        edges.forEach((edge) => {
          const start = edge.geometry[0];
          const end = edge.geometry[1];
          ctx.beginPath();
          ctx.moveTo(start[0] * scale + xOffset, start[1] * scale + yOffset);
          ctx.lineTo(end[0] * scale + xOffset, end[1] * scale + yOffset);
          ctx.stroke();
        });
      }
    });
  
  }, [streets, cells, zoom, panOffset]);

  useEffect(() => {

    const canvas = dynamicCanvasRef.current;
    if (!canvas || !streets.length || !edges.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
  
    const width = canvas.width;
    const height = canvas.height;
  
    // Same bbox math
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    streets.forEach(({ edges }) => {
      if (edges) {
        edges.forEach((edge) => {
          edge.geometry.forEach((point) => {
            minX = Math.min(minX, point[0]);
            minY = Math.min(minY, point[1]);
            maxX = Math.max(maxX, point[0]);
            maxY = Math.max(maxY, point[1]);
          });
        });
      }
    });
  
    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;
    
    // Save bounds if not already saved
    if (!mapBounds) {
      setMapBounds({ minX, minY, maxX, maxY });
    }
    
    const scale = height / bboxHeight * 0.9 * zoom;
    const xOffset = (width - bboxWidth * scale) / 2 - minX * scale + panOffset.x;
    const yOffset = (height - bboxHeight * scale) / 2 - minY * scale + panOffset.y;
  
    ctx.clearRect(0, 0, width, height);
  
    // Draw player (using the already calculated worldPosition from the useMemo)
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
      const edge = edges.find((e) => e.id === npc.current_edge_id);
      if (!edge) return;
      
      const npcPos = calculateWorldPositionOnEdge(edge, npc.progress);
      
      ctx.beginPath();
      ctx.arc(
        npcPos.x * scale + xOffset,
        npcPos.y * scale + yOffset,
        6,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.closePath();
      
      // Draw NPC name
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        npc.name,
        npcPos.x * scale + xOffset,
        npcPos.y * scale + yOffset - 10
      );
      ctx.fillStyle = "gold"; // Reset color for next NPC
    });
  
  }, [worldPosition, playerPosition, npcs, streets, edges, zoom, panOffset]);
  

  // === Pan and Zoom handling ===
  useEffect(() => {
    const canvas = staticCanvasRef.current;
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

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Zoom factor (negative deltaY = zoom in, positive = zoom out)
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      
      setZoom(prevZoom => {
        const newZoom = Math.max(1, Math.min(100, prevZoom * zoomFactor));
        
        if (mapBounds) {
          const width = canvas.width;
          const height = canvas.height;
          
          // Calculate current and new scales
          const bboxHeight = mapBounds.maxY - mapBounds.minY;
          const bboxWidth = mapBounds.maxX - mapBounds.minX;
          const oldScale = height / bboxHeight * 0.9 * prevZoom;
          const newScale = height / bboxHeight * 0.9 * newZoom;
          
          // Get current pan offset
          setPanOffset(prev => {
            // Calculate world coordinates at mouse position with current zoom
            const oldXOffset = (width - bboxWidth * oldScale) / 2 - mapBounds.minX * oldScale + prev.x;
            const oldYOffset = (height - bboxHeight * oldScale) / 2 - mapBounds.minY * oldScale + prev.y;
            const worldX = (mouseX - oldXOffset) / oldScale;
            const worldY = (mouseY - oldYOffset) / oldScale;
            
            // Calculate new pan offset to keep the same world point at mouse position
            const newXOffset = (width - bboxWidth * newScale) / 2 - mapBounds.minX * newScale;
            const newYOffset = (height - bboxHeight * newScale) / 2 - mapBounds.minY * newScale;
            
            return {
              x: mouseX - worldX * newScale - newXOffset,
              y: mouseY - worldY * newScale - newYOffset
            };
          });
        }
        
        return newZoom;
      });
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("wheel", handleWheel);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%",
      width: "100%",
      overflow: "hidden"
    }}>
      <p style={{ 
        margin: "10px",
        flexShrink: 0
      }}>
        Player: {((playerPosition.streetPosition ?? 0) * 100).toFixed(1)}% of street {playerPosition.streetId ?? 0} — World X: {worldPosition.x.toFixed(2)}, Y:{" "}
        {worldPosition.y.toFixed(2)}
      </p>
      <div style={{ 
        marginBottom: "10px", 
        marginLeft: "10px",
        flexShrink: 0
      }}>
        <label style={{ display: "flex", alignItems: "center", width: "300px" }}>
          <span>Zoom: {zoom.toFixed(2)}x</span>
          <input
            type="range"
            min="1"
            max="100"
            step="0.1"
            value={zoom}
            onChange={(e) => {
              const newZoom = parseFloat(e.target.value);
              
              if (containerRef.current && mapBounds) {
                const width = containerRef.current.offsetWidth;
                const height = containerRef.current.offsetHeight;
                const centerX = width / 2;
                const centerY = height / 2;
                
                // Calculate current scale and offsets
                const bboxHeight = mapBounds.maxY - mapBounds.minY;
                const bboxWidth = mapBounds.maxX - mapBounds.minX;
                const oldScale = height / bboxHeight * 0.9 * zoom;
                const newScale = height / bboxHeight * 0.9 * newZoom;
                
                // Calculate world coordinates at view center with current zoom
                const oldXOffset = (width - bboxWidth * oldScale) / 2 - mapBounds.minX * oldScale + panOffset.x;
                const oldYOffset = (height - bboxHeight * oldScale) / 2 - mapBounds.minY * oldScale + panOffset.y;
                const worldX = (centerX - oldXOffset) / oldScale;
                const worldY = (centerY - oldYOffset) / oldScale;
                
                // Calculate new pan offset to keep the same world point at center
                const newXOffset = (width - bboxWidth * newScale) / 2 - mapBounds.minX * newScale;
                const newYOffset = (height - bboxHeight * newScale) / 2 - mapBounds.minY * newScale;
                
                setPanOffset({
                  x: centerX - worldX * newScale - newXOffset,
                  y: centerY - worldY * newScale - newYOffset
                });
              }
              
              setZoom(newZoom);
            }}
            style={{ 
              marginLeft: "10px", 
              flex: 1
            }}
          />
        </label>
      </div>
      <div ref={containerRef} style={{
        position: "relative",
        width: "100%",
        flex: 1,
        overflow: "hidden"
        }}>
        <canvas
          ref={staticCanvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            border: "1px solid white",
            background: "black",
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            zIndex: 0,  // <-- Behind
          }}
        />
        <canvas
          ref={dynamicCanvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          style={{
            border: "1px solid white",
            background: "transparent",
            position: "absolute",
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            zIndex: 1,  // <-- On top
            pointerEvents: "none",  // <-- Mouse passes through
          }}
        />
    </div>
    </div>
  );
};

export default StreetCanvas;
