import { Component, inject, signal, computed, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// PrimeNG Modules
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { BadgeModule } from 'primeng/badge';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';

// Services
import { TaxApiService, TaxItem, BookingPeriodMapping, TaxFilterOptions, UblData, GlaProposal } from '../../../../core/services/tax-api.service';
import { AiChatService } from '../../../../core/services/ai-chat.service';
import { hasApiKey } from '../true-north/template-editor/ai-providers/ai-config';
import { OnboardingDialogComponent } from '../../../../shared/components/onboarding-dialog.component';

@Component({
    selector: 'app-tax-management',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ButtonModule,
        InputTextModule,
        TooltipModule,
        ProgressSpinnerModule,
        BadgeModule,
        TagModule,
        DividerModule,
        SelectModule,
        MessageModule,
        OnboardingDialogComponent
    ],
    templateUrl: './tax-management.component.html',
    styleUrl: './tax-management.component.less'
})
export class TaxManagementComponent implements OnInit, OnDestroy {
    // Services
    private readonly taxApi = inject(TaxApiService);
    private readonly sanitizer = inject(DomSanitizer);
    private readonly aiChat = inject(AiChatService);

    // =====================
    // State Signals
    // =====================

    // Tax list
    taxes = signal<TaxItem[]>([]);
    totalCount = signal<number>(0);
    currentPage = signal<number>(0);
    pageSize = signal<number>(20);
    isLoadingTaxes = signal<boolean>(false);

    // GLA Period Mappings
    glaPeriodMappings = signal<BookingPeriodMapping[]>([]);
    isLoadingMappings = signal<boolean>(false);

    // Selection
    selectedTaxId = signal<string | null>(null);
    selectedGlaMapping = signal<string | null>(null);

    // Filters - default to 'all' to show all entries
    statusFilter = signal<'all' | 'pending' | 'assigned' | 'validated'>('all');
    searchText = signal<string>('');

    // PDF Preview
    pdfUrl = signal<SafeResourceUrl | null>(null);
    isLoadingPdf = signal<boolean>(false);

    // Processing
    isSaving = signal<boolean>(false);
    isValidating = signal<boolean>(false);

    // =====================
    // AI Validation Mode
    // =====================

    // View mode: 'list' (traditional) or 'validation' (card-based AI workflow)
    viewMode = signal<'list' | 'validation'>('validation');

    // AI proposal state
    aiProposal = signal<GlaProposal | null>(null);
    isLoadingProposal = signal<boolean>(false);
    ublData = signal<UblData | null>(null);

    // AI Activity Log (optional debug panel)
    showLogPanel = signal<boolean>(true);
    aiActivityLog = signal<string[]>([]);

    // API Key dialog state
    showApiKeyDialog = signal<boolean>(false);

    // Log helper method
    private addLog(message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        this.aiActivityLog.update(logs => [...logs, `[${timestamp}] ${message}`]);
    }

    clearLogs(): void {
        this.aiActivityLog.set([]);
    }

    // Called when API key is saved in the onboarding dialog
    onApiKeySaved(): void {
        this.showApiKeyDialog.set(false);
        this.addLog('✅ API key configured successfully');
        // Retry analysis with the current tax
        const tax = this.selectedTax();
        if (tax) {
            this.loadAiProposal(tax);
        }
    }

    // Validation queue position
    currentQueueIndex = computed(() => {
        const taxId = this.selectedTaxId();
        const filtered = this.filteredTaxes();
        return filtered.findIndex(t => t.id === taxId) + 1;
    });

    // =====================
    // Computed Values
    // =====================

    selectedTax = computed(() => {
        const taxId = this.selectedTaxId();
        return this.taxes().find(t => t.id === taxId) || null;
    });

    filteredTaxes = computed(() => {
        const status = this.statusFilter();
        const search = this.searchText().toLowerCase();
        let items = this.taxes();

        if (status !== 'all') {
            items = items.filter(t => t.status === status);
        }

        if (search) {
            items = items.filter(t =>
                t.invoiceNumber?.toLowerCase().includes(search) ||
                t.documentName?.toLowerCase().includes(search) ||
                t.vatReasone?.toLowerCase().includes(search)
            );
        }

        return items;
    });

    // Treat all items as pending for now (ignore actual status)
    pendingCount = computed(() => this.taxes().length);

    validatedCount = computed(() => 0);

    hasNextTax = computed(() => {
        const current = this.selectedTaxId();
        const filtered = this.filteredTaxes();
        const currentIndex = filtered.findIndex(t => t.id === current);
        return currentIndex < filtered.length - 1;
    });

