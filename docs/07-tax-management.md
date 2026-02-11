# Tax Management

Tax document processing with AI-assisted GLA (General Ledger Account) mapping. Review tax items, assign GLA period mappings, validate, and process.

## Files

```
features/app-store/apps/tax-management/
├── tax-management.component.ts     # Main component (~743 lines)
├── tax-management.component.html
├── tax-management.component.less
└── index.ts
```

## Features

- Paginated tax item list with search and status filtering
- Tax detail view with PDF preview (inline iframe)
- GLA period mapping assignment (dropdown selection)
- AI-assisted validation via `AiChatService.proposeGlaMapping()`
- Status workflow: `pending → validated → posted`
- Navigate between tax items (prev/next)
- Currency formatting, date display

## Service Dependencies

| Service | Purpose |
|---------|---------|
| `TaxApiService` | Tax item CRUD, GLA mappings, PDF download |
| `AiChatService` | AI-assisted GLA mapping proposals |
| `DomSanitizer` | Sanitize PDF blob URLs for iframe |

## Core API (`TaxApiService`)

Located at `core/services/tax-api.service.ts`. Key methods:

| Method | Description |
|--------|-------------|
| `getTaxItems(params)` | Paginated tax items with filters |
| `getGlaPeriodMappings()` | Available GLA period mapping options |
| `assignGlaMapping(taxId, mappingId)` | Assign GLA to a tax item |
| `validateTaxItem(taxId)` | Validate tax item |
| `getTaxDocumentPdf(documentId)` | Download PDF blob |

## AI Integration

`AiChatService.proposeGlaMapping()` takes UBL data and available mappings, returns:
- `mappingId` — suggested GLA period mapping
- `confidence` — confidence score
- `reasoning` — explanation of the suggestion

## UI Layout

3-panel: tax list (left) → tax detail + PDF preview (center) → GLA assignment panel (right)
