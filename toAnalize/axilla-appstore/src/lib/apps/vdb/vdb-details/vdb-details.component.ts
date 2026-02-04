import {Component, Injector, OnDestroy, OnInit, ViewChild, ChangeDetectorRef} from '@angular/core';

import {ActivatedRoute, Router} from '@angular/router';
import {FormControl, FormGroup} from '@angular/forms';

import {Table} from 'primeng/table';
import {Paginator} from 'primeng/paginator';
import {LazyLoadEvent} from 'primeng/api';
import { TabsetComponent } from 'ngx-bootstrap/tabs';
import {PermissionCheckerService} from 'abp-ng2-module';

import {
    FieldTypes,
    IPagedResultDtoOfVirtualDbRowDto,
    ISaveToVirtualDbInput,
    IVirtualDbRowDto,
    VDBServiceProxy
} from "../../../shared/service-proxies/service-proxies";

import _ from 'lodash';

import {VDBDynamicTableBuilder} from '../vdb-dynamic-table-builder/vdb-dynamic-table-builder.component';

import {
    concatMap,
    debounceTime,
    distinctUntilChanged,
    finalize,
    map,
    startWith,
    take,
    takeUntil,
    tap
} from "rxjs/operators";
import {combineLatest, Observable, Subject} from "rxjs";

import {BsModalService} from 'ngx-bootstrap/modal';
import {AddToVDBModalComponent} from '../modals/add-to-vdb-modal.component';

import {
    AppComponentBase,
    appModuleAnimation,
    ColumnDefinition,
    ConfirmationModalComponent,
    PrimengTableHelper
} from '@axilla/axilla-shared';

import {VdbService} from '../common/services/vdb.service';
import {AppStorePermissions} from '../../../shared';

declare let abp: any;

@Component({
    selector: 'app-vdb-details',
    templateUrl: './vdb-details.component.html',
    styleUrls: ['./vdb-details.component.less'],
    animations: [appModuleAnimation()]
})
export class VdbDetailsComponent extends AppComponentBase implements OnInit, OnDestroy {
    @ViewChild('tabset', {static: false}) tabset: TabsetComponent;
    @ViewChild('dataTable', {static: true}) dataTable: Table;
    @ViewChild('paginator', {static: true}) paginator: Paginator;
    mode: string;
    @ViewChild('deleteModal', {static: true}) deleteModal: ConfirmationModalComponent;
    databaseTableHelper: PrimengTableHelper;
    vdbName: string;
    databaseForm: FormGroup;
    openedItem: string;
    openedValue = {};
    customActions: IVirtualDbRowDto[];
    dynamicData: IVirtualDbRowDto[];
    dynamicDataTotal: number;
    columns: any[] = [];
    //check if this is SKIM table
    isSkim: boolean = false;
    fullTextSearch: false;
    keyToDelete: string;
    private readonly destroy$ = new Subject<void>();
    private readonly vdbSearchTerm = new Subject<void>();
    private readonly vdbSearchTerm$ = this.vdbSearchTerm.asObservable()
        .pipe(
            debounceTime(1000),
            concatMap(() => this.getDatabasesOnPagination$())
        );
    private _skimDbName = 'Skim';
    private _vdbData: any;
    //create dynamic SearchAndSelectComponent depends on Provided type
    private _vdbDynamicTable: VDBDynamicTableBuilder;
    private readonly searchTerm = new Subject<any>();
    private readonly searchTerm$ = this.searchTerm.asObservable()
        .pipe(
            debounceTime(1000),
            concatMap((tableHelper: any) => this.onPagination$(tableHelper))
        );

    protected exclusiveFromUrl: string | null = null;
    protected selectedColumnsFromUrlRaw: string[] | null = null;
    protected initializationFromUrl = false;
    protected skimLoading = false;
    protected isShowOverview = true;

    get AppStorePermissions(): typeof AppStorePermissions {
        return AppStorePermissions;
    }

    get hasPermission(): boolean {
        return this._permissionCheckerService.isGranted('Pages.App.VDB.View.Skim')
            || this._permissionCheckerService.isGranted('Pages.App.VDB.View.Overview');
    }

    get databaseKey() {
        if (this.databaseForm) {
            return this.databaseForm.get('key').value;
        }
        return '';
    }

