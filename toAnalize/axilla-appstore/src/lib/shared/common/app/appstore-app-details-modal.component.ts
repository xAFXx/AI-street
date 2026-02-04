import {Component, ViewChild, Injector, OnInit, Input} from '@angular/core';
import {ModalDirective} from 'ngx-bootstrap/modal';

import {AppComponentBase, AppConsts} from '@axilla/axilla-shared';

import {Subject} from 'rxjs';
import {IAppListDto, IEntityDtoOfGuid} from "../../service-proxies/service-proxies";

@Component({
  selector: 'appStoreAppDetails',
  templateUrl: './appstore-app-details-modal.component.html',
  styleUrls: ['appstore-app-details-modal.component.less']
})
export class AppStoreAppDetailsModalComponent extends AppComponentBase implements OnInit {
  @Input() app: IAppListDto;

  @ViewChild('appStoreAppDetails', {static: true}) modal: ModalDirective;

  remoteServiceBaseUrl: string = AppConsts.remoteServiceBaseUrl;

  public install: Subject<IEntityDtoOfGuid> = new Subject();

  saving = false;
  active = false;

  selectedApp: IAppListDto;

  constructor(
    injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.active = true;
  }

  show(item: any): void {
    this.active = true;
    if (item) {
      this.selectedApp = item.data ?? item;
    }

    this.modal.show();
  }

  onShown() {}

  installApp(id: string) {
    const addingApp = {
      id: id
    } as IEntityDtoOfGuid;
    this.install.next(addingApp);
    this.close();
  }

  close(): void {
    this.active = false;
    this.saving = false;

    this.modal.hide();
  }

  openDetails() {}
}
