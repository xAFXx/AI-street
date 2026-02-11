# Region Lookup

Dutch address lookup tool using the BAG (Basisregistraties Adressen en Gebouwen) API with Leefbaarometer quality-of-life scoring.

## Files

```
features/app-store/apps/region-lookup/
├── region-lookup.component.ts     # Main component (~233 lines)
├── region-lookup.component.html
└── region-lookup.component.less
```

## Models (`core/models/region-lookup.model.ts`)

| Model | Purpose |
|-------|---------|
| `BagSearchResult` | Autocomplete result: `id`, `weergavenaam` (display name) |
| `BagAddressDetails` | Full address: `straatnaam`, `huisnummer`, `postcode`, `woonplaatsnaam`, `coordinates` |
| `LeefbaarheidsData` | Quality score with dimension breakdowns |
| `scoreToPercentage()` | Utility to convert score (-50..50) to percentage (0..100) |

## API Service (`core/services/region-lookup-api.service.ts`)

| Method | Description |
|--------|-------------|
| `searchAddress(query, limit)` | BAG autocomplete search |
| `getAddressDetails(bagId)` | Full address details by BAG ID |
| `getLeefbaarometer(lat, lng)` | Leefbaarheid score for coordinates |

## Flow

1. User types address → autocomplete via `searchAddress()`
2. User selects suggestion → `getAddressDetails(bagId)`
3. If coordinates available → `getLeefbaarometer(lat, lng)`
4. Display: address card + leefbaarheid scores + Google Maps link

## UI Elements

- PrimeNG AutoComplete for address search
- Progress bars for dimension scores (color-coded by severity)
- Tags for overall score severity
- "Open in Maps" button → Google Maps link