    set databaseKey(value: string) {
        if (this.databaseForm) {
            this.databaseForm.get('key').setValue(value);
        }
    }

    get fullText() {
        if (this.databaseForm) {
            return this.databaseForm.get('fullText').value;
        }
        return '';
    }

    set fullText(value: string) {
        if (this.databaseForm) {
            this.databaseForm.get('fullText').setValue(value);
        }
    }

    get customActions2(): any[] {
        return this.vdbService.customActions;
    }

    get isCustomActionsAvailable(): boolean {
        return this.vdbService.isCustomActionsAvailable;
    }

    private _selectedColumns: any[] = [];

    get selectedColumns(): any[] {
        return this._selectedColumns;
    }

    set selectedColumns(value: any[]) {
        this._selectedColumns = value;

        this._setDynamicColumns();
    }

    @ViewChild('appTableBuilderComponent')
    set searchAndSelectArticle(value: VDBDynamicTableBuilder) {
        this._vdbDynamicTable = value;

        this._setDynamicColumns();
    }

    private _tabsetInterval: any;

    constructor(
        injector: Injector,
        private _activatedRoute: ActivatedRoute,
        private _router: Router,
        public _vdbService: VDBServiceProxy,
        public vdbService: VdbService,
        private readonly modalService: BsModalService,
        private _permissionCheckerService: PermissionCheckerService,
        private cdr: ChangeDetectorRef
    ) {
        super(injector);

        this.databaseTableHelper = new PrimengTableHelper();
        this.databaseTableHelper.defaultRecordsCountPerPage = 10;//l
        this.mode = abp.setting.get("App.VDB.JsonView.DefaultView") as any;
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();

        if (this._tabsetInterval) {
            clearInterval(this._tabsetInterval);
        }
    }

    ngOnInit(): void {
        this._init();

        this._activatedRoute.paramMap
            .pipe(
                takeUntil(this.destroy$)
            )
            .subscribe(params => {
                this.closeItem();
                this.selectedColumns = [];

                this._init();
            });
    }

    selectTab(index: number) {
        const maxTries = 50; // 50 * 100ms = 5 seconds
        let tries = 0;

        // clear previous interval if any
        if (this._tabsetInterval) {
            clearInterval(this._tabsetInterval);
        }

        this._tabsetInterval = setInterval(() => {
            tries++;

            if (this.tabset && this.tabset.tabs && this.tabset.tabs[index]) {
                this.tabset.tabs[index].active = true;
                clearInterval(this._tabsetInterval);
                this._tabsetInterval = null;
            }

            if (tries >= maxTries) {
                // stop trying after some time
                clearInterval(this._tabsetInterval);
                this._tabsetInterval = null;
                // optional: console.warn('Tabset not found in time');
            }
        }, 100); // check every 100ms
    }

    back() {
        this._router.navigate(["/app/appstore/vdb"]);
    }

    vdbsearch() {
        this.vdbSearchTerm.next();
    }

    getDatabases() {
        this.databaseTableHelper.showLoadingIndicator();
        this._vdbService.getSearchVirtualDbRows(
            undefined,
            this.vdbName,
            undefined,
            this.fullText || undefined,
            undefined,
            false,
            undefined, 0,
            this.databaseTableHelper.defaultRecordsCountPerPage)
            .subscribe((result: IPagedResultDtoOfVirtualDbRowDto) => {
                this.databaseTableHelper.records = result.items;
                this.databaseTableHelper.totalRecordsCount = result.totalCount;
                this.databaseTableHelper.hideLoadingIndicator();

                this._setVDBTable(result);
            });
    }

    getDatabasesOnPagination(event?: LazyLoadEvent) {
        this.getDatabasesOnPagination$(event)
            .pipe(
                take(1)
            )
            .subscribe();
    }

    getCustomActions() {
        this.vdbService.getCustomActions$(this.vdbName)
            .pipe(
                take(1)
            )
            .subscribe((result) => {
                let customActions = result.items
            });
    }

    //#region Skim representation

