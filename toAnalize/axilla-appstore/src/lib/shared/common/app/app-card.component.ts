import {Component, Injector, ViewEncapsulation, OnInit, Output, EventEmitter, Input} from '@angular/core';

import {AppComponentBase, appModuleAnimation, AppConsts} from '@axilla/axilla-shared';
import {IAppListDto} from "../../service-proxies/service-proxies";

@Component({
  selector: 'app-card-view',
  templateUrl: './app-card.component.html',
  styleUrls: ['./app-card.component.less'],
  encapsulation: ViewEncapsulation.None,
  animations: [appModuleAnimation()]
})
export class AppCardComponent extends AppComponentBase implements OnInit {
  @Input() app: IAppListDto;

  @Output() installApp: EventEmitter<any> = new EventEmitter<any>();

  product: any;

  filter: string = '';

  remoteServiceBaseUrl: string = AppConsts.remoteServiceBaseUrl;

  constructor(
    injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit(): void {
  }

  install() {
    if (this.app) {
      this.installApp.emit(this.app.id);
    }
  }

  openDetails() {
  }

  preventClick($event: Event) {
    $event.stopPropagation();
  }
}

