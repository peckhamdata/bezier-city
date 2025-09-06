import random

buildings = {
    "office": {"ascii": "A", "width": 8},
    "bar": {"ascii": "B", "width": 5},
    "yoga_studio": {"ascii": "C", "width": 6},
    "industrial": {"ascii": "D", "width": 12},
    "workshop": {"ascii": "E", "width": 7},
}

def fill_street_with_buildings(street, edges, buildings=buildings):
    """Fills the street with buildings while ensuring junctions occupy 1-width spaces."""
    import math

    placed_elements = []
    current_position = 0
    
    # Calculate total length of street from edge geometries
    total_length = 0
    for edge_id in street.edge_ids:
        # Find the edge in the edges list
        edge = next((e for e in edges if e.id == edge_id), None)
        if edge:
            start, end = edge.geometry
            # Calculate Euclidean distance between start and end points
            edge_length = math.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)
            total_length += edge_length
    
    # Fill the street with buildings
    while current_position < total_length:
        # Choose a random building
        building_name, building_data = random.choice(list(buildings.items()))
        
        # Check if building fits in remaining space
        if current_position + building_data["width"] <= total_length:
            placed_elements.append({
                "name": building_name,
                "ascii": building_data["ascii"],
                "width": building_data["width"],
                "position": current_position
            })
            current_position += building_data["width"]
        else:
            # Fill remaining space with smaller buildings or break
            break
    
    return placed_elements

def render_street(street, placed_elements):
    """Creates a compact string representation of the street using single-character tokens for buildings."""
    
    street_representation = []  # List of characters for rendering

    for element in placed_elements:
        ascii_char = element["ascii"]
        street_representation.append(ascii_char)  # Append each building/junction as a single token

    return "".join(street_representation)  # Convert list to string for rendering