    getDatabasesOnPagination$(event?: LazyLoadEvent): Observable<IPagedResultDtoOfVirtualDbRowDto> {
        this._vdbDynamicTable.primengTableHelper.showLoadingIndicator();
        this.databaseTableHelper.showLoadingIndicator();

        return this._vdbService.getSearchVirtualDbRows(
            this.databaseKey || "",
            this.vdbName,
            undefined,
            this.fullText || undefined,
            undefined,
            false,
            this._getSorting(),
            this._getSkipCount(event),
            this._getMaxResultCount(event)
        )
            .pipe(
                tap((result: IPagedResultDtoOfVirtualDbRowDto) => {
                    let items = this._checkAndinitNullableData(result);
                    this.databaseTableHelper.records = items;
                    this.databaseTableHelper.totalRecordsCount = result.totalCount;
                    this.databaseTableHelper.hideLoadingIndicator();
                    this._vdbDynamicTable.primengTableHelper.hideLoadingIndicator();

                    this._setVDBTable(result);
                })
            );
    }

    openItem(key: string, value: string) {
        this.openedItem = key;
        this.openedValue = JSON.parse(value);
    }

    closeItem() {
        this.openedItem = "";
        this.openedValue = {};
    }

    changeItem(json: any) {
        this.databaseTableHelper.records.find(x => x.key === this.openedItem).value = JSON.stringify(json);
        this.openedValue = json;

        this.getDatabasesOnPagination();
    }

    setNewMode(mode: string) {
        this.mode = mode;
    }

    getVdbSkim(fromUrl: boolean = false) {
        if (this.skimLoading) {
            return;
        }
        this.skimLoading = true;

        this.databaseTableHelper.showLoadingIndicator();
        this._vdbService.getVirtualDbRows(
            this.vdbName,
            "Skim",
            undefined,
            undefined,
            undefined,
            false,
            undefined,
            0, this.databaseTableHelper.defaultRecordsCountPerPage)
            .pipe(
                finalize(() => this.skimLoading = false)
            )
            .subscribe((result: any) => {
                if (result && result.items.length > 0) {
                    this._vdbData = JSON.parse(result.items[0].value);

                    let columns = this._vdbData.Columns;
                    if (columns && Array.isArray(columns)) {
                        // Create a Set of existing column labels to avoid duplicates
                        const existing = new Set(this.columns.map(c => c.label));

                        columns
                            .filter(col => col !== 'Key')  // ignore "Key"
                            .forEach(col => {
                                if (!existing.has(col)) {
                                    this.columns.push({
                                        label: col,
                                        value: {name: col}
                                    });
                                    existing.add(col);
                                }
                            });
                    }

                    if (fromUrl) {
                        if (this.selectedColumnsFromUrlRaw && Array.isArray(this.selectedColumnsFromUrlRaw)) {
                            if (this.selectedColumnsFromUrlRaw.length === 0) {
                                const existingSelected = new Set([]);
                                this.columns.forEach(col => {
                                    if (!existingSelected.has(col.label)) {
                                        this.selectedColumns.push({name: col.label});
                                        existingSelected.add(col);
                                    }
                                });
                            } else {
                                const existingSelected = new Set(this.selectedColumns ?? []);
                                this.selectedColumnsFromUrlRaw.forEach(col => {
                                    if (!existingSelected.has(col)) {
                                        this.selectedColumns.push({name: col});
                                        existingSelected.add(col);
                                    }
                                });
                            }
                        }
                    } else {
                        let selectedColumns = this._vdbData.SelectedColumns;
                        if (selectedColumns && Array.isArray(selectedColumns)) {
                            const existingSelected = new Set(this.selectedColumns.map(c => c.name));

                            selectedColumns.forEach(col => {
                                if (!existingSelected.has(col)) {
                                    this.selectedColumns.push({name: col});
                                    existingSelected.add(col);
                                }
                            });
                        } else {
                            this.selectedColumns = [];
                        }
                    }
                }

                this._setDynamicColumns();
                this.cdr.detectChanges();

                this.databaseTableHelper.hideLoadingIndicator();
            });
    }

    saveVdbRow() {
        const body = {
            key: this.vdbName,
            innerObject: this._vdbData,
            databaseName: this._skimDbName
        } as ISaveToVirtualDbInput;

        this._vdbService.saveToVirtualDb(body)
            .subscribe(() => {
                abp.notify.success("The row with key '" + this.openedItem + "' was successfully saved!");

                this.getDatabasesOnPagination();
            });
    }

