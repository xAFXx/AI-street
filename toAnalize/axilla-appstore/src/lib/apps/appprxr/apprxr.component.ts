import {
  Component,
  ViewEncapsulation,
  Injector,
  OnInit,
  ViewChild
} from "@angular/core";
import {AppComponentBase, appModuleAnimation} from "@axilla/axilla-shared";

import {take, catchError, takeUntil, repeat, delay, takeWhile, map} from "rxjs/operators";
import {throwError, Subject, tap, Observable, finalize, forkJoin, BehaviorSubject} from "rxjs";

import {Table} from 'primeng/table';
import {Paginator, PaginatorState} from 'primeng/paginator';
import {InstalledApp} from "./shared/models";
import {
  AppStoreServiceProxy, IAppAssignmentListDto,
  IListResultDtoOfAppAssignmentListDto,
  IPagedResultDtoOfVirtualDbRowDto,
  ISaveToVirtualDbInput, IVirtualDbRowDto, VDBServiceProxy
} from "../../shared";

declare let abp: any;

@Component({
  templateUrl: './apprxr.component.html',
  styleUrls: ['./apprxr.component.less'],
  encapsulation: ViewEncapsulation.None,
  animations: [appModuleAnimation()]
})
export class ApprxrComponent extends AppComponentBase implements OnInit {

  @ViewChild('dataTable', {static: true}) dataTable: Table;
  @ViewChild('paginator', {static: true}) paginator: Paginator;

  protected readonly destroy$ = new Subject<void>();

  private _appsGatewaySubject = new BehaviorSubject<IVirtualDbRowDto[]>([]);
  //List of installed applications
  readonly appsGateway$ = this._appsGatewaySubject.asObservable();

  private _originalAppsSubject = new BehaviorSubject<IAppAssignmentListDto[]>([]);
  //List of installed applications
  readonly originalApps$ = this._originalAppsSubject.asObservable();

  private _installedAppSubject = new BehaviorSubject<InstalledApp[]>([]);
  //List of installed applications
  readonly installedApp$ = this._installedAppSubject.asObservable();

  private readonly vdbName = 'Apps.Apprxr';

  constructor(injector: Injector,
              private readonly _vdbService: VDBServiceProxy,
              private readonly _appStoreService: AppStoreServiceProxy
  ) {
    super(injector);

  }

  ngOnInit(): void {
      this.init();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private init() {
    this.loadInstalledAppsWithGateways();
  }

  loadInstalledAppsWithGateways() {
    this.primengTableHelper.showLoadingIndicator();

    this.loadInstalledAppsWithGateways$()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.primengTableHelper.hideLoadingIndicator()),
      )
      .subscribe();
  }

  loadInstalledAppsWithGateways$(): Observable<InstalledApp[]> {
    return forkJoin({
      appsResult: this._appStoreService.getAppAssignedList(false),
      gatewaysResult: this._vdbService.getSearchVirtualDbRows(
        undefined,
        this.vdbName,
        undefined,
        undefined,
        undefined,
        false,
        '',
        0,
        1000
      )
    }).pipe(
      map(({ appsResult, gatewaysResult }) => {
        const apps = (appsResult as IListResultDtoOfAppAssignmentListDto)?.items ?? [];                      // IAppAssignmentListDto[]
        const gatewayRows = (gatewaysResult as IPagedResultDtoOfVirtualDbRowDto)?.items ?? [];           // VirtualDbRowDto[]

        this._appsGatewaySubject.next(gatewayRows);

        const gatewayMap = gatewayRows.map(row => JSON.parse(row.value));

        const installedApps: InstalledApp[] = apps.map(app => {
          const gatewayRow = gatewayMap.find(item => item.name === app.name);

          return {
            ...app,
            gateway: gatewayRow?.gateway ?? false,
          };
        }) as InstalledApp[];

        this._originalAppsSubject.next(apps);
        this._installedAppSubject.next(installedApps);

        return installedApps;
      }),
      tap(result => {
        this.getInstalledApps();
      })
    );
  }

  getInstalledApps(paginatorState?: PaginatorState) {
    const skip = paginatorState?.first ?? 0;     // index of the first record
    const take = paginatorState?.rows ?? 10;      // number of rows per page

    const items = this._installedAppSubject.value ?? [];
    const result = items.slice(skip, skip + take);

    this.primengTableHelper.records = result;
    this.primengTableHelper.totalRecordsCount = items.length ?? 0;
  }

  updateGateway(app: InstalledApp) {
    const key = `${app.name}-${app.id}`;

    const input = {
      databaseName: this.vdbName,
      key: key,
      innerObject: { 'name': app.name, 'id': app.id, 'gateway': app.gateway },
      ttl: 365 // 1 day
    } as ISaveToVirtualDbInput;

    this._vdbService.saveToVirtualDb(input)
      .subscribe(() => {
        this.getInstalledApps();
      });
  }


}