    hasPrevTax = computed(() => {
        const current = this.selectedTaxId();
        const filtered = this.filteredTaxes();
        const currentIndex = filtered.findIndex(t => t.id === current);
        return currentIndex > 0;
    });

    // Status filter options
    statusOptions = [
        { label: 'Pending', value: 'pending' },
        { label: 'Assigned', value: 'assigned' },
        { label: 'Validated', value: 'validated' },
        { label: 'All', value: 'all' }
    ];

    // Check if current mapping is in active list (for grayed state when inactive)
    isMappingInActiveList = computed(() => {
        const tax = this.selectedTax();
        if (!tax?.bookingPeriodReference) return true; // No mapping = can edit
        const mappings = this.glaPeriodMappings();
        return mappings.some(m => m.id === tax.bookingPeriodReference);
    });

    // =====================
    // Lifecycle
    // =====================

    constructor() {
        // Effect to load PDF when selection changes
        effect(() => {
            const tax = this.selectedTax();
            if (tax?.documentBaseId) {
                this.loadPdfPreview(tax.documentBaseId);
            } else {
                this.pdfUrl.set(null);
            }
        });

        // Effect to sync GLA selection with selected tax
        effect(() => {
            const tax = this.selectedTax();
            this.selectedGlaMapping.set(tax?.bookingPeriodReference || null);
        }, { allowSignalWrites: true });

        // Effect to load AI proposal when tax selection changes
        effect(() => {
            const tax = this.selectedTax();
            const mode = this.viewMode();
            if (tax && mode === 'validation' && !tax.bookingPeriodReference) {
                this.loadAiProposal(tax);
            } else {
                this.aiProposal.set(null);
            }
        }, { allowSignalWrites: true });
    }

    ngOnInit(): void {
        this.loadTaxes();
        this.loadGlaPeriodMappings();
    }

    ngOnDestroy(): void {
        // Cleanup if needed
    }

    // =====================
    // Data Loading
    // =====================

    loadTaxes(): void {
        this.isLoadingTaxes.set(true);

        // Don't filter by status - load all taxes and treat as pending
        const filters: TaxFilterOptions = {};
        if (this.searchText()) {
            filters.searchText = this.searchText();
        }

        this.taxApi.getTaxes(
            { skipCount: this.currentPage() * this.pageSize(), maxResultCount: this.pageSize() },
            filters
        ).subscribe({
            next: (result) => {
                // Map all items to have 'pending' status for display
                const items = (result.items || []).map(item => ({
                    ...item,
                    status: 'pending' as const
                }));
                this.taxes.set(items);
                this.totalCount.set(result.totalCount || 0);
                this.isLoadingTaxes.set(false);

                // Auto-select first item if none selected
                if (!this.selectedTaxId() && items.length) {
                    this.selectTax(items[0]);
                }
            },
            error: (err) => {
                console.error('[TaxManagement] Error loading taxes:', err);
                this.isLoadingTaxes.set(false);
            }
        });
    }

    loadGlaPeriodMappings(): void {
        this.isLoadingMappings.set(true);

        this.taxApi.getBookingPeriodMappings(true, false).subscribe({
            next: (mappings) => {
                this.glaPeriodMappings.set(mappings);
                this.isLoadingMappings.set(false);
            },
            error: (err) => {
                console.error('[TaxManagement] Error loading GLA mappings:', err);
                this.isLoadingMappings.set(false);
            }
        });
    }

