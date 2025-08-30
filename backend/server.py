from typing import List
from bezier_city_backend.models.npc import NPC
from bezier_city_backend.models.player import Player
from pathlib import Path
from fastapi import FastAPI, HTTPException
from bezier_city_backend.buildings import fill_street_with_buildings, render_street 
from bezier_city_backend.models.city import CityModel, Block, Street, Edge, Cell, CellResponse, StreetSegmentsResponse, Segment, Point
import json
import math
import sys
import time

# Load the city data from file
with open("bezier_city.json", "r") as f:
    city_data = json.load(f)

################################################################################

import asyncio
from contextlib import asynccontextmanager

# NPC setup
NPC_FILE = Path("bezier_city_backend/data/npc.json")
npcs: List[NPC] = []  # initialized on startup

def load_npcs() -> List[NPC]:
    with NPC_FILE.open() as f:
        data = json.load(f)
        return [NPC(**npc) for npc in data]

# Player setup
PLAYER_FILE = Path("player_data.json")
player: Player = None  # initialized on startup

def load_player() -> Player:
    with PLAYER_FILE.open() as f:
        data = json.load(f)
        return Player(**data)

def save_player(player_data: Player):
    with PLAYER_FILE.open('w') as f:
        json.dump(player_data.dict(), f, indent=2)

# 🌀 Lifespan context to handle startup/shutdown logic
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load NPCs and player on startup
    global npcs, player
    npcs = load_npcs()
    player = load_player()
    
    async def update_npc_positions():
        while True:
            for npc in npcs:
                npc.update(0.1, city)  # 0.1 second delta time
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


@app.get("/cells", response_model=List[CellResponse])
async def get_cells():
    cells = []
    for block in city.blocks:
        for cell_data in block.cells:
            cell = CellResponse(
                id=cell_data.id,
                coords=[Point(x=pt[0], y=pt[1]) for pt in cell_data.coords]
            )
            cells.append(cell)
    return cells


@app.get("/cells/{cell_id}", response_model=List[CellResponse])
async def get_cell(cell_id: int):
    for block in city.blocks:
        for cell in block.cells:
            if cell.id == cell_id:
                return cell.to_points()
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

################################################################################

# Route: GET /player – get player data
@app.get("/player", response_model=Player)
def get_player():
    return player

# Route: POST /player – update player data
@app.post("/player", response_model=Player)
def update_player(player_data: Player):
    global player
    player = player_data
    save_player(player_data)
    return player

# Route: POST /player/move – move player by distance
@app.post("/player/move")
def move_player(distance: float):
    global player
    player.move(distance, city)
    save_player(player)
    return {"success": True, "player": player}

# Route: GET /player/position – get player world position
@app.get("/player/position")
def get_player_position():
    position = player.get_position(city)
    street_id = player.get_street_id(city)
    return {
        "position": position,
        "street_id": street_id,
        "current_edge_id": player.current_edge_id,
        "progress": player.progress
    }

def format_position(pos: list[float]) -> str:
    return f"({pos[0]:.1f}, {pos[1]:.1f})"

def run_simulation(npcs: list[NPC], city: CityModel, steps: int = 100, delta_time: float = 0.1):
    for _ in range(steps):
        for npc in npcs:
            npc.update(delta_time, city)

        # Build output line
        line = ' | '.join(
            f"NPC {npc.id}: edge {npc.current_edge_id} @ {format_position(npc.get_position(city))}:{npc.progress}"
            for npc in npcs
        )

        # Print on same line
        print(f"\r{line}", end='')
        sys.stdout.flush()

        time.sleep(delta_time)

    print()  # newline at the end

if __name__ == "__main__":

    npcs = load_npcs()

    # run_simulation(npcs, city, steps=1000, delta_time=0.1)
 
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    # import pdb; pdb.set_trace()
    # pass
