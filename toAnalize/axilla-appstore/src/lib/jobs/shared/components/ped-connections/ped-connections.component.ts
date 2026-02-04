import {Component, OnInit, Injector, Input, ViewEncapsulation} from '@angular/core';
import {PEDComponentBase} from '../ped-base.component';

import {AppConsts} from '@axilla/axilla-shared';
import {IProcessorDependency, ProcessorDependencyGroupEnum} from "../../../../shared";

@Component({
  selector: 'app-ped-connected-components',
  templateUrl: './ped-connections.component.html',
  styleUrls: ['./ped-connections.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class PEDConnectedComponent extends PEDComponentBase implements OnInit {
  @Input() processorId?: string;

  get stepsForOverview(): IProcessorDependency[] {
    return this.processorService.stepsForOverview;
  }

  private _groupedConnectedComponents: any = null;
  get groupedConnectedComponents(): any {
    if (!this._groupedConnectedComponents) {
      if (this.processorService.stepsForOverview) {
        this._groupedConnectedComponents = this.groupBy(this.processorService.stepsForOverview, 'group');
      }
    }

    return this._groupedConnectedComponents;
  }

  set groupedConnectedComponents(value: any) {
    this._groupedConnectedComponents = value;
  }


  private groupBy(xs, key) {
    return xs.reduce(function (rv, x) {
      (rv[x[key]] = rv[x[key]] || []).push(x);
      return rv;
    }, {});
  };

  constructor(
    injector: Injector,
  ) {
    super(injector);

  }

  ngOnInit(): void {
    this._init();
  }

  getGroupName(data: ProcessorDependencyGroupEnum): string {
    return ProcessorDependencyGroupEnum[data];
  }

  private _init() {
    this.processorService.getDepenpencies(this.processorId);
  }

  getImgUrl(type: ProcessorDependencyGroupEnum): string {
    let path = "";

    path += AppConsts.appBaseUrl;

    switch (type) {
      case ProcessorDependencyGroupEnum.ApiCall:
      case ProcessorDependencyGroupEnum.ApplicationService:
        path += '/assets/common/images/restApi.png';
        break;
      case ProcessorDependencyGroupEnum.InputVdb:
      case ProcessorDependencyGroupEnum.OutputVdb:
        path += '/assets/common/images/database.png';
        break;
      case ProcessorDependencyGroupEnum.RemoteControl:
      case ProcessorDependencyGroupEnum.InputTenantCache:
      case ProcessorDependencyGroupEnum.OutputTenantCache:
        path += '/assets/common/images/cloudConnection.png';
        break;
      default:
    }

    return path;
  }


}
