import {
  Component,
  ViewEncapsulation,
  Injector,
  OnInit,
  ViewChild
} from "@angular/core";

import {FormGroup, FormControl} from '@angular/forms';
import {Router} from "@angular/router";
import {BsModalService} from "ngx-bootstrap/modal";

import {LazyLoadEvent} from 'primeng/api'
import {Paginator} from 'primeng/paginator';
import {Table} from 'primeng/table';

import {AppComponentBase, appModuleAnimation, PrimengTableHelper} from "@axilla/axilla-shared";

import {
  VDBServiceProxy,
  IPagedResultDtoOfVirtualDbDto,
  ISaveToVirtualDbInput,
} from "../../shared/service-proxies/service-proxies";

import {CreateVDBModalComponent} from "./modals/create-vdb-modal.component";


@Component({
  selector: 'app-vdb',
  templateUrl: './vdb.component.html',
  styleUrls: ['./vdb.component.less'],
  encapsulation: ViewEncapsulation.None,
  animations: [appModuleAnimation()]
})

export class VdbComponent extends AppComponentBase implements OnInit {
  @ViewChild('dataTable', {static: true}) dataTable: Table;
  @ViewChild('paginator', {static: true}) paginator: Paginator;

  databaseTableHelper: PrimengTableHelper;

  constructor(injector: Injector,
              private _vdbService: VDBServiceProxy,
              private router: Router,
              private readonly modalService: BsModalService,
  ) {
    super(injector);
    this.databaseTableHelper = new PrimengTableHelper();
    this.databaseTableHelper.defaultRecordsCountPerPage = 10;
  }

  ngOnInit(): void {
    this._initDatabaseNameSearchForm();
    this.getDatabases();
  }

  databaseForm: FormGroup;

  private _initDatabaseNameSearchForm() {
    this.databaseForm = new FormGroup({
      name: new FormControl(null)
    });
  }

  get databaseName() {
    if (this.databaseForm) {
      return this.databaseForm.get('name').value;
    }
    return '';
  }

  getDatabases() {
    this.databaseTableHelper.showLoadingIndicator();

    this._vdbService.getVirtualDbs(undefined, undefined, 0, this.databaseTableHelper.defaultRecordsCountPerPage)
      .subscribe((result: IPagedResultDtoOfVirtualDbDto) => {
        this.databaseTableHelper.records = result.items;
        this.databaseTableHelper.totalRecordsCount = result.totalCount;
        this.databaseTableHelper.hideLoadingIndicator();
      });
  }

  getDatabasesOnPagination(event?: LazyLoadEvent) {
    this.databaseTableHelper.showLoadingIndicator();

    this._vdbService.getVirtualDbs(
      this.databaseName || undefined,
      this.databaseTableHelper.getSorting(this.dataTable) || undefined,
      this.databaseTableHelper.getSkipCount(this.paginator, event) || 0,
      this.databaseTableHelper.getMaxResultCount(this.paginator, event) || this.databaseTableHelper.defaultRecordsCountPerPage
    )
      .subscribe((result: IPagedResultDtoOfVirtualDbDto) => {
        this.databaseTableHelper.records = result.items;
        this.databaseTableHelper.totalRecordsCount = result.totalCount;
        this.databaseTableHelper.hideLoadingIndicator();
      });
  }

  openDatabase(name: string) {
    this.router.navigate(['app/appstore/vdb', name]);
  }

  createNewVDB(): void {
    const createVDB = this.modalService.show(CreateVDBModalComponent, {
      'backdrop': 'static',
      'keyboard': false,
      'class': "w-80"
    });

    let createVDBComponent = createVDB.content as CreateVDBModalComponent;

    createVDBComponent
      .submit
      .subscribe((data: any) => {
        const input = {
          databaseName: data.vdbName,
          key: 'welcomeKey',
          innerObject: {},
          ttl: 1 // 1 day
        } as ISaveToVirtualDbInput;

        this._vdbService.saveToVirtualDb(input)
          .subscribe(() => {
            this.getDatabases();
          });

      });
  }
}
