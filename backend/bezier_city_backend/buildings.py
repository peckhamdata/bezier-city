import random

buildings = {
    "brut": {"ascii": "B", "width": 200},      # 200 pixels wide
    "office": {"ascii": "O", "width": 600},    # 600 pixels wide
    "block": {"ascii": "L", "width": 300},     # 300 pixels wide
    "honeycomb": {"ascii": "H", "width": 500}, # 500 pixels wide
    "glass": {"ascii": "G", "width": 600},     # 600 pixels wide
    "narrow": {"ascii": "N", "width": 100}     # 100 pixels wide
}

# Scaling factor to convert world coordinates to pixels
# For a street of ~800 world units, we want approximately 12000-15000 pixels total
WORLD_TO_PIXEL_SCALE = 15.0  # 800 * 15 ≈ 12000 pixels total

def fill_street_with_buildings(street, edges, city=None, buildings=buildings, included_streets=set(), junction_sides=None):
    """Fills the street with buildings and junctions, returning pixel positions."""
    import math

    placed_elements = []
        
    # Total pixel width for the street
    total_pixel_width = street.length * WORLD_TO_PIXEL_SCALE
    
    # First, find all junctions and their positions
    junctions = []
    cumulative_world_position = 0
    
    for i, edge_id in enumerate(street.edge_ids):
        edge = next((e for e in edges if e.id == edge_id), None)
        if not edge:
            continue
        
        start, end = edge.geometry
        edge_length = math.sqrt((end[0] - start[0])**2 + (end[1] - start[1])**2)
        cumulative_world_position += edge_length
        
        # Check for junction at the end of this edge (between this edge and the next)
        if i < len(street.edge_ids) - 1 and city:
            next_edge_id = street.edge_ids[i+1]
            next_edge = next((e for e in edges if e.id == next_edge_id), None)
            
            if next_edge:
                shared_junctions = set(edge.junction_ids) & set(next_edge.junction_ids)
                if shared_junctions:
                    junction_id = list(shared_junctions)[0]
                    junction = city.get_junction(junction_id)
                    
                    # Check if junction connects to multiple streets
                    connected_streets = set()
                    for junction_edge_id in junction.edge_ids:
                        junction_edge = city.get_edge(junction_edge_id)
                        if len(included_streets) == 0 or junction_edge.street_id in included_streets:
                            connected_streets.add(junction_edge.street_id)
                    
                    if len(connected_streets) > 1:
                        # Calculate junction position in pixels
                        junction_center = (cumulative_world_position / street.length) * total_pixel_width
                        junction_width = 400
                        
                        junctions.append({
                            "id": junction_id,
                            "center": junction_center,
                            "start": junction_center - junction_width/2,
                            "end": junction_center + junction_width/2,
                            "width": junction_width
                        })
                        
                        # Determine junction side if available
                        junction_side = None
                        if junction_sides and junction:
                            # Look up the side based on junction coordinates and current street
                            # junction.coords is always List[Point] with one Point
                            point = junction.coords[0]
                            x = round(point.x, 2)
                            y = round(point.y, 2)
                            # The key format is "x,y,bezier_street_id" where bezier_street_id
                            # is the street that the bresenham street branches FROM (i.e., this street)
                            key = f"{x},{y},{street.id}"
                            if key in junction_sides:
                                junction_side = junction_sides[key]
                        
                        # Add junction to placed elements
                        junction_element = {
                            "name": "junction",
                            "ascii": "+",
                            "width": junction_width,
                            "position": junction_center - junction_width/2,
                            "junction_id": junction_id,
                            "center": junction_center
                        }
                        
                        if junction_side:
                            junction_element["side"] = junction_side
                            
                        placed_elements.append(junction_element)
    
    # Now fill the gaps between junctions with buildings
    current_position = 0
    
    for i, junction in enumerate(junctions):
        # Fill from current position to start of junction
        gap_end = junction["start"]
        
        while current_position < gap_end:
            # Choose a random building type
            building_name, building_data = random.choice(list(buildings.items()))
            
            # Check if building fits in remaining gap
            if current_position + building_data["width"] <= gap_end:
                placed_elements.append({
                    "name": building_name,
                    "ascii": building_data["ascii"],
                    "width": building_data["width"],
                    "position": current_position
                })
                current_position += building_data["width"]
            else:
                # Try to find a building that fits
                remaining_space = gap_end - current_position
                fitting_buildings = [(name, data) for name, data in buildings.items() 
                                   if data["width"] <= remaining_space]
                if fitting_buildings:
                    building_name, building_data = max(fitting_buildings, key=lambda x: x[1]["width"])
                    placed_elements.append({
                        "name": building_name,
                        "ascii": building_data["ascii"],
                        "width": building_data["width"],
                        "position": current_position
                    })
                    current_position += building_data["width"]
                else:
                    # Leave gap and move to after junction
                    break
        
        # Move position to after the junction
        current_position = junction["end"]
    
    # Fill from last junction (or start) to end of street
    while current_position < total_pixel_width:
        building_name, building_data = random.choice(list(buildings.items()))
        
        if current_position + building_data["width"] <= total_pixel_width:
            placed_elements.append({
                "name": building_name,
                "ascii": building_data["ascii"],
                "width": building_data["width"],
                "position": current_position
            })
            current_position += building_data["width"]
        else:
            remaining_space = total_pixel_width - current_position
            fitting_buildings = [(name, data) for name, data in buildings.items() 
                               if data["width"] <= remaining_space]
            if fitting_buildings:
                building_name, building_data = max(fitting_buildings, key=lambda x: x[1]["width"])
                placed_elements.append({
                    "name": building_name,
                    "ascii": building_data["ascii"],
                    "width": building_data["width"],
                    "position": current_position
                })
                current_position += building_data["width"]
            else:
                break
    
    return placed_elements

