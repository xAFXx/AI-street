/**
 * Region Lookup Models
 * Interfaces for Dutch BAG and Leefbaarometer data
 */

// BAG API Response types
export interface BagSearchResult {
    id: string;
    type: string;                    // 'adres', 'postcode', 'woonplaats', etc.
    weergavenaam: string;            // Display name
    score: number;                   // Relevance score
    centroide_ll?: string;           // Lat/Lng as WKT: "POINT(4.89 52.37)"
    centroide_rd?: string;           // RD coordinates
    nummeraanduiding_id?: string;
    adresseerbaarobject_id?: string;
}

export interface BagSearchResponse {
    response: {
        numFound: number;
        start: number;
        docs: BagSearchResult[];
    };
}

export interface BagAddressDetails {
    // Basic address info
    straatnaam: string;
    huisnummer: string;
    huisletter?: string;
    huisnummertoevoeging?: string;
    postcode: string;
    woonplaatsnaam: string;
    gemeentenaam: string;
    provincienaam: string;

    // Building info
    bouwjaar?: number;
    oppervlakte?: number;           // Surface area in m²
    status?: string;                // Building status
    gebruiksdoel?: string[];        // Usage purpose (woonfunctie, etc.)

    // Coordinates
    coordinates: {
        lat: number;
        lng: number;
    };

    // IDs
    nummeraanduidingId?: string;
    verblijfsobjectId?: string;
    pandId?: string;
}

// Leefbaarometer types
export interface LeefbaarheidsData {
    // Overall score (-50 to +50, where >0 is above average)
    score: number;
    scoreLabel: string;             // 'Zeer positief', 'Positief', etc.

    // Dimension scores (same -50 to +50 scale)
    dimensions: {
        fysiek: number;             // Physical environment
        woningvoorraad: number;     // Housing stock
        voorzieningen: number;      // Facilities/amenities
        sociaal: number;            // Social cohesion
        veiligheid: number;         // Safety/nuisance
    };

    // Metadata
    year: number;                   // Measurement year (2020, 2022, etc.)
    gridId?: string;                // 100x100m grid cell ID
}

// Combined result for UI
export interface RegionLookupResult {
    address: BagAddressDetails;
    leefbaarheid?: LeefbaarheidsData;
    loading: {
        address: boolean;
        leefbaarheid: boolean;
    };
    error?: string;
}

// Utility function to convert score to label
export function getScoreLabel(score: number): string {
    if (score >= 20) return 'Zeer positief';
    if (score >= 8) return 'Positief';
    if (score >= -8) return 'Gemiddeld';
    if (score >= -20) return 'Negatief';
    return 'Zeer negatief';
}

// Utility to convert score to percentage (0-100 for progress bars)
export function scoreToPercentage(score: number): number {
    // Score ranges from -50 to +50, convert to 0-100
    return Math.round(((score + 50) / 100) * 100);
}

// Utility to parse WKT POINT to coordinates
export function parseWktPoint(wkt: string): { lat: number; lng: number } | null {
    const match = wkt?.match(/POINT\(([0-9.]+)\s+([0-9.]+)\)/);
    if (match) {
        return {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2])
        };
    }
    return null;
}
