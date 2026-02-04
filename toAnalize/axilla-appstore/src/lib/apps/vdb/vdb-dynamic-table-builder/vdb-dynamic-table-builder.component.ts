import {
  Component,
  Injector,
  ViewEncapsulation,
  OnInit,
  OnDestroy,
  ViewChild,
  Output,
  Input,
  EventEmitter
} from '@angular/core';
import {AppComponentBase, AppConsts, ColumnDefinition} from '@axilla/axilla-shared';

import _ from 'lodash';

import {Paginator} from 'primeng/paginator';
import {Table} from 'primeng/table';
import {LazyLoadEvent} from 'primeng/api'

import {FormControl, FormBuilder, FormGroup} from '@angular/forms';

import {VdbService} from '../common/services/vdb.service';

import {
  debounceTime,
  startWith,
  map,
  distinctUntilChanged,
  takeUntil
} from "rxjs/operators";
import {Subject, combineLatest} from "rxjs";

declare let abp: any;

@Component({
  selector: 'app-vdb-table-builder',
  templateUrl: './vdb-dynamic-table-builder.component.html',
  styleUrls: ['./vdb-dynamic-table-builder.component.less'],
  encapsulation: ViewEncapsulation.None,
})
export class VDBDynamicTableBuilder extends AppComponentBase implements OnInit, OnDestroy {
  @ViewChild('dataTable', {static: true}) dataTable: Table;
  @ViewChild('paginator', {static: true}) paginator: Paginator;

  remoteServiceBaseUrl: string = AppConsts.remoteServiceBaseUrl;

  private readonly destroy$ = new Subject<void>();

  constructor(
    injector: Injector,
    private fb: FormBuilder,
    public vdbService: VdbService
  ) {
    super(injector);

    this.primengTableHelper.defaultRecordsCountPerPage = 10;
    this.primengTableHelper.predefinedRecordsCountPerPage = [10, 25, 50, 100];

    this.mode = abp.setting.get("App.VDB.JsonView.DefaultView") as any;
  }

