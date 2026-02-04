import {
  Component,
  ViewEncapsulation,
  OnInit,
  Injector
} from "@angular/core";
import {
  throwError,
  BehaviorSubject,
  combineLatest,
} from "rxjs";
import {CreateOrEditAppModalComponent} from "./modals";
import { appModuleAnimation} from "@axilla/axilla-shared";
import {SelectAppModalComponent} from "./modals";

import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {
  take,
  catchError,
  map,
  tap
} from "rxjs/operators";

import {
  AppStoreServiceProxy,
  IAppAssignmentListDto, IAppAssignmentOutput,
  IAppListDto, ICreateAppInput, ICreateOrEditAppInput, IEntityDtoOfGuid,
  IListResultDtoOfAppAssignmentListDto,
  IListResultDtoOfAppListDto, ManageApp,
} from "./shared";

import {Router} from "@angular/router";

import * as _ from 'lodash';
import {AppAppComponentBase} from "./shared/common/app.app-component-base";
import {AppStorePermissions} from "./shared/permissions/shared-permissions";

declare let abp: any;

@Component({
  templateUrl: './app.store.component.html',
  styleUrls: [
    './app.store.component.less',
    './baseDesign.css',
  ],
  selector: 'app-store',
  encapsulation: ViewEncapsulation.None,
  animations: [appModuleAnimation()]
})
export class AppsStoreComponent extends AppAppComponentBase implements OnInit {

  get AppStorePermissions() : typeof AppStorePermissions {
    return AppStorePermissions;
  }

  constructor(injector: Injector,
              private readonly modalService: BsModalService,
              private readonly _appStoreService: AppStoreServiceProxy,
              private router: Router
  ) {
    super(injector);
  }

  //application creation modal
  public _createRoEditAppModal$: BsModalRef;
  //modal for choosing an application to install
  public _selectAppModal$: BsModalRef;

  private _appsSubject = new BehaviorSubject<IAppAssignmentListDto[]>([]);

  //List of installed applications
  readonly apps$ = this._appsSubject.asObservable();

  //list for modal of choice of applications to install
  //then filtered in selectApps$
  private _selectAppsSubject = new BehaviorSubject<IAppListDto[]>([]);
  private _selectApps$ = this._selectAppsSubject.asObservable();

  //only applications that are not installed are displayed
  selectApps$ = combineLatest(this._selectApps$, this.apps$)
    .pipe(map(([selectionList, installedList]) => {
      if (!installedList.length) {
        return selectionList;
      }

      const apps = selectionList
        .filter(f => {
          let tempList = installedList
            .filter((a: IAppAssignmentListDto) => {
              return a.appId === f.id;
            });
          return !tempList.length;
        });

      return apps;
    }));


  ngOnInit(): void {
    this.init();
  }

  //list apps for installed applications
  private _initApps() {
    this._appStoreService.getAppAssignedList(false)
      .pipe(
        take(1),
        map((ListResultDtoOfApps: IListResultDtoOfAppAssignmentListDto) => {
          return ListResultDtoOfApps.items;
        }),
        tap(items => {
          this._appsSubject.next(items);
        }),
        catchError((err) => {
          return throwError(err);
        })
      ).subscribe();
  }

  //ApiConnectionSettingServiceServiceProxy
  private init() {
    this._initApps();

    //List apps for select-app modal
    this._appStoreService.getList(false)
      .pipe(
        map((listResultDtoOfApp: IListResultDtoOfAppListDto) => {
          return listResultDtoOfApp.items;
        }),
        catchError(err => {
          return throwError(err);
        })
      ).subscribe(f => {
      this._selectAppsSubject.next(f);
    });
  }


