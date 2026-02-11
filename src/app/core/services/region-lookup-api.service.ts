import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of, forkJoin } from 'rxjs';
import {
    BagSearchResult,
    BagSearchResponse,
    BagAddressDetails,
    LeefbaarheidsData,
    parseWktPoint,
    getScoreLabel
} from '../models/region-lookup.model';

/**
 * Region Lookup API Service
 * 
 * Integrates with:
 * 1. PDOK Locatieserver - Dutch BAG address lookup
 * 2. Leefbaarometer - Livability scores
 */
@Injectable({
    providedIn: 'root'
})
export class RegionLookupApiService {
    private readonly http = inject(HttpClient);

    // PDOK Locatieserver API (BAG address lookup)
    private readonly PDOK_BASE = 'https://api.pdok.nl/bzk/locatieserver/search/v3_1';

    // Leefbaarometer WFS API
    private readonly LBM_BASE = 'https://geo.leefbaarometer.nl/lbm3/ows';

    /**
     * Search for addresses using PDOK Locatieserver
     * Supports: street + number, postal code, city name
     */
    searchAddress(query: string, limit: number = 10): Observable<BagSearchResult[]> {
        if (!query || query.length < 2) {
            return of([]);
        }

        const params = new HttpParams()
            .set('q', query)
            .set('rows', limit.toString())
            .set('fq', 'type:(adres OR postcode)')  // Filter to addresses and postal codes
            .set('fl', '*');  // Return all fields

        return this.http.get<BagSearchResponse>(`${this.PDOK_BASE}/free`, { params }).pipe(
            map(response => response.response?.docs || []),
            catchError(error => {
                console.error('[RegionLookup] PDOK search error:', error);
                return of([]);
            })
        );
    }

    /**
     * Get detailed address information from PDOK
     */
    getAddressDetails(bagId: string): Observable<BagAddressDetails | null> {
        const params = new HttpParams()
            .set('id', bagId)
            .set('fl', '*');

        return this.http.get<BagSearchResponse>(`${this.PDOK_BASE}/lookup`, { params }).pipe(
            map(response => {
                const doc = response.response?.docs?.[0];
                if (!doc) return null;

                const coords = parseWktPoint(doc.centroide_ll || '');

                return {
                    straatnaam: (doc as any).straatnaam || '',
                    huisnummer: (doc as any).huisnummer?.toString() || '',
                    huisletter: (doc as any).huisletter,
                    huisnummertoevoeging: (doc as any).huisnummertoevoeging,
                    postcode: (doc as any).postcode || '',
                    woonplaatsnaam: (doc as any).woonplaatsnaam || '',
                    gemeentenaam: (doc as any).gemeentenaam || '',
                    provincienaam: (doc as any).provincienaam || '',
                    bouwjaar: (doc as any).bouwjaar,
                    oppervlakte: (doc as any).oppervlakte,
                    status: (doc as any).status,
                    gebruiksdoel: (doc as any).gebruiksdoel,
                    coordinates: coords || { lat: 0, lng: 0 },
                    nummeraanduidingId: doc.nummeraanduiding_id,
                    verblijfsobjectId: doc.adresseerbaarobject_id,
                    pandId: (doc as any).pand_id
                } as BagAddressDetails;
            }),
            catchError(error => {
                console.error('[RegionLookup] PDOK lookup error:', error);
                return of(null);
            })
        );
    }

    /**
     * Get Leefbaarometer livability data for a location
     * Uses WFS GetFeature request with point intersection
     */
    getLeefbaarometer(lat: number, lng: number): Observable<LeefbaarheidsData | null> {
        // Create a point filter for WFS
        const filter = `
            <Filter xmlns="http://www.opengis.net/ogc">
                <Intersects>
                    <PropertyName>geom</PropertyName>
                    <Point xmlns="http://www.opengis.net/gml" srsName="EPSG:4326">
                        <pos>${lng} ${lat}</pos>
                    </Point>
                </Intersects>
            </Filter>
        `.replace(/\s+/g, ' ').trim();

        const params = new HttpParams()
            .set('service', 'WFS')
            .set('version', '2.0.0')
            .set('request', 'GetFeature')
            .set('typeName', 'lbm3:lbm3_scores')
            .set('outputFormat', 'application/json')
            .set('srsName', 'EPSG:4326')
            .set('filter', filter);

        return this.http.get<any>(this.LBM_BASE, { params }).pipe(
            map(response => {
                const feature = response?.features?.[0];
                if (!feature?.properties) return null;

                const props = feature.properties;
                const score = props.klad || props.lbm || 0;

                return {
                    score: score,
                    scoreLabel: getScoreLabel(score),
                    dimensions: {
                        fysiek: props.afw_fys || props.fysieke_omgeving || 0,
                        woningvoorraad: props.afw_won || props.woningen || 0,
                        voorzieningen: props.afw_vrz || props.voorzieningen || 0,
                        sociaal: props.afw_soc || props.sociale_samenhang || 0,
                        veiligheid: props.afw_vei || props.veiligheid || 0
                    },
                    year: props.jaar || 2022,
                    gridId: props.id || feature.id
                } as LeefbaarheidsData;
            }),
            catchError(error => {
                console.error('[RegionLookup] Leefbaarometer error:', error);
                // Try alternative GeoJSON approach if WFS fails
                return this.getLeefbaarometerFallback(lat, lng);
            })
        );
    }

    /**
     * Fallback method for Leefbaarometer data
     */
    private getLeefbaarometerFallback(lat: number, lng: number): Observable<LeefbaarheidsData | null> {
        // Try using bbox filter instead
        const delta = 0.0005; // ~50m
        const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

        const params = new HttpParams()
            .set('service', 'WFS')
            .set('version', '1.1.0')
            .set('request', 'GetFeature')
            .set('typeName', 'lbm3:lbm3_scores')
            .set('outputFormat', 'application/json')
            .set('srsName', 'EPSG:4326')
            .set('bbox', bbox);

        return this.http.get<any>(this.LBM_BASE, { params }).pipe(
            map(response => {
                const feature = response?.features?.[0];
                if (!feature?.properties) return null;

                const props = feature.properties;
                const score = props.klad || props.lbm || 0;

                return {
                    score: score,
                    scoreLabel: getScoreLabel(score),
                    dimensions: {
                        fysiek: props.afw_fys || 0,
                        woningvoorraad: props.afw_won || 0,
                        voorzieningen: props.afw_vrz || 0,
                        sociaal: props.afw_soc || 0,
                        veiligheid: props.afw_vei || 0
                    },
                    year: props.jaar || 2022,
                    gridId: feature.id
                } as LeefbaarheidsData;
            }),
            catchError(() => of(null))
        );
    }

    /**
     * Get all region data for a search result
     */
    getFullRegionData(bagId: string): Observable<{
        address: BagAddressDetails | null;
        leefbaarheid: LeefbaarheidsData | null;
    }> {
        return this.getAddressDetails(bagId).pipe(
            map(address => {
                if (!address || !address.coordinates.lat) {
                    return { address, leefbaarheid: null };
                }
                return { address, coordinates: address.coordinates };
            }),
            // Chain to get leefbaarometer if we have coordinates
            map(result => {
                if (result.address?.coordinates?.lat) {
                    // Return address immediately, leefbaarheid will be fetched separately
                    return { address: result.address, leefbaarheid: null };
                }
                return { address: result.address, leefbaarheid: null };
            })
        );
    }
}
