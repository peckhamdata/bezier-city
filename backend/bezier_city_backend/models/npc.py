from pydantic import BaseModel, Field
from typing import List
from bezier_city_backend.models.city import CityModel
import random

def distance(a: List[float], b: List[float]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5

class NPC(BaseModel):

    id: int
    name: str

    current_edge_id: int
    progress: float  # 0.0 = start, 1.0 = end
    speed: float  # units per second (how fast they walk)
    direction: int = 1  # 1 = forward (0->1), -1 = backward (1->0)

    dialogue: List[str] = Field(default_factory=list)

    def update(self, delta_time: float, city: CityModel):
        edge = city.get_edge(self.current_edge_id)
        start, end = edge.geometry
        edge_length = distance(start, end)

        # Move based on direction
        progress_delta = (self.speed * delta_time * self.direction) / edge_length
        self.progress += progress_delta

        # Check if we've reached a junction
        if self.progress >= 1.0 or self.progress <= 0.0:
            # Determine which junction we've reached
            if self.progress >= 1.0:
                current_junction_id = edge.junction_ids[1]
                self.progress = 1.0
            else:  # progress <= 0.0
                current_junction_id = edge.junction_ids[0]
                self.progress = 0.0
                
            junction = city.get_junction(current_junction_id)

            # Avoid going back the same edge
            possible_edges = [eid for eid in junction.edge_ids if eid != self.current_edge_id]

            if not possible_edges:
                # Turn around on the same edge
                self.direction *= -1
                return

            # Pick a new edge
            next_edge_id = random.choice(possible_edges)
            next_edge = city.get_edge(next_edge_id)
            
            # Determine which end of the new edge connects to current junction
            # and set initial progress and direction accordingly
            if next_edge.junction_ids[0] == current_junction_id:
                # Start from junction_ids[0], move toward junction_ids[1]
                self.progress = 0.0
                self.direction = 1
            else:
                # Start from junction_ids[1], move toward junction_ids[0]
                self.progress = 1.0
                self.direction = -1
                
            self.current_edge_id = next_edge_id

    def get_position(self, city: CityModel) -> List[float]:
        edge = city.get_edge(self.current_edge_id)
        start, end = edge.geometry
        x = start[0] + self.progress * (end[0] - start[0])
        y = start[1] + self.progress * (end[1] - start[1])
        return [x, y]