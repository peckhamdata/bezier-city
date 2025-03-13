import random
import pandas as pd

def fill_street_with_buildings(street, buildings):
    """Fills the street with buildings while ensuring junctions occupy 1-width spaces."""

    # Extract street length and junction positions
    street_length = street["length"]
    junction_positions = {j["distance"] for j in street["junctions"]}

    # Ensure junctions take up a width of 1
    junction_width = 1

    # List of placed elements (buildings and junctions)
    placed_elements = []

    # Track position as we fill the street
    current_position = 0

    while current_position < street_length:
        # If this position is a junction, place it and move forward
        if current_position in junction_positions:
            placed_elements.append({
                "name": "Junction",
                "ascii": "+",
                "width": junction_width,
                "position": current_position
            })
            current_position += junction_width  # Move past the junction
            continue  # Ensure no building is placed on the junction

        # Find all buildings that can fit in the remaining space before next junction
        next_junction = min((j for j in junction_positions if j > current_position), default=street_length)
        available_space = next_junction - current_position

        possible_buildings = [
            name for name, data in buildings.items() if data["width"] <= available_space
        ]

        if not possible_buildings:
            current_position += 1  # Move forward if no building fits
            continue

        # Choose a random building that fits
        building_name = random.choice(possible_buildings)
        building_width = buildings[building_name]["width"]

        # Place the building
        placed_elements.append({
            "name": building_name,
            "ascii": buildings[building_name]["ascii"],
            "width": building_width,
            "position": current_position
        })

        # Move position forward
        current_position += building_width

    return placed_elements

# Example usage
street = {
    "id": 4,
    "length": 988,
    "junctions": [
        {"distance": 400}, {"distance": 463}, {"distance": 482},
        {"distance": 491}, {"distance": 500}, {"distance": 509},
        {"distance": 517}, {"distance": 527}
    ]
}

buildings = {
    "Office": {"ascii": "O", "width": 8},
    "Bar": {"ascii": "B", "width": 5},
    "Yoga Studio": {"ascii": "Y", "width": 6},
    "Industrial": {"ascii": "I", "width": 12},
    "Workshop": {"ascii": "W", "width": 7},
    "Apartment Building": {"ascii": "A", "width": 10},
}

# Generate the filled street layout
filled_street = fill_street_with_buildings(street, buildings)

# Convert results to a DataFrame for readability
df = pd.DataFrame(filled_street)
print(df.to_string(index=False))  # Print table format output
