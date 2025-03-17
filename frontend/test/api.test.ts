// Test retrieval of buildings
 // Are we calling the API correctly?

// Get a list of buildings

// From the list of buildings get all the assets

// Preload the assets


import { getBuildings, Building } from "../src/game/api";
import fetchMock from "jest-fetch-mock";

fetchMock.enableMocks();

describe("API: Fetch Buildings", () => {
    beforeEach(() => {
        fetchMock.resetMocks();
    });

    test("should retrieve a list of buildings", async () => {
        const mockResponse: Record<string, Building> = {
            "A": {
                id: "A",
                name: "Skyscraper",
                description: "A tall modern skyscraper",
                assets: {
                    0: "https://example.com/assets/buildings/A/wireframe.txt",
                    1: "https://example.com/assets/buildings/A/petscii.txt",
                    2: "https://example.com/assets/buildings/A/bitmap.png",
                    3: "https://example.com/assets/buildings/A/polygon.obj"
                }
            },
            "B": {
                id: "B",
                name: "Warehouse",
                description: "A large industrial warehouse",
                assets: {
                    0: "https://example.com/assets/buildings/B/wireframe.txt",
                    1: "https://example.com/assets/buildings/B/petscii.txt",
                    2: "https://example.com/assets/buildings/B/bitmap.png",
                    3: "https://example.com/assets/buildings/B/polygon.obj"
                }
            }
        };

        fetchMock.mockResponseOnce(
            (req) => req.url === "http://127.0.0.1:8000/buildings"
                ? Promise.resolve(JSON.stringify(mockResponse))
                : Promise.reject(new Error("Unexpected endpoint"))
        );

        const buildings = await getBuildings();
        expect(fetchMock).toHaveBeenCalledWith("http://127.0.0.1:8000/buildings");
        expect(buildings).toBeInstanceOf(Object);
        expect(Object.keys(buildings)).toHaveLength(2);
    });

    test("should handle API errors gracefully", async () => {
        fetchMock.mockResponseOnce("", { status: 404 });

        await expect(getBuildings()).rejects.toThrow("Failed to fetch buildings");
    });
});