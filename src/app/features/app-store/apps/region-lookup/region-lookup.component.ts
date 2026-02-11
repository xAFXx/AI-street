import { Component, inject, signal, computed, effect, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged, switchMap, takeUntil, of, tap, finalize } from 'rxjs';

// PrimeNG
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { DividerModule } from 'primeng/divider';
import { TagModule } from 'primeng/tag';
import { AutoCompleteModule, AutoCompleteCompleteEvent, AutoCompleteSelectEvent } from 'primeng/autocomplete';

// Services and Models
import { RegionLookupApiService } from '../../../../core/services/region-lookup-api.service';
import {
    BagSearchResult,
    BagAddressDetails,
    LeefbaarheidsData,
    scoreToPercentage
} from '../../../../core/models/region-lookup.model';

@Component({
    selector: 'app-region-lookup',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        CardModule,
        InputTextModule,
        ButtonModule,
        ProgressBarModule,
        ProgressSpinnerModule,
        TooltipModule,
        DividerModule,
        TagModule,
        AutoCompleteModule
    ],
    templateUrl: './region-lookup.component.html',
    styleUrl: './region-lookup.component.less'
})
export class RegionLookupComponent implements OnInit, OnDestroy {
    private readonly api = inject(RegionLookupApiService);
    private readonly destroy$ = new Subject<void>();

    // Search state
    searchQuery = signal('');
    suggestions = signal<BagSearchResult[]>([]);
    isSearching = signal(false);

    // Selected address data
    selectedAddress = signal<BagAddressDetails | null>(null);
    leefbaarheid = signal<LeefbaarheidsData | null>(null);

    // Loading states
    isLoadingAddress = signal(false);
    isLoadingLeefbaarheid = signal(false);

    // Error state
    errorMessage = signal<string | null>(null);

    // Computed values for UI
    hasResult = computed(() => !!this.selectedAddress());

    // For autocomplete
    selectedSuggestion: BagSearchResult | null = null;
    autocompleteField = 'weergavenaam';

    ngOnInit(): void {
        console.log('[RegionLookup] Component initialized');
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    /**
     * Handle autocomplete search
     */
    onSearch(event: AutoCompleteCompleteEvent): void {
        const query = event.query?.trim();
        if (!query || query.length < 2) {
            this.suggestions.set([]);
            return;
        }

        this.isSearching.set(true);
        this.api.searchAddress(query, 10).pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isSearching.set(false))
        ).subscribe({
            next: (results) => {
                this.suggestions.set(results);
            },
            error: (err) => {
                console.error('[RegionLookup] Search error:', err);
                this.suggestions.set([]);
            }
        });
    }

    /**
     * Handle address selection from autocomplete
     */
    onSelectAddress(event: AutoCompleteSelectEvent): void {
        const selected = event.value as BagSearchResult;
        if (!selected?.id) return;

        this.selectedSuggestion = selected;
        this.errorMessage.set(null);
        this.loadAddressDetails(selected.id);
    }

    /**
     * Load full address details
     */
    private loadAddressDetails(bagId: string): void {
        this.isLoadingAddress.set(true);
        this.selectedAddress.set(null);
        this.leefbaarheid.set(null);

        this.api.getAddressDetails(bagId).pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isLoadingAddress.set(false))
        ).subscribe({
            next: (address) => {
                if (address) {
                    this.selectedAddress.set(address);
                    // Load leefbaarometer data for this location
                    if (address.coordinates?.lat && address.coordinates?.lng) {
                        this.loadLeefbaarheid(address.coordinates.lat, address.coordinates.lng);
                    }
                } else {
                    this.errorMessage.set('Adresgegevens niet gevonden');
                }
            },
            error: (err) => {
                console.error('[RegionLookup] Address load error:', err);
                this.errorMessage.set('Fout bij laden adresgegevens');
            }
        });
    }

    /**
     * Load Leefbaarometer data
     */
    private loadLeefbaarheid(lat: number, lng: number): void {
        this.isLoadingLeefbaarheid.set(true);

        this.api.getLeefbaarometer(lat, lng).pipe(
            takeUntil(this.destroy$),
            finalize(() => this.isLoadingLeefbaarheid.set(false))
        ).subscribe({
            next: (data) => {
                this.leefbaarheid.set(data);
                if (!data) {
                    console.warn('[RegionLookup] No leefbaarheid data for location');
                }
            },
            error: (err) => {
                console.error('[RegionLookup] Leefbaarheid load error:', err);
            }
        });
    }

    /**
     * Clear current selection
     */
    clearSelection(): void {
        this.selectedSuggestion = null;
        this.searchQuery.set('');
        this.selectedAddress.set(null);
        this.leefbaarheid.set(null);
        this.errorMessage.set(null);
    }

    /**
     * Get severity for leefbaarheid score
     */
    getScoreSeverity(score: number): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
        if (score >= 20) return 'success';
        if (score >= 8) return 'info';
        if (score >= -8) return 'secondary';
        if (score >= -20) return 'warn';
        return 'danger';
    }

    /**
     * Convert score to percentage for progress bars
     */
    toPercentage(score: number): number {
        return scoreToPercentage(score);
    }

    /**
     * Get color class for dimension score
     */
    getDimensionColor(score: number): string {
        if (score >= 10) return 'dimension-positive';
        if (score >= 0) return 'dimension-neutral';
        if (score >= -10) return 'dimension-warning';
        return 'dimension-negative';
    }

    /**
     * Format address for display
     */
    formatFullAddress(address: BagAddressDetails): string {
        const parts = [
            address.straatnaam,
            address.huisnummer + (address.huisletter || '') + (address.huisnummertoevoeging ? `-${address.huisnummertoevoeging}` : ''),
            address.postcode,
            address.woonplaatsnaam
        ];
        return parts.filter(p => p).join(', ');
    }

    /**
     * Open location in Google Maps
     */
    openInMaps(): void {
        const address = this.selectedAddress();
        if (address?.coordinates) {
            const url = `https://www.google.com/maps?q=${address.coordinates.lat},${address.coordinates.lng}`;
            window.open(url, '_blank');
        }
    }
}
