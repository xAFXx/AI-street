import {Component, Injector, Input, OnInit, ViewChild, OnDestroy, ChangeDetectorRef} from '@angular/core';

import {BsModalRef} from 'ngx-bootstrap/modal';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {BehaviorSubject, Subject} from 'rxjs';

import {Paginator} from 'primeng/paginator';
import {Table} from 'primeng/table';
import {
    ApiConfServiceProxy, IApiCallsOutputDto, IExecuteApiCallInputDto, JsonEditorService
} from "../../shared";
import {distinctUntilChanged, finalize, takeUntil} from "rxjs/operators";
import {JsonEditorComponent, JsonEditorOptions} from "ang-jsoneditor";
import {ExecuteApiService} from "./execute-api.service";
import {DataLookup, IExtendedApiCallHeadersDto, StringifiedHeadersDictionary} from "./models";
import {AppComponentBase, appModuleAnimation, PrimengTableHelper} from "@axilla/axilla-shared";

@Component({
    selector: 'execute-api-modal',
    templateUrl: './execute-api-modal.component.html',
    styleUrls: ['execute-api-modal.component.less']
})
export class ExecuteApiModalComponent extends AppComponentBase implements OnInit, OnDestroy {
    @Input() apiCall: IApiCallsOutputDto;
    @Input() appId: string;
    @Input() channelId: string;

    protected active = false;
    protected saving = false;
    protected isRunning = false;

    executeApiModalForm: FormGroup;

    editorOptions: JsonEditorOptions;
    openedValue: string;
    currentHadersPage = 1;
    currentLookupPage = 1;

    @ViewChild(JsonEditorComponent, {static: true}) bodyEditor: JsonEditorComponent;
    @ViewChild(JsonEditorComponent, {static: true}) resultEditor: JsonEditorComponent;

    @ViewChild('dataTable', {static: true}) dataTable: Table;
    @ViewChild('paginator', {static: true}) paginator: Paginator;
    @ViewChild('dataLookupDataTable', {static: true}) dataLookupDataTable: Table;
    @ViewChild('dataLookupPaginator', {static: true}) dataLookupPaginator: Paginator;

    protected bodyPrimengTableHelper: PrimengTableHelper;
    protected dataLookupPrimengTableHelper: PrimengTableHelper;

    private readonly destroy$ = new Subject<void>();

    constructor(
        injector: Injector,
        private _modal: BsModalRef,
        private formBuilder: FormBuilder,
        private apiConfServiceProxy: ApiConfServiceProxy,
        private executeApiService: ExecuteApiService,
        public _jsonEditorService: JsonEditorService,
        private cdr: ChangeDetectorRef
    ) {
        super(injector);

        this.editorOptions = this._jsonEditorService.initEditor();

        this.bodyPrimengTableHelper = new PrimengTableHelper();
        this.dataLookupPrimengTableHelper = new PrimengTableHelper();
    }

    ngOnInit() {
        this.executeApiModalForm = this.formBuilder.group({
            headers: new FormArray([]),
            body: ['', null],
            dataLookup: new FormArray([]),
            result: ['', null]
        });
    }

