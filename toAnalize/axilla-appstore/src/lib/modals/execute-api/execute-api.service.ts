import {Injectable} from '@angular/core';

import {DataLookup, IExtendedApiCallHeadersDto} from './models';

declare let abp: any;

@Injectable({
    providedIn: 'root'
})
export class ExecuteApiService {

    private _apiCallHeaders: IExtendedApiCallHeadersDto[] = [];
    get apiCallHeaders(): IExtendedApiCallHeadersDto[] {
        return this._apiCallHeaders;
    }
    set apiCallHeaders(items: IExtendedApiCallHeadersDto[]) {
        this._apiCallHeaders = items;
    }

    private _apiCallLookup: DataLookup[] = [];
    get apiCallLookup(): DataLookup[] {
        return this._apiCallLookup;
    }

    set apiCallLookup(items: DataLookup[]) {
        this._apiCallLookup = items;
    }

    constructor() {
    }

    //#region Lookup
    ifLookupExist(index): boolean {
        if (index === '0' || index === 0) {
            return !!this.apiCallLookup[0];
        }

        return !!this.apiCallLookup[index];
    }

    addLookupRow() {
        const lookup = {
            id: this.generateGuid(),
            name: undefined,
            value: undefined,
        } as DataLookup;

        this.apiCallLookup.push(lookup);
    }

    checkIfCurrentLookupItemIsEmpty(): boolean {
        return this.isPrevLookupIsEmpty;
    }

    get lookupLength(): number {
        return this.apiCallHeaders.length;
    }

    get isPrevLookupIsEmpty(): boolean {
        if (this.lookupLength === 0 || this.lookupLength.toString() === '0') {
            return false;
        }

        let header = this.apiCallLookup[this.lookupLength - 1];

        return header.name === undefined && header.value === undefined;
    }

    resetLookup() {
        this.apiCallLookup = [];
    }
    //#endregion Lookup

    //#region Header
    ifHeaderExist(index): boolean {
        if (index === '0' || index === 0) {
            return !!this._apiCallHeaders[0];
        }

        return !!this._apiCallHeaders[index];
    }

    addHeaderRow(header: IExtendedApiCallHeadersDto): void {
        const exists = this.apiCallHeaders.some(h => h.id === header.id);
        if (exists) {
            return;
        }

        this.apiCallHeaders = [...this.apiCallHeaders, header];
    }

    addEmptyHeaderRow(): void {
        const apiCall = {
            name: undefined,
            tenantId: abp.session.tenantId,
            accessGranted: true,
            id: this.generateGuid(),
            value: undefined,
            apiCallId: undefined
        } as IExtendedApiCallHeadersDto;

        this.apiCallHeaders.push(apiCall);
    }

    checkIfCurrentHeaderItemIsEmpty(): boolean {
        return this.isPrevHeaderIsEmpty;
    }

    get headerLength(): number {
        return this.apiCallHeaders.length;
    }

    get isPrevHeaderIsEmpty(): boolean {
        if (this.headerLength === 0 || this.headerLength.toString() === '0') {
            return false;
        }

        let header = this.apiCallHeaders[this.headerLength - 1];

        return header.name === undefined && header.value === undefined;
    }

    resetHeaders() {
        this.apiCallHeaders = [];
    }

    //#endregion Header


    reset() {
        this.resetHeaders();
        this.resetLookup();
    }

    //#region Helpers
    private generateGuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            // tslint:disable-next-line:no-bitwise
            const r = Math.random() * 16 | 0;
            // tslint:disable-next-line:no-bitwise
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    //#endregion Helpers

}
