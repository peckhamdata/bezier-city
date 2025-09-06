from pydantic import BaseModel, field_validator, model_validator
from typing import List, Dict


class Point(BaseModel):
    x: float
    y: float

class Segment(BaseModel):
    start: Point
    end: Point

class StreetSegmentsResponse(BaseModel):
    id: int
    segments: List[Segment]


class Edge(BaseModel):
    id: int
    geometry: List[List[float]]  # two points: start and end
    street_id: int
    junction_ids: List[int]

class Junction(BaseModel):
    id: int
    coords: List[Point]  # [x, y]
    edge_ids: List[int]  # which edges touch this junction

    @field_validator('coords', mode='before')
    @classmethod
    def convert_coords(cls, v):
        if isinstance(v[0], (int, float)):  # it's [x, y]
            return [Point(x=v[0], y=v[1])]
        return v

class Street(BaseModel):
    id: int
    edge_ids: List[int]
    length: int = 0  # Total length of all edges in the street

    def to_segments(self, edges: List["Edge"]) -> List[dict]:
        """
        Reconstructs full street geometry as an array of segments,
        each segment is a dict with start and end points.
        """
        segments = []
        for edge_id in self.edge_ids:
            edge = next((e for e in edges if e.id == edge_id), None)
            if edge:
                start, end = edge.geometry
                segments.append({
                    "start": {"x": start[0], "y": start[1]},
                    "end": {"x": end[0], "y": end[1]}
                })
        return segments

    def edges(self, city_edges: List["Edge"]) -> List["Edge"]:
        """
        Returns the edges that belong to this street.
        """
        return [edge for edge in city_edges if edge.id in self.edge_ids]

    def calculate_length(self, city_edges: List["Edge"]) -> int:
        """
        Calculate the total length of all edges in this street.
        """
        import math
        total_length = 0
        for edge_id in self.edge_ids:
            edge = next((e for e in city_edges if e.id == edge_id), None)
            if edge:
                start, end = edge.geometry
                edge_length = math.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)
                total_length += edge_length
        return int(total_length)
    
class StreetGeometryResponse(BaseModel):
    """
    For on the fly denormalisation of street geometry.
    """
    id: int
    points: List[List[float]]


class CellResponse(BaseModel):
    id: int
    coords: List[Point]


class Cell(BaseModel):
    id: int
    coords: List[List[float]]
    edge_ids: List[int] = []


class Block(BaseModel):
    id: int
    polygon: List[List[float]]
    edge_ids: List[int]
    street_ids: List[int]
    cells: List[Cell] = []

class CityModel(BaseModel):
    blocks: List[Block]
    streets: List[Street]
    edges: List[Edge]
    junctions: List[Junction]

    edges_by_id: Dict[int, Edge] = {}
    junctions_by_id: Dict[int, Junction] = {}

    def get_edge(self, edge_id: int) -> Edge:
        return self.edges_by_id[edge_id]

    def get_junction(self, junction_id: int) -> Junction:
        return self.junctions_by_id[junction_id]    

    @model_validator(mode='after')
    def build_lookups(self) -> 'CityModel':
        self.edges_by_id = {e.id: e for e in self.edges}
        self.junctions_by_id = {j.id: j for j in self.junctions}
        
        # Calculate street lengths
        for street in self.streets:
            if street.length == 0:  # Only calculate if not already set
                street.length = street.calculate_length(self.edges)
        
        return self