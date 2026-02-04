import {Injectable} from '@angular/core';

import {
  AppServiceBaseServiceProxy, IAppCustomSettingDto, IChangeAppSettingInput
} from "../service-proxies/service-proxies";

import {AppService} from './app.service';

import {take, catchError} from "rxjs/operators";
import {throwError} from "rxjs";

import _ from 'lodash';

declare let abp: any;

@Injectable({
  providedIn: 'root',
})
export class CustomSettingsService {

  constructor(
    private readonly _appServiceBase: AppServiceBaseServiceProxy,
    private readonly _appService: AppService
  ) {
  }

  refreshCustomSettings(id: string, appName: string): void {
    // Copy the group
    let settingGroup = {name: appName, properties: [], actions: []};

    // Get the group for the properties
    let sourceObject = this._appService.getAppCredentialsByAppName(appName);
    let singleDictionary = [];

    this._appServiceBase.getAllSettings(id, undefined)
      .pipe(take(1))
      .subscribe((appCustomSettingDtos: IAppCustomSettingDto[]) => {
        this._appService.globalObject = [];
        for (let i = 0; i < appCustomSettingDtos.length; i++) {

          let value = appCustomSettingDtos[i];

          // if the item is found in the single dictioniary then skip
          if (singleDictionary.filter(s => s === value.name).length > 0)
            continue;

          // copy the property itself
          let propertyObjectFromSourceDefinition = sourceObject[0].properties.filter(s => s.name === value.name);
          if (propertyObjectFromSourceDefinition.length === 0)
            continue;
          let globObj = propertyObjectFromSourceDefinition[0];

          globObj.value = value.value;
          globObj.channelId = value.channelId;

          //push the porperty to the single dictionary to prevent double inserts
          if (!globObj.linkedToChannel) {
            singleDictionary.push(value.name);
          }

          if (globObj.linkedToChannel && value.channelId === null) {

          } else {
            settingGroup.properties.push(globObj);
          }
        }

        if (sourceObject.length > 0) {
          // loop through all properties in source object and if they are not in singleDictionary add them

          _.forEach(sourceObject[0].properties,
            f => {
              if (!f.linkedToChannel && singleDictionary.filter(a => a === f.name).length === 0) {
                settingGroup.properties.push(f);
              }
            });


          // loop through all actions in source object and if they are not in singleDictionary add them
          _.forEach(sourceObject[0].actions,
            f => {
              if (!f.linkedToChannel && singleDictionary.filter(a => a === f.name).length === 0) {
                settingGroup.actions.push(f);
              }
            });
        }

        this._appService.globalObject.push(settingGroup);
      });

  }

  onChangeUpdateFieldTextValue(name, value, appId, channelId, useCache = true) {
    const changeAppSettingInput = this._getAppSettingInput(name, value, appId, channelId, useCache);

    this._appServiceBase.changeAppSettings(changeAppSettingInput)
      .pipe(
        take(1),
        catchError(err => {
          return throwError(err);
        }))
      .subscribe(() => {

        this.refreshCustomSettings(appId, this._appService.app.name);

        abp.message.success("Settings successfully updated");
      });
  }

  onChangeUpdateFieldTextValueWithCallBack(name, value, appId, channelId, callBack): void {
    const changeAppSettingInput = this._getAppSettingInput(name, value, appId, channelId);

    this._appServiceBase.changeAppSettings(changeAppSettingInput)
      .pipe(
        take(1),
        catchError(err => {
          return throwError(err);
        }))
      .subscribe(() => {
        abp.message.success("Settings successfully updated");

        this.refreshCustomSettings(this._appService.app.appId, this._appService.app.name);

        callBack();
      });
  }

  onChangeUpdateFieldTextValueAndStartJob(name, value, appId, channelId, jobParam): void {
    const changeAppSettingInput = this._getAppSettingInput(name, value, appId, channelId);

    this._appServiceBase.changeAppSettings(changeAppSettingInput)
      .pipe(
        take(1),
        catchError(err => {
          return throwError(err);
        }))
      .subscribe(() => {
        abp.message.success("Settings successfully updated");

        this.refreshCustomSettings(this._appService.app.appId, this._appService.app.name);

        this._appService.startJob(jobParam);
      });
  }

  onChangeUpdateFieldTextValueWithRefresh(name, value, appId, channelId, appName, useCache = true): void {
    const changeAppSettingInput = this._getAppSettingInput(name, value, appId, channelId, useCache);

    this._appServiceBase.changeAppSettings(changeAppSettingInput)
      .pipe(
        take(1),
        catchError(err => {
          return throwError(err);
        }))
      .subscribe(() => {
        abp.message.success("Settings successfully updated");

        this.refreshCustomSettings(appId, appName);
      });
  }

  private _getAppSettingInput(name, value, appId, channelId, useCache = true) {
    const changeAppSettingInput = {
      appId: appId,
      name: name,
      value: value,
      channelId: channelId,
      organizationUnitId: undefined,
      tenantId: undefined,
      useCache: useCache
    } as IChangeAppSettingInput;

    return changeAppSettingInput;
  }

}