  ngOnInit(): void {
    this.primengTableHelper.defaultRecordsCountPerPage = 10;

    this.initForm();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  //#region SearchForm
  searchForm: FormGroup;

  initForm() {
    this.searchForm = this.fb.group({
      key: new FormControl(''),
      fullText: new FormControl('')
    });

    combineLatest([
      this.searchForm.controls['key']!
        .valueChanges
        .pipe(
          startWith(this.searchForm.controls['key'].value),
          debounceTime(300),
          distinctUntilChanged()
        ),

      this.searchForm.controls['fullText']!
        .valueChanges
        .pipe(
          startWith(this.searchForm.controls['fullText'].value),
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

        this.onPageChange();
      });


    this.subscribeToSearchService();
  }

  private subscribeToSearchService() {
    this.vdbService.search$
      .pipe(
        takeUntil(this.destroy$)
      ).subscribe(value => {
      if (this.searchForm.get('key')!.value !== value) {
        this.searchForm.get('key')!.setValue(value, {emitEvent: false});
      }
    });
  }

  get controls(): any {
    return this.searchForm.controls;
  }

  addControl(name: string) {
    this.searchForm.addControl(name, new FormControl(''));
  }

  clearControls() {
    const controlKeys = _.filter(Object.keys(this.controls), (item) => {
      return item != 'key'
    });
    const columnKeys = _.map(this.columns, (item) => item.field)

    _.each(controlKeys, (value) => {
      if (!_.includes(columnKeys, value)) {
        this.searchForm.removeControl(value);
      }
    });
  }

  //#endregion SearchForm

  //#region CustomActions

  get customActions(): any[] {
    return this.vdbService.customActions;
  }

  get isCustomActionsAvailable(): boolean {
    return this.vdbService.isCustomActionsAvailable;
  }

  //#endregion CustomActions


  //#region Props
  @Input() isIgnoreId: boolean = true;

  @Input() searchLabel: string;

  @Input() fullTextSearch: boolean = false;


  private _data: any[];
  @Input() set data(value: any[]) {
    this._data = value;

    this._setTable();
  }

  get data(): any[] {
    return this._data;
  }

  private _total: number;
  @Input() set total(value: number) {
    this._total = value;

    this._setTable();
  }

  get total(): number {
    return this._total;
  }

  private _columns: ColumnDefinition[];
  @Input() set columns(value: ColumnDefinition[]) {
    this._columns = value;

    this._initCols();
  }

  get columns(): ColumnDefinition[] {
    return this._columns;
  }

  cols: any[] = [];

  get isColumnSelected(): boolean {
    return this.columnCount > 0;
  }


  get columnCount(): number {
    if (this.columns) {
      return this.columns.length;
    }
    return 0;
  }

  showSearch(): boolean {
    if (this.columnCount < 1) {
      return false;
    }

    if (this.fullTextSearch) {
      return true;
    }

    return true;
  }

  //#endregion

  //#region VDB editor
  mode: string;

  private _vdbName: string;
  @Input() set vdbName(value: string) {
    this._vdbName = value;
  }

  get vdbName(): string {
    return this._vdbName;
  }

  openedValue = {};
  openedItem: string;

  openItem(event, rowData: any) {
    event.preventDefault();
    event.stopPropagation();

    this.openedItem = rowData['Key'];
    this.openedValue = rowData;
  }

  closeItem() {
    this.openedItem = "";
    this.openedValue = {};
  }

  changeItem(json: any) {
    this.openedValue = json;
    this.onPageChange();
  }

  setNewMode(mode: string) {
    this.mode = mode;
  }

  //#endregion VDB editor

  @Output() onSearch: EventEmitter<any> = new EventEmitter<any>();
  @Output() onPagination: EventEmitter<any> = new EventEmitter<any>();
  @Output() onDeleteByKeyFromVDB: EventEmitter<any> = new EventEmitter<any>();

  searchString: string;

  setFields(dashboard) {
    this.cols = [];
    dashboard = dashboard.value;
    if (dashboard) {
      let cols = dashboard.logDashboardField;
      _.forEach(cols, (col) => {
        this._addColumn(col.fieldSource, col.displayName, col.type);
      });

      this._setTable();
    }
  }

  private _initCols() {
    this.cols = [];
    let columns: any[] = [];

    if (this.columns && this.columns.length > 0) {
      columns = this.columns;
      _.each(columns,
        (column: ColumnDefinition) => {
          this._addColumn(column.field, column.header, column.type, column.height, column.colWidth, column.sorting);
        });

      if (this.fullTextSearch) {
        //update existing controls
        this.clearControls();
      }

    }
  }

  private _setTable() {
    if (this.data) {
      let records = _.map(this.data,
        (item) => {
          let arr = {};
          if (item.value != null) {
            arr = JSON.parse(item.value);
            arr['Key'] = item.key;
          } else {
            arr['Key'] = item.key;
            arr['Value'] = arr;
          }
          return arr;
        });

      this.primengTableHelper.records = records;
      this.primengTableHelper.totalRecordsCount = this.total;
    }
  }

  private _addColumn(field, header, type, height?: any, width?: any, sorting: boolean = false) {

    if (this.isIgnoreId && field == 'id') {
      return;
    }

    if (field && header) {
      let obj = {
        field: field,
        header: header,
        type: type || undefined,
        height: height || undefined,
        width: width || undefined,
        sorting: sorting
      };
      this.cols.push(obj);
      if (this.fullTextSearch) {
        this.addControl(field);
      }
    }
  }

  //#region Events
  onSearching() {
    this.onSearch.emit(this.searchString);
  }

  clear() {
    this.searchString = '';
  }

  onPageChange(event?: LazyLoadEvent) {
    const formValue = this.searchForm.value;

    let pagination = {
      sorting: this.primengTableHelper.getSorting(this.dataTable),
      maxResultCount: this.primengTableHelper.getMaxResultCount(this.paginator, event),
      skipCount: this.primengTableHelper.getSkipCount(this.paginator, event)
    }

    let query = '';
    if (this.fullTextSearch) {
      _.each(Object.keys(formValue), (key) => {
        const value = formValue[key];
        if (value) {
          query += `${key}:${formValue[key]}||`
        }
      });
      query = query.substring(0, query.length - 2);

      pagination['query'] = query;
    } else {
      pagination['key'] = formValue.key;
      pagination['fullText'] = formValue.fullText;
    }

    this.onPagination.emit(pagination);
  }

  deleteByKeyFromVDB(key: string) {
    this.onDeleteByKeyFromVDB.emit(key);
  }

  get actionWidth() {
    return this.isCustomActionsAvailable ? 330 : 130;
  }


  //#endregion Events

}
