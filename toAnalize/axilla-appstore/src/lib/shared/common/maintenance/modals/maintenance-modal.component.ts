import {Component, Injector, ViewChild} from '@angular/core';
import {AppComponentBase, UtilsModule} from '@axilla/axilla-shared';
import {ModalDirective} from 'ngx-bootstrap/modal';
import { catchError, finalize, EMPTY } from 'rxjs';

import {ProcessorServiceProxy, IProcessorMaintenanceModeInputDto} from '../../../service-proxies/service-proxies';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// ngx-bootstrap modal
import { ModalModule } from 'ngx-bootstrap/modal';

// ABP localization (pipe + directives)
import { AbpModule } from 'abp-ng2-module';

declare let abp: any;

@Component({
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        AbpModule,
        ModalModule,
        UtilsModule,
        // ✅ for standalone: import module here (NO forRoot here)
    ],
    selector: 'maintenanceModal',
    templateUrl: './maintenance-modal.component.html',
    styleUrls: ['./maintenance-modal.component.less']
})
export class MaintenanceModalComponent extends AppComponentBase {

    @ViewChild('maintenanceModal', {static: true}) modal: ModalDirective;

    saving = false;
    active = false;

    time = 30;
    isMaintenanceMode: boolean = false;
    forTenantOnly: boolean = false;

    constructor(
        injector: Injector,
        private processorServiceProxy: ProcessorServiceProxy
    ) {
        super(injector);
    }

    show(): void {
        this.active = true;
        this.modal.show();
    }

    onShown(): void {
        document.getElementById('CurrentPassword').focus();
    }

    close(): void {
        this.active = false;

        this.time = 30;
        this.isMaintenanceMode = false;
        this.forTenantOnly = false;

        this.modal.hide();
    }

    save(): void {
        this.saving = true;

        let input = {
            mode: this.isMaintenanceMode,
            timeInMinutes: this.time,
            forTenantOnly: this.forTenantOnly
        } as IProcessorMaintenanceModeInputDto;

        this.processorServiceProxy.setMaintenanceMode(input)
            .pipe(
                finalize(() => {
                    this.saving = false;
                })
            )
            .subscribe(() => {
                this.notify.info(this.l('MaintenanceModeChangedSuccessfully'));
                this.close();
            });
    }
}