    selectColumns(event) {
        let dataToSave = event.value;

        let arr = _.map(dataToSave,
            (item: any) => {
                return item.name;
            });


        this._vdbData['SelectedColumns'] = arr;

        this.saveVdbRow();
    }

    onSearchChange(searchString: string) {
        //this.getArticles();
    }

    search(tableHelper: any) {

        if (!this.fullTextSearch) {

            this.databaseKey = tableHelper.key;
            this.fullText = tableHelper.fullText;

            this.vdbSearchTerm.next();
        } else {
            this.searchTerm.next(tableHelper);
        }

    }

    //#region initialization Basic SearchAndSelectComponent

    onPagination(tableHelper: any) {
        this.onPagination$(tableHelper)
            .pipe(
                take(1)
            )
            .subscribe();
    }

    onPagination$(tableHelper: any): Observable<IPagedResultDtoOfVirtualDbRowDto> {
        this._vdbDynamicTable.primengTableHelper.showLoadingIndicator();
        this.databaseTableHelper.showLoadingIndicator();

        let key = tableHelper.key || this.databaseKey || "";

        return this._vdbService.getSearchVirtualDbRows(
            key,
            this.vdbName,
            undefined,
            this.fullText || undefined,
            tableHelper.query || undefined,
            false,
            tableHelper.sorting || "",
            tableHelper.skipCount || 0,
            tableHelper.maxResultCount || 10
        ).pipe(
            tap((result: IPagedResultDtoOfVirtualDbRowDto) => {
                this.databaseTableHelper.records = result.items;
                this.databaseTableHelper.totalRecordsCount = result.totalCount;
                this.databaseTableHelper.hideLoadingIndicator();
                this._vdbDynamicTable.primengTableHelper.hideLoadingIndicator();
                this._setVDBTable(result);
            })
        );
    }

    addToVDB() {
        const createVDB = this.modalService.show(AddToVDBModalComponent, {
            'initialState': {
                vdbName: this.vdbName
            },
            'backdrop': 'static',
            'keyboard': false,
            'class': "w-80"
        });

        let createVDBComponent = createVDB.content as AddToVDBModalComponent;
        createVDBComponent
            .submit
            .subscribe((data: any) => {
                const input = {
                    databaseName: data.vdbName,
                    key: data.keyName,
                    innerObject: data.innerObject,
                    ttl: data.ttl || 1 // 1 day
                } as ISaveToVirtualDbInput;

                this._vdbService.saveToVirtualDb(input)
                    .subscribe(() => {
                        this.getDatabasesOnPagination();
                    });
            });
    }

    deleteByKeyFromVDB(key: string) {
        if (key) {
            this.keyToDelete = key;
            this.deleteModal.show(key);
        }
    }

    confirmDelete() {
        this._vdbService.deleteVirtualDbKey(this.vdbName, this.keyToDelete)
            .subscribe(() => {
                abp.notify.success("The vdb key was successfully deleted");
                this.getDatabasesOnPagination();
                this.keyToDelete = null;
            });
    }

    private _init() {
        this._initUrlParamsListener();

        this.vdbName = this._activatedRoute.snapshot.params['id'];
        if (this.vdbName == 'Skim') {
            this.isSkim = true;
        }

        this._initDatabaseKeySearchForm();
        this.getDatabases();

        this.getVdbSkim(this.initializationFromUrl);

        this.searchTerm$.subscribe();
        this.vdbSearchTerm$.subscribe();

        this.getCustomActions();
    }

