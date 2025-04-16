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

    dialogue: List[str] = Field(default_factory=list)

    def update(self, delta_time: float, city: CityModel):
        edge = city.get_edge(self.current_edge_id)
        start, end = edge.geometry
        edge_length = distance(start, end)

        self.progress += (self.speed * delta_time) / edge_length

        if self.progress >= 1.0:
            # Arrived at junction
            next_junction_id = edge.junction_ids[1]  # assume direction for now
            junction = city.get_junction(next_junction_id)

            # Avoid going back the same edge
            possible_edges = [eid for eid in junction.edge_ids if eid != self.current_edge_id]

            if not possible_edges:
                self.progress = 0.0  # turn around?
                return

            next_edge_id = random.choice(possible_edges)
            self.current_edge_id = next_edge_id
            self.progress = 0.0

    def get_position(self, city: CityModel) -> List[float]:
        edge = city.get_edge(self.current_edge_id)
        start, end = edge.geometry
        x = start[0] + self.progress * (end[0] - start[0])
        y = start[1] + self.progress * (end[1] - start[1])
        return [x, y]