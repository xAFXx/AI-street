import {Injectable} from '@angular/core';

import {
  IApiCallHeaderesDto,
} from '../service-proxies/service-proxies';

declare let abp: any;

@Injectable()
export class ApiCallService {

  private _apiCallHeaders: IApiCallHeaderesDto[] = [];

  get apiCallHeaders(): IApiCallHeaderesDto[] {
    return this._apiCallHeaders;
  }

  set apiCallHeaders(items: IApiCallHeaderesDto[]) {
    this._apiCallHeaders = items;
  }

  constructor() {
  }

  ifExist(index): boolean {
    if (index == '0' || index == 0) {
      return !!this._apiCallHeaders[0];
    }

    return !!this._apiCallHeaders[index];
  }

  addEmptyRow() {
    const apiCall = {
      name: undefined,
      tenantId: abp.session.tenantId,
      accessGranted: true,
      id: undefined,
      value: undefined,
      apiCallId: undefined
    } as IApiCallHeaderesDto;

    this.apiCallHeaders.push(apiCall);
  }

  checkIfCurrentItemIsEmpty(): boolean {
    return this.isPrevIsEmpty;
  }

  get length(): number {
    return this.apiCallHeaders.length;
  }

  get isPrevIsEmpty(): boolean {
    if (this.length == 0 || this.length.toString() == '0') return false;

    let header = this.apiCallHeaders[this.length - 1];

    return header.name == undefined && header.value == undefined;
  }

  reset() {
    this.apiCallHeaders = [];
  }

}
