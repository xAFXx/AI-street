import {Injectable} from '@angular/core';

import {
  VDBServiceProxy,
  IPagedResultDtoOfVirtualDbRowDto
} from '../../../../shared/service-proxies/service-proxies';

import {tap} from "rxjs/operators";
import {Observable, BehaviorSubject} from "rxjs";

@Injectable()
export class VdbService {

  private readonly VDBCUSTOMACTIONS: string = "App.VDB.CustomActions";

  //#region TableOverview
  private searchSubject = new BehaviorSubject<string>('');
  search$ = this.searchSubject.asObservable();

  setSearch(value: string) {
    this.searchSubject.next(value);
  }

  //#endregion

  constructor(
    public _vdbService: VDBServiceProxy,
  ) {
  }

  //#region Search
  private _databaseKey: string = '';
  get databaseKey() {
    return this._databaseKey;
  }

  set databaseKey(value: string) {
    this._databaseKey = value;
  }

  private _fullText: string = '';
  get fullText() {
    return this._fullText;
  }

  set fullText(value: string) {
    this._fullText = value;
  }

  resetFormValues() {
    this.fullText = '';
    this.databaseKey = '';
  }

  //#endregion Search

  private _customActions: any[];
  get customActions(): any[] {
    return this._customActions;
  }

  set customActions(value: any[]) {

    let data: any[] = [];

    for (let i = 0; i < value.length; i++) {
      let item = value[i];
      let convertedItem = JSON.parse(item.value);
      if (convertedItem.Enable == undefined || !convertedItem.Enable) continue;

      data.push(convertedItem);
    }

    this._customActions = data;
  }

  get isCustomActionsAvailable(): boolean {
    return this.customActions != null && this.customActions.length > 0;
  }

  getCustomActions$(propertyValue: string): Observable<IPagedResultDtoOfVirtualDbRowDto> {
    return this._vdbService.getSearchVirtualDbRows(
      undefined,
      this.VDBCUSTOMACTIONS,
      'SourceVdbName',
      propertyValue || undefined,
      undefined,
      false,
      undefined,
      0,
      1000
    )
      .pipe(
        tap((result: IPagedResultDtoOfVirtualDbRowDto) => {
          this.customActions = result.items;
        })
      );
  }
}