    loadPdfPreview(documentId: string): void {
        this.isLoadingPdf.set(true);

        // Fetch PDF as blob with authentication headers (HttpClient adds auth)
        this.taxApi.getDocumentPdf(documentId).subscribe({
            next: (blob) => {
                // Create blob URL for the PDF
                const blobUrl = URL.createObjectURL(blob);
                this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(blobUrl));
                this.isLoadingPdf.set(false);
            },
            error: (err) => {
                console.error('[TaxManagement] Error loading PDF:', err);
                this.pdfUrl.set(null);
                this.isLoadingPdf.set(false);
            }
        });
    }

    loadMore(): void {
        this.currentPage.update(p => p + 1);

        this.taxApi.getTaxes(
            { skipCount: this.currentPage() * this.pageSize(), maxResultCount: this.pageSize() }
        ).subscribe({
            next: (result) => {
                this.taxes.update(current => [...current, ...(result.items || [])]);
            }
        });
    }

    // =====================
    // Selection
    // =====================

    selectTax(tax: TaxItem): void {
        this.selectedTaxId.set(tax.id);
    }

    selectNextTax(): void {
        const filtered = this.filteredTaxes();
        const currentIndex = filtered.findIndex(t => t.id === this.selectedTaxId());
        if (currentIndex < filtered.length - 1) {
            this.selectTax(filtered[currentIndex + 1]);
        }
    }

    selectPrevTax(): void {
        const filtered = this.filteredTaxes();
        const currentIndex = filtered.findIndex(t => t.id === this.selectedTaxId());
        if (currentIndex > 0) {
            this.selectTax(filtered[currentIndex - 1]);
        }
    }

    // =====================
    // GLA Assignment
    // =====================

    onGlaMappingChange(mappingId: string): void {
        this.selectedGlaMapping.set(mappingId);
    }

    saveGlaAssignment(): void {
        const taxId = this.selectedTaxId();
        const mappingId = this.selectedGlaMapping();

        if (!taxId || !mappingId) return;

        this.isSaving.set(true);

        this.taxApi.updateTaxGlaMapping(taxId, mappingId).subscribe({
            next: (updatedTax) => {
                // Update the tax in the list
                this.taxes.update(list =>
                    list.map(t => t.id === updatedTax.id ? updatedTax : t)
                );
                this.isSaving.set(false);
            },
            error: (err) => {
                console.error('[TaxManagement] Error saving GLA assignment:', err);
                this.isSaving.set(false);
            }
        });
    }

    // =====================
    // Validation
    // =====================

    validateCurrentTax(): void {
        const taxId = this.selectedTaxId();
        if (!taxId) return;

        this.isValidating.set(true);

        this.taxApi.validateTax(taxId).subscribe({
            next: (updatedTax) => {
                // Update the tax in the list
                this.taxes.update(list =>
                    list.map(t => t.id === updatedTax.id ? updatedTax : t)
                );
                this.isValidating.set(false);

                // Auto-navigate to next pending item
                if (this.hasNextTax()) {
                    this.selectNextTax();
                }
            },
            error: (err) => {
                console.error('[TaxManagement] Error validating tax:', err);
                this.isValidating.set(false);
            }
        });
    }

    skipToNext(): void {
        if (this.hasNextTax()) {
            this.selectNextTax();
        }
    }

    // =====================
    // Filters
    // =====================

    onStatusFilterChange(status: string): void {
        this.statusFilter.set(status as any);
        this.currentPage.set(0);
        this.loadTaxes();
    }

    onSearchChange(text: string): void {
        this.searchText.set(text);
        // Debounce could be added here
    }

    applySearch(): void {
        this.currentPage.set(0);
        this.loadTaxes();
    }

    // =====================
    // Utilities
    // =====================

    formatCurrency(amount: number, currency?: string): string {
        const curr = currency || 'EUR';
        return new Intl.NumberFormat('nl-NL', {
            style: 'currency',
            currency: curr
        }).format(amount);
    }

    formatDate(dateStr?: string): string {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('nl-NL');
    }

    getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
        switch (status) {
            case 'validated': return 'success';
            case 'assigned': return 'info';
            case 'pending': return 'warn';
            case 'error': return 'danger';
            default: return 'secondary';
        }
    }

    getGlaMappingLabel(mapping: BookingPeriodMapping): string {
        return `${mapping.glaCode} - ${mapping.glaDescription} (${mapping.periodName})`;
    }

    trackByTaxId(index: number, tax: TaxItem): string {
        return tax.id;
    }

    // =====================
    // AI Validation Workflow
    // =====================

    /**
     * Toggle between list view and validation card view
     */
    toggleViewMode(): void {
        const current = this.viewMode();
        this.viewMode.set(current === 'list' ? 'validation' : 'list');
    }

    /**
     * Load AI proposal for a tax item
     */
    async loadAiProposal(tax: TaxItem): Promise<void> {
        this.addLog(`📋 Starting AI analysis for: ${tax.invoiceNumber || tax.id}`);

        // Check if API key is configured
        if (!hasApiKey('openai')) {
            this.addLog('⚠️ OpenAI API key not configured');
            this.showApiKeyDialog.set(true);
            return;
        }

        if (!tax.documentBaseId || this.glaPeriodMappings().length === 0) {
            this.addLog('❌ Missing document ID or no GLA mappings available');
            this.aiProposal.set(null);
            return;
        }

        this.isLoadingProposal.set(true);
        this.aiProposal.set(null);

        try {
            // First, try to load UBL data from the API
            this.addLog(`📥 Fetching UBL data from API...`);
            let analysisData: any = null;
            let useVisionFallback = false;

            try {
                const ublData = await this.taxApi.getUblData(tax.documentBaseId).toPromise();
                this.ublData.set(ublData || null);

                if (ublData) {
                    const active = ublData.active || ublData;
                    const supplierName = active?.supplierName || active?.['CreditorParty']?.['PartyName']?.[0]?.['Name'] || '';
                    const totalAmount = active?.totalAmount || active?.['LegalMonetaryTotal']?.['PayableAmount']?.['_value'] || 0;

                    // Check if we have meaningful data (not just "Unknown" or empty)
                    const hasMeaningfulData = supplierName && supplierName !== 'Unknown' && totalAmount > 0;

                    if (hasMeaningfulData) {
                        this.addLog(`✅ UBL data received - Supplier: ${supplierName}`);
                        this.addLog(`📊 Invoice details: Amount ${totalAmount}, Tax ${active?.taxPercent || 'N/A'}%`);
                        analysisData = ublData;
                    } else {
                        this.addLog(`⚠️ UBL data is incomplete (Supplier: ${supplierName || 'Unknown'}, Amount: ${totalAmount})`);
                        this.addLog(`🔄 Falling back to Vision API for better extraction...`);
                        useVisionFallback = true;
                    }
                }
            } catch (ublError: any) {
                this.addLog(`⚠️ UBL data unavailable: ${ublError.error?.error?.message || ublError.message || 'API error'}`);
                this.addLog(`🔄 Falling back to Vision API (OCR)...`);
                useVisionFallback = true;
            }

            // Fallback: Use Vision API to OCR the PDF
            if (!analysisData && useVisionFallback) {
                this.addLog(`📄 Fetching PDF document...`);

                try {
                    // Get the PDF blob using existing method
                    const pdfBlob = await this.taxApi.getDocumentPdf(tax.documentBaseId).toPromise();

                    if (pdfBlob) {
                        this.addLog(`✅ PDF fetched (${(pdfBlob.size / 1024).toFixed(1)} KB)`);

                        // Convert to File for Vision API
                        const pdfFile = new File([pdfBlob], `${tax.invoiceNumber || 'document'}.pdf`, { type: 'application/pdf' });

                        // Use Vision to OCR and extract document content
                        this.addLog(`👁️ Analyzing PDF with Vision API (GPT-4o)...`);
                        const visionPrompt = `Extract all text and data from this invoice document. Return a JSON with:
- invoiceNumber: the invoice number
- supplierName: company/supplier name
- totalAmount: total amount with currency
- taxAmount: tax/VAT amount
- taxPercent: VAT percentage
- description: main description of goods/services`;

                        const visionResult = await this.aiChat.analyzeFileWithVision(pdfFile, visionPrompt);
                        this.addLog(`✅ Vision analysis complete`);

                        // Parse the vision result
                        try {
                            const jsonMatch = visionResult.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                analysisData = JSON.parse(jsonMatch[0]);
                                this.addLog(`📊 Extracted: ${analysisData.supplierName || 'Unknown'}, Amount: ${analysisData.totalAmount || 'N/A'}`);
                            } else {
                                analysisData = { rawText: visionResult };
                                this.addLog(`📝 Raw text extracted (${visionResult.length} chars)`);
                            }
                        } catch {
                            analysisData = { rawText: visionResult };
                            this.addLog(`📝 Using raw text for analysis`);
                        }
                    }
                } catch (pdfError: any) {
                    this.addLog(`❌ PDF fetch failed: ${pdfError.message || 'Unknown error'}`);
                }
            }

            if (!analysisData) {
                // FALLBACK: Use the tax item's own data for AI analysis
                this.addLog('⚡ Using fallback: Tax item metadata for AI analysis');
                analysisData = {
                    invoiceNumber: tax.invoiceNumber || 'Unknown',
                    supplierName: tax.documentName || 'Unknown',
                    totalAmount: tax.invoiceAmount || tax.taxAmount || 0,
                    taxPercent: tax.taxPercentage || parseFloat(tax.vat?.replace(',', '.') || '0') || 0,
                    taxType: tax.vatReasone || tax.type || 'Unknown',
                    documentType: tax.documentType?.name || 'Invoice',
                    note: 'Limited data - UBL/PDF unavailable, using basic invoice metadata'
                };
                this.addLog(`📋 Fallback data: ${analysisData.supplierName}, Amount: ${analysisData.totalAmount}, Tax: ${analysisData.taxPercent}%`);
            }

            // Get AI proposal using whatever data we have
            this.addLog(`🤖 Sending request to OpenAI for GLA proposal...`);
            this.addLog(`📤 Including ${this.glaPeriodMappings().length} GLA options`);

            const proposal = await this.aiChat.proposeGlaMapping(
                analysisData,
                this.glaPeriodMappings()
            );

            // Find the suggested mapping details
            const suggestedMapping = this.glaPeriodMappings().find(m => m.id === proposal.mappingId);

            this.addLog(`✨ AI Response received!`);
            this.addLog(`🎯 Proposed GLA: ${suggestedMapping?.glaCode || 'N/A'} - ${suggestedMapping?.glaDescription || 'Unknown'}`);
            this.addLog(`📈 Confidence: ${proposal.confidence}%`);
            this.addLog(`💡 Reasoning: ${proposal.reasoning}`);

            this.aiProposal.set({
                mappingId: proposal.mappingId,
                confidence: proposal.confidence,
                reasoning: proposal.reasoning,
                suggestedMapping: suggestedMapping
            });

            // Auto-select the proposed mapping
            if (proposal.mappingId) {
                this.selectedGlaMapping.set(proposal.mappingId);
            }

            console.log('[TaxManagement] AI proposal loaded:', proposal);
        } catch (error: any) {
            this.addLog(`❌ Error: ${error.message || 'Unknown error'}`);
            console.error('[TaxManagement] Error loading AI proposal:', error);
            this.aiProposal.set({
                mappingId: '',
                confidence: 0,
                reasoning: 'Failed to generate AI proposal'
            });
        } finally {
            this.isLoadingProposal.set(false);
            this.addLog(`✅ AI analysis complete`);
        }
    }

    /**
     * Accept the AI proposal and save the assignment
     */
    async acceptProposal(): Promise<void> {
        const proposal = this.aiProposal();
        const taxId = this.selectedTaxId();

        if (!proposal?.mappingId || !taxId) return;

        this.isSaving.set(true);

        try {
            await this.taxApi.assignBookingPeriodMapping(taxId, proposal.mappingId).toPromise();

            // Update local state
            this.taxes.update(list =>
                list.map(t => t.id === taxId ? {
                    ...t,
                    bookingPeriodReference: proposal.mappingId,
                    periodMappingHumanReadble: proposal.suggestedMapping?.name || proposal.suggestedMapping?.periodMappingHumanReadble
                } : t)
            );

            console.log('[TaxManagement] AI proposal accepted:', proposal.mappingId);

            // Move to next item
            this.isSaving.set(false);
            if (this.hasNextTax()) {
                this.selectNextTax();
            }
        } catch (error) {
            console.error('[TaxManagement] Error accepting proposal:', error);
            this.isSaving.set(false);
        }
    }

    /**
     * Show change options (opens dropdown / allows manual selection)
     */
    showChangeOptions = signal<boolean>(false);

    openChangeDialog(): void {
        this.showChangeOptions.set(true);
    }

    /**
     * Save manual selection and move to next
     */
    async saveManualSelection(): Promise<void> {
        const mappingId = this.selectedGlaMapping();
        const taxId = this.selectedTaxId();

        if (!mappingId || !taxId) return;

        this.isSaving.set(true);

        try {
            await this.taxApi.assignBookingPeriodMapping(taxId, mappingId).toPromise();

            // Find the mapping details
            const mapping = this.glaPeriodMappings().find(m => m.id === mappingId);

            // Update local state
            this.taxes.update(list =>
                list.map(t => t.id === taxId ? {
                    ...t,
                    bookingPeriodReference: mappingId,
                    periodMappingHumanReadble: mapping?.name || mapping?.periodMappingHumanReadble
                } : t)
            );

            console.log('[TaxManagement] Manual selection saved:', mappingId);

            // Hide change options and move to next
            this.showChangeOptions.set(false);
            this.isSaving.set(false);
            if (this.hasNextTax()) {
                this.selectNextTax();
            }
        } catch (error) {
            console.error('[TaxManagement] Error saving manual selection:', error);
            this.isSaving.set(false);
        }
    }

    /**
     * Get confidence color class based on level
     */
    getConfidenceColor(confidence: number): string {
        if (confidence >= 80) return 'confidence-high';
        if (confidence >= 50) return 'confidence-medium';
        return 'confidence-low';
    }

    /**
     * Get confidence bar style
     */
    getConfidenceBarStyle(confidence: number): { [key: string]: string } {
        return {
            width: `${confidence}%`,
            background: confidence >= 80 ? 'var(--green-500)' :
                confidence >= 50 ? 'var(--yellow-500)' : 'var(--red-500)'
        };
    }
}
