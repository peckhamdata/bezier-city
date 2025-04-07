from typing import List
from bezier_city_backend.models.npc import NPC
from pathlib import Path
from fastapi import FastAPI, HTTPException
from bezier_city_backend.buildings import fill_street_with_buildings, render_street 
from bezier_city_backend.models.city import CityModel, Block, Street, Edge, Cell, StreetSegmentsResponse, Segment, Point
import json
import math

# Load the city data from file
with open("bezier_city.json", "r") as f:
    city_data = json.load(f)

def bezier_point(t, P0, P1, P2):
    """Calculate a point on a quadratic Bézier curve."""
    return (
        (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0],
        (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1]
    )

def bezier_length(P0, P1, P2, num_samples=50):
    """Approximates the length of a quadratic Bézier curve by sampling points."""
    length = 0
    points = [bezier_point(t, P0, P1, P2) for t in [i / num_samples for i in range(num_samples + 1)]]
    
    for i in range(len(points) - 1):
        length += math.dist(points[i], points[i + 1])
    
    return math.floor(length), points

def find_junction_offsets(junctions, points):
    """Find the distance along the curve for each junction, removing duplicates."""
    distances = []
    total_length = 0
    
    for i in range(len(points) - 1):
        segment_length = math.dist(points[i], points[i + 1])
        for j in junctions:
            if math.isclose(j["x"], points[i][0], abs_tol=5) and math.isclose(j["y"], points[i][1], abs_tol=5):
                distances.append(math.floor(total_length))
        total_length += segment_length

    return sorted(distances)

################################################################################

import asyncio
from contextlib import asynccontextmanager

# 🌀 Lifespan context to handle startup/shutdown logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    async def update_npc_positions():
        while True:
            for npc in npcs:
                npc.x_position += npc.velocity
                # TODO: Replace with real street lookup
                street_length = 100
                if npc.x_position > street_length or npc.x_position < 0:
                    npc.velocity *= -1
                    npc.x_position += npc.velocity
            await asyncio.sleep(0.1)

    task = asyncio.create_task(update_npc_positions())
    yield
    task.cancel()

################################################################################

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost",
    "http://localhost:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
################################################################################

# Load your city once at startup
with open('bezier_city_full.json') as f:
    city_data = json.load(f)


city = CityModel(**city_data)

################################################################################
# Routes

@app.get("/blocks", response_model=List[Block])
async def get_blocks():
    return city.blocks

@app.get("/blocks/{block_id}", response_model=Block)
async def get_block(block_id: int):
    for block in city.blocks:
        if block.id == block_id:
            return block
    raise HTTPException(status_code=404, detail="Block not found")

@app.get("/streets", response_model=List[StreetSegmentsResponse])
async def get_streets():
    response = []
    for street in city.streets:
        segments = street.to_segments(city.edges)  # <--- build segments from edges
        response.append(StreetSegmentsResponse(id=street.id, segments=segments))
    return response

@app.get("/street/{street_id}", response_model=StreetSegmentsResponse)
async def get_street(street_id: int):
    for street in city.streets:
        if street.id == street_id:
            raw_segments = street.to_segments(city.edges)
            segments = [
                Segment(
                    start=Point(x=seg["start"]["x"], y=seg["start"]["y"]),
                    end=Point(x=seg["end"]["x"], y=seg["end"]["y"])
                ) for seg in raw_segments
            ]
            return StreetSegmentsResponse(id=street.id, segments=segments)
    raise HTTPException(status_code=404, detail="Street not found")

@app.get("/street/{street_id}/ascii")
def get_ascii_street(street_id: int):
    """Retrieve an ASCII representation of the street with junctions only."""
    street = get_street(street_id)
    filled_street = fill_street_with_buildings(street)

    return {"id": street_id, "ascii": render_street(street, filled_street)}

@app.get("/edges", response_model=List[Edge])
async def get_edges():
    return city.edges

