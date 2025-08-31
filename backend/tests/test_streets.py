from json import load
from bezier_city_backend.models.city import Street, Edge

def test_create_street():
    """
    We can create a street with buildings on it
    """

    with open('tests/data/test_street_0_with_edges.json') as f:
        street_data = load(f)

    edges = []
    for e in street_data['edges']:
        edges.append(Edge(**e))

    print(edges)

    street = Street(**street_data['street'])

    print(street)