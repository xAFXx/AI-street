import { Component, Injector, ViewEncapsulation, Output, EventEmitter, Input } from '@angular/core';

import { AppComponentBase, appModuleAnimation, AppConsts } from '@axilla/axilla-shared';
import {IAppAssignmentListDto} from "../../service-proxies/service-proxies";

@Component({
    selector: 'installed-app-card-view',
    templateUrl: './installed-app-card.component.html',
    styleUrls: ['./installed-app-card.component.less'],
    encapsulation: ViewEncapsulation.None,
    animations: [appModuleAnimation()]
})
export class InstalledAppCardComponent extends AppComponentBase{
    @Input() app: IAppAssignmentListDto;

    @Output() openApp?= new EventEmitter<IAppAssignmentListDto>();
    @Output() removeFromTenant?= new EventEmitter<string>();
    @Output() editApp?= new EventEmitter<IAppAssignmentListDto>();

    product: any;

    filter: string = '';

    remoteServiceBaseUrl: string = AppConsts.remoteServiceBaseUrl;

    constructor(
        injector: Injector,
    ) {
        super(injector);
    }

    onOpenApp(): void {
        this.openApp.next(this.app);
    }

    onEditApp(): void {
        this.editApp.next(this.app);
    }

    onRemoveFromTenant() {
        this.removeFromTenant.emit(this.app.appId);
    }

    preventClick($event: Event) {
        $event.stopPropagation();
    }
}