    ngAfterViewInit(): void {
        this.initialize();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    //#region Form

    private initialize() {
        const call = this.apiCall;

        const headers = call.headers;

        if (headers?.length > 0) {
            for (const header of headers) {
                this.executeApiService.addHeaderRow(header);
            }
        }

        const body = call.body;
        if (body) {
            this.body = JSON.parse(body);
        }

        this.setDatatableData();
        this.setDataLookupDatatableData();

        this.cdr.markForCheck();
    }

    get f() { return this.executeApiModalForm; }
    get fc() { return this.f.controls; }

    //#region Header
    get headers(): FormArray {
        return this.fc.headers as FormArray;
    }

    getHeaderIndex(index: number) {
        const i = index;
        return i * this.currentHadersPage;
    }

    deleteHeaderItem(item: IExtendedApiCallHeadersDto) {
        this.executeApiModalForm.get('headers').markAsDirty();

        this.apiCallHeaders = Object.assign([], this.apiCallHeaders.filter(obj => obj.id !== item.id));
        this.setDatatableData();
    }

    count= 1;

    onHeaderInteraction(data?: any) {
        let selectedItem = null;
        let index = null;
        let original = null;

        if (data) {
            selectedItem = data.selected;
            original = data.original;
            index = data.index;

            if (original) {
                if (this.executeApiService.ifHeaderExist(data.index)) {
                    this.apiCallHeaders[index] = original;
                } else {
                    this.apiCallHeaders.push(original);
                }
            }

            this.upsertHeader(selectedItem);
            this.setDatatableData();

            if (!data.initialState) {
                this.executeApiModalForm.get('headers').markAsDirty();
            }
        }
    }

    private upsertHeader(item: any): void {
        const index = this.headers.controls.findIndex(
            c => c.value.id === item.id // or compare by name
        );

        if (index > -1) {
            this.headers.at(index).patchValue(item);
        } else {
            // add new
            this.headers.push(
                this.formBuilder.group({
                    id: [item.id, null],
                    headerName: [item.headerName, null],
                    headerValue: [item.headerValue, null],
                    headerResolvedValue: [item.headerResolvedValue, null]
                })
            );
        }
    }

    addHeader() {
        this.executeApiService.addEmptyHeaderRow();
        this._addEmptyHeaderField();
    }

    private _addEmptyHeaderField() {
        this.setDatatableData();
    }

    setDatatableData() {
        this.primengTableHelper.records = Object.assign([], this.apiCallHeaders.slice(0, this.primengTableHelper.defaultRecordsCountPerPage));
        this.primengTableHelper.totalRecordsCount = this.apiCallHeaders.length;
    }

    protected removeHeader(propertyId: any) {
        this.headers.removeAt(propertyId);
    }
    protected clearHeaders() {
        this.headers.clear();
    }

    get apiCallHeaders(): IExtendedApiCallHeadersDto[] {
        return this.executeApiService.apiCallHeaders;
    }

    set apiCallHeaders(items: IExtendedApiCallHeadersDto[]) {
        this.executeApiService.apiCallHeaders = items;
    }

    get isPrevHeaderIsEmpty(): boolean {
        return this.executeApiService.isPrevHeaderIsEmpty;
    }

    onPagingHeaderItem(event?: any) {
        if (!event) {
            this.currentHadersPage = 1;
            const skipCount = 0;
            this.primengTableHelper.records = Object.assign([], this.apiCallHeaders.slice(skipCount, (skipCount + this.primengTableHelper.defaultRecordsCountPerPage)));
            this.primengTableHelper.totalRecordsCount = this.apiCallHeaders.length;
            return;
        }
        this.currentHadersPage = event.page;

        const skipCount = event.page * event.rows;
        this.primengTableHelper.records = Object.assign([], this.apiCallHeaders.slice(skipCount, (skipCount + event.rows)));
        this.primengTableHelper.totalRecordsCount = this.apiCallHeaders.length;
    }

    private updateExtendedApiCallHeaderByIndex(
        index: number,
        patch: Partial<IExtendedApiCallHeadersDto>
    ): void {
        if (index < 0 || index >= this.apiCallHeaders.length) {
            throw new Error(`Index ${index} is out of bounds.`);
        }

        const current = this.apiCallHeaders[index] as IExtendedApiCallHeadersDto;

        const updated: IExtendedApiCallHeadersDto = {
            ...current,
            ...patch,
        };

        this.apiCallHeaders = [
            ...this.apiCallHeaders.slice(0, index),
            updated,
            ...this.apiCallHeaders.slice(index + 1),
        ];
    }

    //#endregion Header

    //#region Lookup
    get dataLookup(): FormArray {
        return this.fc.dataLookup as FormArray;
    }

    addDataLookup() {
        this.executeApiService.addLookupRow();
        this._addEmptyLookupField();
    }

    getLookupIndex(index: number) {
        const i = index;
        return i * this.currentHadersPage;
    }

    deleteLookupItem(item: DataLookup) {
        this.executeApiModalForm.get('dataLookup').markAsDirty();

        this.apiCallLookups = Object.assign([], this.apiCallLookups.filter(obj => obj.id !== item.id));
        this.setDataLookupDatatableData();
    }

    private _addEmptyLookupField() {
        this.setDataLookupDatatableData();
    }

    onLookupInteraction(data?: any) {
        let selectedItem = null;
        let index = null;

        if (data) {
            selectedItem = data.selected;
            index = data.index;

            if (selectedItem) {
                if (this.executeApiService.ifLookupExist(data.index)) {
                    this.apiCallLookups[index] = selectedItem;
                } else {
                    this.apiCallLookups.push(selectedItem);
                }
            }

            this.upsertDataLookup(selectedItem);
            this.setDataLookupDatatableData();

            if (!data.initialState) {
                this.executeApiModalForm.get('dataLookup').markAsDirty();
            }

            if (selectedItem.value) {
                this.resolveDataLookupPlaceholders();
                this.setDatatableData();
            }
        }
    }

    private upsertDataLookup(item: DataLookup): void {
        const index = this.dataLookup.controls.findIndex(
            c => c.value.id === item.id // or compare by name
        );

        if (index > -1) {
            this.dataLookup.at(index).patchValue(item);
        } else {
            // add new
            this.dataLookup.push(
                this.formBuilder.group({
                    id: [item.id],
                    value: [item.value],
                    name: [item.name]
                })
            );
        }
    }

    private applyLookupsToArray(
        arrayName: 'headers' | 'body' | 'dataLookup',
        array: FormArray,
        lookups: DataLookup[],
        sourceField: string,     // e.g. 'value'
        resolvedField: string    // e.g. 'headerResolvedValue' or 'bodyResolvedValue'
    ): void {
        for (let i = 0; i < array.length; i++) {
            let row = array.at(i);

            if (!(row instanceof FormGroup)) { continue; }

            const sourceValue = row.get(sourceField)?.value;
            const toBeResolvedValue = row.get(resolvedField)?.value; // should exist if your row schema is correct

            if (!sourceValue) { continue; }

            const resolved = typeof sourceValue === 'string'
                ? this.replaceLookupsInText(sourceValue, lookups)
                : '';

            if (toBeResolvedValue === resolved) {  continue; }
            row.get(resolvedField).setValue(resolved, { emitEvent: false });

            //update data
            switch (arrayName) {
                case 'headers':
                    this.updateExtendedApiCallHeaderByIndex(i, { headerResolvedValue: resolved });
                    break;
            }
        }
    }

    private replaceLookupsInText(text: string, lookups: DataLookup[]): string {
        if (typeof text !== 'string' || !text || !lookups?.length) {
            return text ?? '';
        }

        let result = text;

        for (const l of lookups) {
            if (!l?.name) {
                continue;
            }

            const token = `{{${l.name}}}`;
            if (result.includes(token)) {
                result = result.split(token).join(l.value ?? '');
                return result;
            }
        }

        return result;
    }

    public resolveDataLookupPlaceholders(): void {
        const lookups = (this.dataLookupArray.value ?? []) as DataLookup[];

        this.applyLookupsToArray('headers', this.headersArray, lookups, 'headerValue', 'headerResolvedValue');
        //this.applyLookupsToArray(this.headersArray, lookups, 'value', 'headerValue', 'headerResolvedValue');
    }

    private getArray(name: 'headers' | 'body' | 'dataLookup'): FormArray {
        return this.executeApiModalForm.get(name) as FormArray;
    }

    private get headersArray(): FormArray {
        return this.getArray('headers');
    }

    private get dataLookupArray(): FormArray {
        return this.getArray('dataLookup');
    }

    setDataLookupDatatableData() {
        this.dataLookupPrimengTableHelper.records = Object.assign([], this.apiCallLookups.slice(0, this.primengTableHelper.defaultRecordsCountPerPage));
        this.dataLookupPrimengTableHelper.totalRecordsCount = this.apiCallLookups.length;
    }

    protected removeDataLookup(propertyId: any) {
        this.dataLookup.removeAt(propertyId);
    }

    protected clearDataLookup() {
        this.dataLookup.clear();
    }

    get apiCallLookups(): DataLookup[] {
        return this.executeApiService.apiCallLookup;
    }

    set apiCallLookups(items: DataLookup[]) {
        this.executeApiService.apiCallLookup = items;
    }

    get isPrevLookupIsEmpty(): boolean {
        return this.executeApiService.isPrevLookupIsEmpty;
    }

    onPagingLookupItem(event?: any) {
        if (!event) {
            this.currentLookupPage = 1;
            const skipCount = 0;
            this.dataLookupPrimengTableHelper.records = Object.assign([], this.apiCallLookups.slice(skipCount, (skipCount + this.primengTableHelper.defaultRecordsCountPerPage)));
            this.dataLookupPrimengTableHelper.totalRecordsCount = this.apiCallLookups.length;
            return;
        }
        this.currentLookupPage = event.page;

        const skipCount = event.page * event.rows;
        this.dataLookupPrimengTableHelper.records = Object.assign([], this.apiCallLookups.slice(skipCount, (skipCount + event.rows)));
        this.dataLookupPrimengTableHelper.totalRecordsCount = this.apiCallLookups.length;
    }
    //#endregion Lookup

    //#region Result
    set result(value: string) {
        this.executeApiModalForm.get('result').setValue(value);
    }
    //#endregion Result

    //#region Body
    set body(value: string) {
        this.executeApiModalForm.get('body').setValue(value);
    }
    get body(): string {
        return this.executeApiModalForm.get('body').value;
    }
    //#endregion Body

    //#endregion Form

    private resolve(value: string): string {
        return this.replaceLookupsInText(value, this.apiCallLookups);
    }


    run(): void {
        if (this.isRunning) {
            return;
        }
        this.isRunning = true;

        const body = this.resolve(JSON.stringify(this.body) ?? '');
        const url = this.resolve(this.apiCall.call);

        const input = {
            body: body,
            headers: undefined,
            method: this.apiCall.method,
            url: url,
            channelId: this.channelId,
            outputFormating: undefined
        } as IExecuteApiCallInputDto;

        if (this.apiCallHeaders?.length > 0) {
            const headersDict = this.toHeadersDictionary(this.apiCallHeaders);
            const headersJson = JSON.stringify(headersDict);

            input.headers = headersJson;
        }

        this.apiConfServiceProxy.executeCall(input)
            .pipe(
                finalize(() => this.isRunning = false)
            )
            .subscribe((result) => {
                if (result.result) {
                    this.result = JSON.parse(result.result);
                }
            });
    }

    //#region Helpers
    toHeadersDictionary(
        headers: IExtendedApiCallHeadersDto[]
    ): StringifiedHeadersDictionary {
        return headers.reduce<Record<string, string>>((acc, header) => {
            if (!header.name) {
                return acc;
            }

            const resolvedValue = header.headerResolvedValue ?? header.value;

            if (resolvedValue === undefined) {
                return acc;
            }

            acc[header.name] = String(resolvedValue);
            return acc;
        }, {});
    }
    //#endregion Helpers

    close(): void {
        this.executeApiModalForm.reset();
        this.executeApiService.reset();

        this._modal.hide();
    }

}
