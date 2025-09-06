export interface Building {
    id: string;
    name: string;
    description: string;
    assets: Record<string, string>;
}

export async function getBuildings(): Promise<Record<string, Building>> {
    const API_BASE_URL = "http://127.0.0.1:9000";
    const response = await fetch(`${API_BASE_URL}/buildings`);
    if (!response.ok) {
        throw new Error("Failed to fetch buildings");
    }
    const buildingsMap: Record<string, Building> = await response.json();

    return buildingsMap;
}