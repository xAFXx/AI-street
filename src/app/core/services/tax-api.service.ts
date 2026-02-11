import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseApiService, PaginationParams } from '../api-client/base-api.service';
import { PagedResult } from '../api-client/api-config';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../api-client/api-config';

// =====================
// Type Interfaces
// =====================

/**
 * Tax item from the API
 * Field names match the actual API response from GetPagedAndFilteredResultTaxes
 */
export interface TaxItem {
    id: string;
    documentBaseId: string;  // This is the document ID for PDF preview
    documentName?: string;
    invoiceNumber?: string;
    invoiceAmount?: number;
    taxAmount: number;
    taxPercentage?: number;
    type?: string;  // e.g., "21%"
    vat?: string;  // e.g., "21,00"
    vatReasone?: string;  // e.g., "BTW 21% Hoog" (note: API has typo)
    bookingPeriodReference?: string;  // GLA period mapping ID
    bookingPeriod?: string;  // e.g., "2025"
    periodMappingHumanReadble?: string;  // e.g., "Inkoop (2/2023)"
    isClosedPeriod?: boolean;
    documentType?: {
        id: number;
        name: string;
        iconClass?: string;
    };
    creationTime?: string;
    status: 'pending' | 'assigned' | 'validated' | 'error';
}

/**
 * Booking period mapping (GLA-Period combination)
 * This is the flattened interface used by the component
 */
export interface BookingPeriodMapping {
    id: string;
    name: string;
    glaCode: string;
    glaDescription: string;
    periodName: string;
    periodMappingHumanReadble?: string;  // Note: API has typo "Readble"
    isActive?: boolean;
}

/**
 * Raw API response for booking period mapping
 * The API returns id at top level plus nested bookingPeriodMapping object
 */
interface BookingPeriodMappingApiResponse {
    id: string;  // Top-level ID - this matches tax.bookingPeriodReference
    name: string;
    code: string;
    description: string;
    bookingPeriodMapping: {
        id: string;
        name: string;
        code: string;
        description: string;
    };
    bookingPeriodCode: string;
    periodMappingHumanReadble?: string;
}

/**
 * GLA (General Ledger Account)
 */
export interface GlaAccount {
    id: string;
    code: string;
    description: string;
    category?: string;
}

/**
 * Booking period
 */
export interface BookingPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    isClosed: boolean;
}

/**
 * Request to update tax GLA assignment
 */
export interface UpdateTaxGlaRequest {
    taxId: string;
    glaPeriodMappingId: string;
}

/**
 * Filter options for tax list
 */
export interface TaxFilterOptions {
    status?: 'pending' | 'assigned' | 'validated' | 'all';
    periodId?: string;
    glaCode?: string;
    searchText?: string;
    dateFrom?: string;
    dateTo?: string;
}

/**
 * UBL data structure from GetUblData endpoint
 * Contains invoice data extracted from UBL documents
 */
export interface UblData {
    active: {
        invoiceNumber?: string;
        invoiceDate?: string;
        supplierName?: string;
        supplierVat?: string;
        supplierAddress?: string;
        customerName?: string;
        totalAmount?: number;
        taxAmount?: number;
        taxPercent?: number;
        currency?: string;
        lineItems?: Array<{
            description?: string;
            quantity?: number;
            unitPrice?: number;
            amount?: number;
            taxPercent?: number;
        }>;
        paymentTerms?: string;
        bankAccount?: string;
        reference?: string;
        [key: string]: any;  // Allow additional fields
    };
    modified?: any;  // Last checkpoint state
}

/**
 * AI-generated GLA proposal
 */
export interface GlaProposal {
    mappingId: string;
    confidence: number;  // 0-100%
    reasoning: string;
    suggestedMapping?: BookingPeriodMapping;
}

// =====================
// Tax API Service
// =====================

