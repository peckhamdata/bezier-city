#!/usr/bin/env python3
"""
Generate 100 NPCs distributed across the city
"""
import json
import random
from pathlib import Path

# Load city data to get available streets and edges
with open('bezier_city_full.json') as f:
    city_data = json.load(f)

streets = city_data['streets']
edges = city_data['edges']

# Create a mapping of street_id -> list of edge_ids
street_to_edges = {}
for edge in edges:
    street_id = edge['street_id']
    if street_id not in street_to_edges:
        street_to_edges[street_id] = []
    street_to_edges[street_id].append(edge['id'])

# Generate random NPC names (mix of consonant-heavy fantasy names)
def generate_npc_name():
    consonants = 'bcdfghjklmnpqrstvwxyz'
    vowels = 'aeiou'
    
    name = ''
    length = random.randint(5, 8)
    
    for i in range(length):
        if i == 0 or i % 2 == 0:
            name += random.choice(consonants)
        else:
            name += random.choice(vowels)
    
    return name.capitalize()

# Dialogue options for NPCs
dialogue_options = [
    ["The glyphs hum when you listen closely."],
    ["You're not from around here, are you?"],
    ["The city forgets—but I remember."],
    ["Have you seen the patterns in the walls?"],
    ["The streets shift when no one's watching."],
    ["I've been walking these paths for decades."],
    ["The buildings whisper secrets at night."],
    ["Every corner holds a different story."],
    ["The geometry here isn't quite right."],
    ["I knew this place before it changed."],
    ["The shadows move differently here."],
    ["Time flows strangely in this district."],
    ["I collect fragments of forgotten maps."],
    ["The architecture dreams while we sleep."],
    ["This intersection wasn't here yesterday."],
    ["I can hear the city breathing."],
    ["The coordinates never quite align."],
    ["I'm mapping the unmappable paths."],
    ["The grid shifts with the tides."],
    ["Every street remembers its builders."],
    ["I walk between the planned routes."],
    ["The city grows in impossible directions."],
    ["I've seen structures that shouldn't exist."],
    ["The paths converge in strange ways."],
    ["This place exists in multiple dimensions."],
    ["I follow the invisible guidelines."],
    ["The blueprints contradict themselves."],
    ["I navigate by the sound of foundations."],
    ["The geometry here defies explanation."],
    ["I'm tracing the original survey lines."]
]

# Generate 100 NPCs
npcs = []

for i in range(100):
    # Pick a random street that has edges
    available_streets = [sid for sid in street_to_edges.keys() if street_to_edges[sid]]
    street_id = random.choice(available_streets)
    
    # Pick a random edge from that street
    edge_id = random.choice(street_to_edges[street_id])
    
    # Generate NPC properties
    npc = {
        "name": generate_npc_name(),
        "id": i,
        "current_edge_id": edge_id,
        "current_street_id": street_id,
        "progress": round(random.uniform(0.0, 1.0), 3),
        "speed": round(random.uniform(0.5, 2.0), 2),  # Varied walking speeds
        "direction": random.choice([-1, 1]),  # Random initial direction
        "dialogue": random.choice(dialogue_options)
    }
    
    npcs.append(npc)

# Save the NPCs to the data file
output_file = Path("bezier_city_backend/data/npc.json")
with output_file.open('w') as f:
    json.dump(npcs, f, indent=2)

print(f"Generated {len(npcs)} NPCs")
print(f"Distributed across {len(set(npc['current_street_id'] for npc in npcs))} different streets")
print(f"Speed range: {min(npc['speed'] for npc in npcs)} - {max(npc['speed'] for npc in npcs)}")
print(f"Saved to {output_file}")

# Print some sample NPCs
print("\nSample NPCs:")
for npc in npcs[:5]:
    print(f"  {npc['name']} (ID {npc['id']}): Street {npc['current_street_id']}, Edge {npc['current_edge_id']}, Progress {npc['progress']}")