  //open madal to add an application
  openAddAppModal(): void {
    this._createRoEditAppModal$ = this.modalService.show(CreateOrEditAppModalComponent,
      {
        class: 'w-80'
      });
    let createModal = this._createRoEditAppModal$.content as CreateOrEditAppModalComponent;

    createModal.onClose
      .pipe(
        take(1)
      ).subscribe((app: ICreateAppInput) => {
      if (!app) {
        abp.notify.error(this.l('ThereIsNoViewConfigurationForX'));
      }

      // save new app
      this._appStoreService.create(app)
        .pipe(
          take(1),
          catchError(err => {
            return throwError(err);
          })
        ).subscribe((appListDto: IAppListDto) => {
        const selectApps = this._selectAppsSubject.getValue();
        selectApps.push(appListDto);
        this._selectAppsSubject.next(selectApps);

      });
    });

    createModal.onRemove
      .subscribe((removePropertyModel: any) => {

        //remove remove Application Property
        this._appStoreService.removeApplicationProperty(removePropertyModel.appId, removePropertyModel.propertyId)
          .pipe(
            take(1),
            catchError(err => {
              return throwError(err);
            })
          ).subscribe(() => {
          this._initApps();
        });
      });
  }

  //open madal to add an application
  openEditAppModal(app: IAppAssignmentListDto): void {
    this._createRoEditAppModal$ = this.modalService.show(CreateOrEditAppModalComponent,
      {
        class: 'w-80',
        'initialState': {
          'app': app,
          'isEdit': true
        }
      });
    let editModal = this._createRoEditAppModal$.content as CreateOrEditAppModalComponent;

    editModal.onClose
      .pipe(
        take(1)
      ).subscribe((app: ICreateOrEditAppInput) => {
      if (!app) {
        abp.notify.error(this.l('ThereIsNoViewConfigurationForX'));
      }

      // save new app
      this._appStoreService.edit(app)
        .pipe(
          take(1),
          catchError(err => {
            return throwError(err);
          })
        ).subscribe((appListDto: IAppListDto) => {
        this._initApps();
      });
    });

    editModal.onRemove
      .subscribe((removePropertyModel: any) => {

        // remove remove Application Property
        this._appStoreService.removeApplicationProperty(removePropertyModel.appId, removePropertyModel.propertyId)
          .pipe(
            take(1),
            catchError(err => {
              return throwError(err);
            })
          ).subscribe(() => {
          this._initApps();
        });
      });
  }

  //open madal with not installed app list
  openAddSelectApp(): void {
    const selectAppModal$ = this.modalService.show(SelectAppModalComponent, {
      class: 'w-80',
      'initialState': {
        'apps$': this.selectApps$
      }
    });

    let selectModal = selectAppModal$.content as SelectAppModalComponent;
    //waiting for the selected application to be added
    selectModal.addToTenant.subscribe((app: IEntityDtoOfGuid) => {
      this._appStoreService.addToTenant(app)
        .pipe(
          take(1)
        )
        .subscribe((f: IAppAssignmentOutput) => {
          ////get the created application by id
          //this._appStoreService.getById((f as any).assignmentId)
          //    .pipe(
          //        take(1),
          //        catchError(err => {
          //            return throwError(err);
          //        })
          //    ).subscribe((app: AppAssignmentListDto) => {
          //        if (app) {
          //            //add to the general list
          //            const newListApp = this._appsSubject.getValue();
          //            newListApp.push(app);
          //            this._appsSubject.next(newListApp);
          //        }
          //    });

          //this.init();
          location.reload();
        });
    });
  }

  onRemoveFromTenant(id: string): void {
    // remove from installed
    this._appStoreService.removeFromTenant(id)
      .pipe(
        take(1),
        tap(_ => {
          // remove from the list on the layout
          const apps = this._appsSubject.getValue()
            .filter(a => {
              return a.appId !== id;
            });
          this._appsSubject.next(apps);

        }),
        catchError(err => {
          return throwError(err);
        })
      ).subscribe();
  }

  onOpenApp(app: IAppAssignmentListDto): void {
    this.router.navigate(['app/appstore/app-detail/detail', app.appAssignmentId]);
  }

}