@Injectable({ providedIn: 'root' })
export class TaxApiService {
    private readonly baseApi = inject(BaseApiService);
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL, { optional: true }) ?? '';

    /**
     * Get paginated list of taxes
     */
    getTaxes(
        pagination?: PaginationParams,
        filters?: TaxFilterOptions
    ): Observable<PagedResult<TaxItem>> {
        const params: Record<string, any> = { ...filters };

        // ABP API wraps results in { result: { items: [], totalCount: N } }
        return this.baseApi.get<{ result: PagedResult<TaxItem> }>(
            '/api/services/app/Tax/GetPagedAndFilteredResultTaxes',
            {
                ...params,
                SkipCount: pagination?.skipCount?.toString(),
                MaxResultCount: pagination?.maxResultCount?.toString()
            }
        ).pipe(
            map(response => response.result || { items: [], totalCount: 0 })
        );
    }

    /**
     * Get a single tax by ID
     */
    getTax(taxId: string): Observable<TaxItem> {
        return this.baseApi.get<{ result: TaxItem }>(
            '/api/services/app/Tax/Get',
            { Id: taxId }
        ).pipe(map(response => response.result));
    }

    /**
     * Get all booking period mappings (GLA-Period combinations)
     * The API returns a nested structure that we flatten for component use
     */
    getBookingPeriodMappings(
        onlyActive: boolean = true,
        combined: boolean = false
    ): Observable<BookingPeriodMapping[]> {
        return this.baseApi.get<{ result: { items: BookingPeriodMappingApiResponse[] } }>(
            '/api/services/app/BookingPeriodMappings/GetAll',
            { OnlyActive: onlyActive, Combined: combined }
        ).pipe(
            map(response => {
                const items = response.result?.items || [];
                // Flatten the nested structure
                return items.map(item => ({
                    id: item.id,  // Use top-level id - matches tax.bookingPeriodReference
                    name: item.name || item.periodMappingHumanReadble || '',
                    glaCode: item.code || '',
                    glaDescription: item.description || '',
                    periodName: item.bookingPeriodCode || '',
                    periodMappingHumanReadble: item.periodMappingHumanReadble
                }));
            })
        );
    }

    /**
     * Get all active booking periods
     */
    getBookingPeriods(onlyActive: boolean = true): Observable<BookingPeriod[]> {
        return this.baseApi.get<{ result: { items: BookingPeriod[] } }>(
            '/api/services/app/BookingPeriod/GetAll',
            { OnlyActive: onlyActive }
        ).pipe(map(response => response.result?.items || []));
    }

    /**
     * Get GLA accounts
     */
    getGlaAccounts(): Observable<GlaAccount[]> {
        return this.baseApi.get<{ result: { items: GlaAccount[] } }>(
            '/api/services/app/Gla/GetAll'
        ).pipe(map(response => response.result?.items || []));
    }

    /**
     * Get document PDF URL for preview
     */
    getDocumentPdfUrl(documentId: string): string {
        return `${this.baseUrl}/api/services/app/Document/GetDocumentPDF?Id=${documentId}`;
    }

    /**
     * Get document PDF as blob for embedding
     * The API returns ABP-wrapped response: { result: { fileBase64: "...", fileName: "..." } }
     */
    getDocumentPdf(documentId: string): Observable<Blob> {
        interface PdfResponse {
            result: {
                fileBase64: string;
                fileName: string;
            } | null;
        }

        return this.http.get<PdfResponse>(this.getDocumentPdfUrl(documentId)).pipe(
            map(response => {
                if (!response.result?.fileBase64) {
                    throw new Error('No PDF data in response');
                }
                // Convert base64 to blob
                const byteCharacters = atob(response.result.fileBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                return new Blob([byteArray], { type: 'application/pdf' });
            })
        );
    }

    /**
     * Update tax GLA assignment
     */
    updateTaxGlaMapping(taxId: string, glaPeriodMappingId: string): Observable<TaxItem> {
        return this.baseApi.post<{ result: TaxItem }>(
            '/api/services/app/Tax/UpdateGlaMapping',
            { taxId, glaPeriodMappingId }
        ).pipe(map(response => response.result));
    }

    /**
     * Validate a tax item (mark as validated)
     */
    validateTax(taxId: string): Observable<TaxItem> {
        return this.baseApi.post<{ result: TaxItem }>(
            '/api/services/app/Tax/Validate',
            { id: taxId }
        ).pipe(map(response => response.result));
    }

    /**
     * Batch validate multiple tax items
     */
    validateTaxes(taxIds: string[]): Observable<void> {
        return this.baseApi.post<void>(
            '/api/services/app/Tax/ValidateBatch',
            { ids: taxIds }
        );
    }

    /**
     * Reject a tax item (mark as needs review)
     */
    rejectTax(taxId: string, reason?: string): Observable<TaxItem> {
        return this.baseApi.post<{ result: TaxItem }>(
            '/api/services/app/Tax/Reject',
            { id: taxId, reason }
        ).pipe(map(response => response.result));
    }

    /**
     * Get UBL data for a document
     * Returns structured invoice data extracted from UBL document
     */
    getUblData(documentId: string): Observable<UblData> {
        return this.baseApi.get<{ result: UblData }>(
            '/api/services/app/Ubl/GetUblData',
            { Id: documentId }
        ).pipe(map(response => response.result));
    }

    /**
     * Assign booking period mapping to a tax item
     */
    assignBookingPeriodMapping(taxId: string, mappingId: string): Observable<void> {
        return this.baseApi.post<void>(
            '/api/services/app/Tax/AssignBookingPeriodMapping',
            {
                TaxId: taxId,
                BookingPeriodMappingId: mappingId
            }
        );
    }
}