@app.get("/edges/{edge_id}", response_model=Edge)
async def get_edge(edge_id: int):
    for edge in city.edges:
        if edge.id == edge_id:
            return edge
    raise HTTPException(status_code=404, detail="Edge not found")

@app.get("/cells", response_model=List[Cell])
async def get_cells():
    cells = []
    for block in city.blocks:
        cells.extend(block.cells)
    return cells

@app.get("/cells/{cell_id}", response_model=Cell)
async def get_cell(cell_id: int):
    for block in city.blocks:
        for cell in block.cells:
            if cell.id == cell_id:
                return cell
    raise HTTPException(status_code=404, detail="Cell not found")

################################################################################

# Sample building data structure
BUILDINGS = {
    "A": {
        "name": "Skyscraper",
        "description": "A tall modern skyscraper",
        "assets": {
            0: "https://example.com/assets/buildings/A/wireframe.txt",
            1: "assets/01_block.png",
            2: "https://example.com/assets/buildings/A/bitmap.png",
            3: "https://example.com/assets/buildings/A/polygon.obj"
        }
    },
    "B": {
        "name": "Warehouse",
        "description": "A large industrial warehouse",
        "assets": {
            0: "https://example.com/assets/buildings/B/wireframe.txt",
            1: "assets/01_office.png",
            2: "https://example.com/assets/buildings/B/bitmap.png",
            3: "https://example.com/assets/buildings/B/polygon.obj"
        }
    },
    "C": {
        "name": "Brutal",
        "description": "Brutalist thing",
        "assets": {
            0: "https://example.com/assets/buildings/A/wireframe.txt",
            1: "assets/01_brut.png",
            2: "https://example.com/assets/buildings/A/bitmap.png",
            3: "https://example.com/assets/buildings/A/polygon.obj"
        }
    },
    "D": {
        "name": "Warehouse",
        "description": "A large industrial warehouse",
        "assets": {
            0: "https://example.com/assets/buildings/B/wireframe.txt",
            1: "assets/01_glass.png",
            2: "https://example.com/assets/buildings/B/bitmap.png",
            3: "https://example.com/assets/buildings/B/polygon.obj"
        }
    },
    "E": {
        "name": "Warehouse",
        "description": "A large industrial warehouse",
        "assets": {
            0: "https://example.com/assets/buildings/B/wireframe.txt",
            1: "assets/01_honeycomb.png",
            2: "https://example.com/assets/buildings/B/bitmap.png",
            3: "https://example.com/assets/buildings/B/polygon.obj"
        }
    }
}

@app.get("/building/{building_id}")
def get_building_info(building_id: str):
    building = BUILDINGS.get(building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    return {
        "id": building_id,
        "name": building["name"],
        "description": building["description"],
        "assets": building["assets"]
    }

@app.get("/building/{building_id}/{level}")
def get_building_asset(building_id: str, level: int):
    building = BUILDINGS.get(building_id)
    if not building:
        raise HTTPException(status_code=404, detail="Building not found")
    
    asset_url = building["assets"].get(level)
    if asset_url is None:
        raise HTTPException(status_code=404, detail="Asset level not found")
    
    return {
        "id": building_id,
        "level": level,
        "asset_url": asset_url
    }

@app.get("/buildings")
def get_all_buildings():
    return BUILDINGS

################################################################################

NPC_FILE = Path("bezier_city_backend/data/npc.json")

npcs: list[NPC] = []  # initialized on startup

def load_npcs() -> List[NPC]:
    with NPC_FILE.open() as f:
        data = json.load(f)
        return [NPC(**npc) for npc in data]

# Route: GET /npcs – get all NPCs
@app.get("/npcs", response_model=List[NPC])
def get_npcs():
    return npcs

# Route: GET /npcs/{name} – get an NPC by name
@app.get("/npc/{name}", response_model=NPC)
def get_npc_by_name(name: str):
    for npc in npcs:
        if npc.name.lower() == name.lower():
            return npc
    raise HTTPException(status_code=404, detail=f"NPC '{name}' not found")

if __name__ == "__main__":

    npcs = load_npcs()

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

