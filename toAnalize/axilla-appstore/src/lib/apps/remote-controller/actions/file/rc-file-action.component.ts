import {Component, EventEmitter, Injector, OnInit, Output} from "@angular/core";
import { AppComponentBase } from "@axilla/axilla-shared";
import { FormBuilder, FormControl, FormGroup } from "@angular/forms";
import { Subject } from "rxjs";
import {distinctUntilChanged, filter, takeUntil} from "rxjs/operators";

declare let abp: any;

@Component({
    selector: 'rc-file-action',
    templateUrl: './rc-file-action.component.html',
    styleUrls: ['./rc-file-action.component.less'],
})
export class RcFileActionComponent extends AppComponentBase implements OnInit {

    @Output() itemSelected: EventEmitter<any> = new EventEmitter<any>();

    fileForm: FormGroup;

    destroy$ = new Subject<boolean>();

    // UI state
    isDragOver = false;
    errorMessage: string | null = null;

    // Upload constraints (adjust as needed)
    maxFileSizeMb = 25;
    // Keep accept aligned with allowedMimeTypes / extensions
    accept = '.pdf,.png,.jpg,.jpeg,.txt,.csv,.json';
    allowedExtensionsLabel = 'pdf, png, jpg, jpeg, txt, csv, json';

    private allowedMimeTypes = new Set<string>([
        'application/pdf',
        'image/png',
        'image/jpeg',
        'text/plain',
        'text/csv',
        'application/json',
    ]);

    constructor(
        injector: Injector,
        private formBuilder: FormBuilder,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.fileForm = this.formBuilder.group({
            fileLocation: new FormControl(null),
            base64File: new FormControl(null),
            forceDecodingBase64: new FormControl(false),
            fileName: new FormControl(null),
            mode: new FormControl('overwrite'),
        });

        // // If user switches to LOCATION, clear uploaded file fields
        // this.fileForm.get('mode')?.valueChanges
        //     .pipe(
        //         takeUntil(this.destroy$)
        //     )
        //     .subscribe(mode => {
        //         if (mode === 'LOCATION') {
        //             this.clearFile();
        //         } else {
        //             this.fileForm.get('fileLocation')?.setValue(null);
        //         }
        //     });

        this.fileForm.valueChanges
            .pipe(
                takeUntil(this.destroy$),
                filter(() => this.fileForm.valid),
                distinctUntilChanged((a, b) => JSON.stringify(a) === JSON.stringify(b))
            )
            .subscribe(() => {
                this.emitBase64Selection();
            });
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    // ---------- File input ----------
    async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input?.files?.[0] ?? null;

        // Allow selecting same file again later
        if (input) {
            input.value = '';
        }

        if (!file) {
            return;
        }

        await this.handleFile(file);
    }

    // ---------- Drag & drop ----------
    onDragOver(evt: DragEvent): void {
        evt.preventDefault();
        evt.stopPropagation();
        this.isDragOver = true;
    }

    onDragLeave(evt: DragEvent): void {
        evt.preventDefault();
        evt.stopPropagation();
        this.isDragOver = false;
    }

    async onDrop(evt: DragEvent): Promise<void> {
        evt.preventDefault();
        evt.stopPropagation();
        this.isDragOver = false;

        const file = evt.dataTransfer?.files?.[0] ?? null;
        if (!file) {
            return;
        }

        await this.handleFile(file);
    }

    private emitBase64Selection(): void {
        const { fileLocation, base64File, fileName, forceDecodingBase64, mode } = this.fileForm.value;

        if (!base64File || !fileName) {
            return;
        }

        this.itemSelected.emit({
            data: {
                fileLocation,
                mode,
                fileName,
                base64File,
                forceDecodingBase64,
            }
        });
    }


    // ---------- Core logic ----------
    private async handleFile(file: File): Promise<void> {
        this.errorMessage = null;

        const maxBytes = this.maxFileSizeMb * 1024 * 1024;
        if (file.size > maxBytes) {
            this.errorMessage = `File is too large. Max allowed is ${this.maxFileSizeMb} MB.`;
            this.clearFile();
            return;
        }

        // Some files may have empty type; then validate by extension only
        const ext = this.getFileExtension(file.name);
        const allowedExt = new Set(['pdf', 'png', 'jpg', 'jpeg', 'txt', 'csv', 'json']);

        if ((file.type && !this.allowedMimeTypes.has(file.type)) || (!file.type && !allowedExt.has(ext))) {
            this.errorMessage = `Unsupported file type. Allowed: ${this.allowedExtensionsLabel}.`;
            this.clearFile();
            return;
        }

        try {
            const base64 = await this.readFileAsBase64(file);

            // If you need *pure* base64 without data prefix, strip it:
            // const pureBase64 = base64.split(',')[1] ?? null;

            this.fileForm.patchValue({
                fileName: file.name,
                base64File: base64,
                mode: 'overwrite',
            }, { emitEvent: false });

            this.emitBase64Selection();

        } catch (e: any) {
            this.errorMessage = 'Failed to read file.';
            this.clearFile();
        }
    }

    private readFileAsBase64(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onerror = () => reject(new Error('FileReader error'));
            reader.onload = () => {
                const result = reader.result;
                if (typeof result !== 'string') {
                    reject(new Error('Invalid FileReader result'));
                    return;
                }
                resolve(result); // includes data:*/*;base64, prefix
            };

            reader.readAsDataURL(file);
        });
    }

    private getFileExtension(name: string): string {
        const idx = name.lastIndexOf('.');
        return idx >= 0 ? name.substring(idx + 1).toLowerCase() : '';
    }

    // ---------- Actions ----------
    clearFile(): void {
        this.fileForm.patchValue({
            base64File: null,
            fileName: null,
        }, { emitEvent: false });
    }

    async copyBase64(): Promise<void> {
        const base64 = this.fileForm.value?.base64File;
        if (!base64) {
            return;
        }

        try {
            await navigator.clipboard.writeText(base64);
            abp?.notify?.success?.('Base64 copied to clipboard.');
        } catch {
            abp?.notify?.warn?.('Copy failed (clipboard permission).');
        }
    }
}
