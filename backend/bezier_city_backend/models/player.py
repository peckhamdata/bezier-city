from pydantic import BaseModel
from typing import List
from .city import CityModel

def calculate_distance(a: List[float], b: List[float]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5

class Player(BaseModel):
    id: str = "player"  # Single player instance
    name: str = "Player"
    
    current_edge_id: int
    progress: float  # 0.0 = start, 1.0 = end
    direction: int = 1  # 1 = forward (0->1), -1 = backward (1->0)
    
    def get_position(self, city: CityModel) -> List[float]:
        """Get the player's world position"""
        edge = city.get_edge(self.current_edge_id)
        start, end = edge.geometry
        x = start[0] + self.progress * (end[0] - start[0])
        y = start[1] + self.progress * (end[1] - start[1])
        return [x, y]
    
    def get_street_id(self, city: CityModel) -> int:
        """Get the street ID the player is currently on"""
        edge = city.get_edge(self.current_edge_id)
        return edge.street_id
    
    def move(self, distance: float, city: CityModel):
        """Move the player along the current edge by a given distance"""
        edge = city.get_edge(self.current_edge_id)
        start, end = edge.geometry
        edge_length = calculate_distance(start, end)
        
        # Convert distance to progress change based on direction
        progress_delta = (distance * self.direction) / edge_length
        new_progress = self.progress + progress_delta
        
        # Clamp to edge bounds (don't auto-navigate junctions for player)
        self.progress = max(0.0, min(1.0, new_progress))
    
    def set_position_on_street(self, street_id: int, position: float, city: CityModel):
        """Set the player's position on a specific street (used for game initialization)"""
        # Find the first edge of the given street
        for edge in city.edges:
            if edge.street_id == street_id:
                self.current_edge_id = edge.id
                self.progress = max(0.0, min(1.0, position))
                self.direction = 1
                break