    private _initUrlParamsListener(): void {
        this._activatedRoute.queryParamMap.subscribe(params => {
            this.exclusiveFromUrl = params.get('Exclusive') || params.get('exclusive');
            const hasSelectedColumns = params.has('Skim') || params.get('skim');

            if (!this.exclusiveFromUrl && !hasSelectedColumns) {
                return;
            }

            if (hasSelectedColumns) {
                this.initializationFromUrl = true;
                let selectedColumnsRaw = (params.get('Skim') || params.get('skim')) ?? "";

                this.selectedColumnsFromUrlRaw = selectedColumnsRaw
                    .split(',')
                    .map(x => x.trim())
                    .filter(x => x.length > 0);
            } else {
                this.selectedColumnsFromUrlRaw = null;
            }

            if (hasSelectedColumns) {
                if (this.exclusiveFromUrl &&
                    (this.exclusiveFromUrl === 'true' || this.exclusiveFromUrl === '1' || this.exclusiveFromUrl === '')) {
                    this.isShowOverview = false;
                    this.selectTab(0);
                } else {
                    this.isShowOverview = true;
                    this.isSkim = false;
                    this.selectTab(1);
                }
            } else {
                if (this.exclusiveFromUrl &&
                    (this.exclusiveFromUrl === 'true' || this.exclusiveFromUrl === '1' || this.exclusiveFromUrl === '')) {
                    this.isShowOverview = true;
                    this.isSkim = true;
                    this.selectTab(0);
                } else {
                    this.isShowOverview = true;
                    this.isSkim = false;
                    this.selectTab(0);
                }
            }
        });
    }

    private _initDatabaseKeySearchForm() {
        this.databaseForm = new FormGroup({
            key: new FormControl(''),
            fullText: new FormControl('')
        });

        this.databaseForm.get('key')!.setValue('');
        this.databaseForm.get('fullText')!.setValue('');

        combineLatest([
            this.databaseForm.controls['key']!
                .valueChanges
                .pipe(
                    startWith(this.databaseForm.controls['key'].value),
                    debounceTime(300),
                    distinctUntilChanged()
                ),

            this.databaseForm.controls['fullText']!
                .valueChanges
                .pipe(
                    startWith(this.databaseForm.controls['fullText'].value),
                    debounceTime(300),
                    distinctUntilChanged()
                )
        ])
            .pipe(
                map(([key, fullText]) => ({key, fullText})),
                takeUntil(this.destroy$)
            )
            .subscribe(values => {
                this.vdbService.setSearch(values.key);

                this.vdbsearch();
            });

        this.subscribeToSearchService();
    }

    private subscribeToSearchService() {
        this.vdbService.search$
            .pipe(
                takeUntil(this.destroy$)
            ).subscribe(value => {
            if (this.databaseForm.get('key')!.value !== value) {
                this.databaseForm.get('key')!.setValue(value, {emitEvent: false});
            }
        });
    }

    private _getSorting(): string | undefined {
        return this.dataTable ? this.databaseTableHelper.getSorting(this.dataTable) : undefined;
    }

    private _getSkipCount(event?: LazyLoadEvent): number | undefined {

        if (this.paginator) {
            return this.databaseTableHelper.getSkipCount(this.paginator, event);
        }

        if (event && event.first != undefined) {
            return event.first;
        }

        return 0;
    }

    private _getMaxResultCount(event?: LazyLoadEvent): number | undefined {
        return this.paginator ? this.databaseTableHelper.getMaxResultCount(this.paginator, event) : this.databaseTableHelper.defaultRecordsCountPerPage;
    }

    private _checkAndinitNullableData(result: IPagedResultDtoOfVirtualDbRowDto): any {
        const items = result.items;

        let records = _.map(items,
            (item: IVirtualDbRowDto) => {
                if (item.value == null) {
                    let arr = {};
                    arr['Key'] = item.key;
                    item.value = JSON.stringify(Object.assign({}, arr));
                }
                return item;
            });

        return records;
    }

    private _setVDBTable(result: IPagedResultDtoOfVirtualDbRowDto) {
        this.dynamicData = result.items;
        this.dynamicDataTotal = result.totalCount;

        this._vdbDynamicTable.primengTableHelper.records = result.items;
        this._vdbDynamicTable.primengTableHelper.totalRecordsCount = result.totalCount;

        this._vdbDynamicTable.primengTableHelper.hideLoadingIndicator();
    }

    private _setDynamicColumns() {
        let columns: ColumnDefinition[] = [];
        for (let i = 0; i < this.selectedColumns.length; i++) {
            const column = this.selectedColumns[i];
            columns.push({field: column.name, header: column.name, sorting: true, type: FieldTypes.Text});
        }

        if (this._vdbDynamicTable) {
            this._vdbDynamicTable.columns = columns;
        }
    }

    //#endregion

    //#endregion Skim representation

}
