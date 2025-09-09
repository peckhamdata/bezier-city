import random

buildings = {
    "brut": {"ascii": "B", "width": 2},
    "office": {"ascii": "O", "width": 6},
    "block": {"ascii": "L", "width": 3},
    "honeycomb": {"ascii": "H", "width": 5},
    "glass": {"ascii": "G", "width": 6},
}

# Scaling factor to convert world coordinates to building units
# Target: ~120 total ASCII characters for a typical street of ~800 world units
# This gives us ~10 characters for edge 0 (which is ~8.4% of the street)
WORLD_TO_BUILDING_SCALE = 0.15  # 793.59 * 0.15 ≈ 120 characters total

def fill_street_with_buildings(street, edges, city=None, buildings=buildings, included_streets=set()):
    """Fills the street with buildings and junctions."""
    import math

    placed_elements = []
    current_position = 0
    
    # Process each edge in the street, adding junctions between them
    for i, edge_id in enumerate(street.edge_ids):
        # Find the edge in the edges list
        edge = next((e for e in edges if e.id == edge_id), None)
        if not edge:
            continue
        
        # Calculate edge length
        start, end = edge.geometry
        edge_length = math.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)
        
        # Add junction at the start of the edge (except for the very first edge)
        if i > 0 and city:
            # Get the junction between this edge and the previous edge
            prev_edge_id = street.edge_ids[i-1]
            prev_edge = next((e for e in edges if e.id == prev_edge_id), None)
            
            if prev_edge:
                # Find shared junction between current and previous edge
                shared_junctions = set(edge.junction_ids) & set(prev_edge.junction_ids)
                if shared_junctions:
                    junction_id = list(shared_junctions)[0]
                    junction = city.get_junction(junction_id)
                    
                    # Determine junction type based on connected streets (only included streets)
                    connected_streets = set()
                    for junction_edge_id in junction.edge_ids:
                        junction_edge = city.get_edge(junction_edge_id)
                        # Only count streets that are included in the filter
                        if len(included_streets) == 0 or junction_edge.street_id in included_streets:
                            connected_streets.add(junction_edge.street_id)
                    
                    # Choose junction symbol - only render as intersection if multiple included streets
                    if len(connected_streets) > 1:
                        junction_ascii = "+"  # Multi-street intersection
                        placed_elements.append({
                            "name": "junction",
                            "ascii": junction_ascii,
                            "width": 1,
                            "position": current_position,
                            "junction_id": junction_id
                        })
                        current_position += 1
                    # else: Don't render junction if it only connects to one street
        
        # Fill the edge with buildings - convert world coordinates to building units
        edge_start_position = current_position
        # Scale edge length using our defined constant to ensure all edges contribute >=1 unit
        scaled_edge_length = max(1, int(edge_length * WORLD_TO_BUILDING_SCALE))
        edge_end_position = current_position + scaled_edge_length
        
        while current_position < edge_end_position:
            # Choose a random building
            building_name, building_data = random.choice(list(buildings.items()))
            
            # Check if building fits in remaining edge space
            if current_position + building_data["width"] <= edge_end_position:
                placed_elements.append({
                    "name": building_name,
                    "ascii": building_data["ascii"],
                    "width": building_data["width"],
                    "position": current_position,
                    "edge_id": edge_id
                })
                current_position += building_data["width"]
            else:
                # Fill remaining space with smaller buildings
                remaining_space = edge_end_position - current_position
                if remaining_space > 0:
                    # Find a building that fits in remaining space
                    fitting_buildings = [(name, data) for name, data in buildings.items() 
                                       if data["width"] <= remaining_space]
                    if fitting_buildings:
                        building_name, building_data = random.choice(fitting_buildings)
                        placed_elements.append({
                            "name": building_name,
                            "ascii": building_data["ascii"],
                            "width": building_data["width"],
                            "position": current_position,
                            "edge_id": edge_id
                        })
                        current_position += building_data["width"]
                    else:
                        # Fill with single character buildings if nothing fits
                        for _ in range(remaining_space):
                            building_name, building_data = random.choice(list(buildings.items()))
                            placed_elements.append({
                                "name": building_name,
                                "ascii": building_data["ascii"],
                                "width": 1,  # Force width of 1 to fill remaining space
                                "position": current_position,
                                "edge_id": edge_id
                            })
                            current_position += 1
                break
        
        # Ensure we advance to the end of this edge
        current_position = edge_end_position
    
    return placed_elements

def render_street(street, placed_elements):
    """Creates a compact string representation of the street using single-character tokens for buildings."""
    
    street_representation = []  # List of characters for rendering

    for element in placed_elements:
        ascii_char = element["ascii"]
        street_representation.append(ascii_char)  # Append each building/junction as a single token

    return "".join(street_representation)  # Convert list to string for rendering
