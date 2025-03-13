from fastapi import FastAPI, HTTPException
import json
import math

app = FastAPI()

# Load the city data from file
with open("city_1_with_junctions.json", "r") as f:
    city_data = json.load(f)

def bezier_point(t, P0, P1, P2):
    """Calculate a point on a quadratic Bézier curve."""
    return (
        (1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * P1[0] + t ** 2 * P2[0],
        (1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * P1[1] + t ** 2 * P2[1]
    )

def bezier_length(P0, P1, P2, num_samples=50):
    """Approximates the length of a quadratic Bézier curve by sampling points."""
    length = 0
    points = [bezier_point(t, P0, P1, P2) for t in [i / num_samples for i in range(num_samples + 1)]]
    
    for i in range(len(points) - 1):
        length += math.dist(points[i], points[i + 1])
    
    return math.floor(length), points

def find_junction_distances(junctions, points):
    """Find the distance along the curve for each junction, removing duplicates."""
    distances = set()
    total_length = 0
    
    for i in range(len(points) - 1):
        segment_length = math.dist(points[i], points[i + 1])
        for j in junctions:
            if math.isclose(j["x"], points[i][0], abs_tol=5) and math.isclose(j["y"], points[i][1], abs_tol=5):
                distances.add(math.floor(total_length))
        total_length += segment_length
    
    return sorted([{"distance": d} for d in distances], key=lambda j: j["distance"])

def generate_ascii_street(length, junctions):
    """Generate an ASCII representation of the street with junctions only."""
    street_representation = [" "] * length
    
    for junction in junctions:
        street_representation[junction["distance"]] = "^"
    
    return "".join(street_representation).rstrip()

@app.get("/streets")
def get_street_list():
    """Retrieve a list of all street IDs."""
    return {"streets": [street["id"] for street in city_data]}

@app.get("/street/{street_id}")
def get_street(street_id: int):
    """Retrieve street data by ID, including length and junctions."""
    street = next((s for s in city_data if s["id"] == street_id), None)
    if not street:
        raise HTTPException(status_code=404, detail="Street not found")
    
    geometry = street["geometry"]
    P0 = (geometry["start"]["x"], geometry["start"]["y"])
    P1 = (geometry["control"]["x"], geometry["control"]["y"])
    P2 = (geometry["end"]["x"], geometry["end"]["y"])
    
    length, points = bezier_length(P0, P1, P2)
    junction_distances = find_junction_distances(street["junctions"], points)
    
    return {"id": street_id, "length": length, "junctions": junction_distances}

@app.get("/street/{street_id}/ascii")
def get_ascii_street(street_id: int):
    """Retrieve an ASCII representation of the street with junctions only."""
    street = get_street(street_id)
    ascii_representation = generate_ascii_street(street["length"], street["junctions"])
    return {"id": street_id, "ascii": ascii_representation}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
