from requests import get

API_URL = "http://localhost:9000"

def test_streets():

    actual = get(f"{API_URL}/street/0")

    print(actual.json())

def test_streets_ascii():

    actual = get(f"{API_URL}/street/0/ascii")

    print(actual.json())
