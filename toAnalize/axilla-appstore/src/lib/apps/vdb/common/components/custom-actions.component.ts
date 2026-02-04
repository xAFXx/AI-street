import {Component, OnInit, Injector, Input, Output, EventEmitter, ViewEncapsulation} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {AppComponentBase} from "@axilla/axilla-shared";

import {
  IVirtualDbRowDto,
  ISaveToVirtualDbInput,
  VDBServiceProxy
} from '../../../../shared/service-proxies/service-proxies';
import {VdbService} from '../services/vdb.service';

declare let abp: any;

@Component({
  selector: 'app-vdb-custom-actions',
  templateUrl: './custom-actions.component.html',
  styleUrls: ['./custom-actions.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class CustomActionsComponent extends AppComponentBase implements OnInit {
  @Input() vdbItem: any;

  @Output() onApplyAction: EventEmitter<any> = new EventEmitter();

  vdbName: string;

  constructor(
    injector: Injector,
    private _activatedRoute: ActivatedRoute,
    public _vdbService: VDBServiceProxy,
    public vdbService: VdbService,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.vdbName = this._activatedRoute.snapshot.params['id'];
  }

  get customActions(): any[] {
    return this.vdbService.customActions;
  }

  get isCustomActionsAvailable(): boolean {
    return this.vdbService.isCustomActionsAvailable;
  }

  checkIcon(iconOrText: string): boolean {
    if (iconOrText == null) {
      return false;
    }

    return iconOrText.includes("fa fa-");
  }


  // Type guard for IVirtualDbRowDto
  private _isVirtualDbRowDto(item: any): item is IVirtualDbRowDto {
    return (
      item !== null &&
      (typeof item.key === 'string' || item.key === undefined) &&
      (typeof item.value === 'string' || item.value === undefined)
    );
  }

  applyAction(event, customAction: any) {
    event.preventDefault();
    event.stopPropagation();

    let message = this.ls('AxillaAppVDB', 'Axilla.Apps.VDB.ApplyCustomAction.Message');
    let title = this.ls('AxillaAppVDB', 'Axilla.Apps.VDB.ApplyCustomAction.Title');
    abp.message.confirm(message, title, (isConfirmed) => {
      if (isConfirmed) {
        let input: ISaveToVirtualDbInput;
        if (this._isVirtualDbRowDto(this.vdbItem)) {
          let item = JSON.parse(this.vdbItem.value);
          item[customAction.ModificationKey] = customAction.ModificationValue;
          input = {
            databaseName: this.vdbName,
            key: this.vdbItem.key,
            innerObject: item,
            ttl: 10 // 10 day
          } as ISaveToVirtualDbInput;
        } else {
          this.vdbItem[customAction.ModificationKey] = customAction.ModificationValue;
          input = {
            databaseName: this.vdbName,
            key: this.vdbItem.key,
            innerObject: this.vdbItem,
            ttl: 10 // 10 day
          } as ISaveToVirtualDbInput;
        }

        this._vdbService.saveToVirtualDb(input)
          .subscribe(() => {
            this.onApplyAction.emit();
          });

      }
    });
  }
}
