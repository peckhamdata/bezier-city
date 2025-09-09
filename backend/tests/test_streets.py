from json import load
from bezier_city_backend.models.city import Street, Edge
from bezier_city_backend.buildings import fill_street_with_buildings

def _create_street():
    """
    We can create a street with buildings on it
    """

    with open('tests/data/test_street_0_with_edges.json') as f:
        street_data = load(f)

    edges = []
    for e in street_data['edges']:
        edges.append(Edge(**e))

    street = Street(**street_data['street'])

    return(street, edges)

def test_add_buildings_to_street():

    (street, edges) = _create_street()

    elements = fill_street_with_buildings(street, edges)

    expected = [{
        "name": "yoga_studio",
        "ascii": "Y",
        "width": 1,
        "position": 0
    },
    {
        "name": "bar",
        "ascii": "B",
        "width": 1,
        "position": 0
    },
    {
        "name": "industrial",
        "ascii": "I",
        "width": 1,
        "position": 0
    }
    ]

    assert(expected == elements)

def test get_ascii_street():
    