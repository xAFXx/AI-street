import {Component, EventEmitter, ViewEncapsulation, Injector, Output, Input, OnInit} from '@angular/core';

import {FormGroup, FormControl, Validators, FormBuilder} from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';

import {AppComponentBase} from '@axilla/axilla-shared';
import _ from 'lodash';
import {DataLookup, IExtendedApiCallHeadersDto} from './models';
import {ExecuteApiService} from "./execute-api.service";

@Component({
    selector: 'execute-api-lookup-item',
    templateUrl: './execute-api-lookup.component.html',
    styleUrls: ['./execute-api-lookup.component.less'],
    encapsulation: ViewEncapsulation.None
})
export class ExecuteApiLookUpComponent extends AppComponentBase implements OnInit {
    @Output() deleteItem: EventEmitter<any> = new EventEmitter<any>();
    @Output() itemInteraction: EventEmitter<any> = new EventEmitter<any>();

    @Input() apiCallDataLookup: DataLookup;
    @Input() index: number;

    private readonly destroy$ = new Subject<void>();

    lookupForm: FormGroup;

    get apiCallLookups(): DataLookup[] {
        return this.executeApiService.apiCallLookup;
    }

    constructor(
        injector: Injector,
        private formBuilder: FormBuilder,
        private executeApiService: ExecuteApiService,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this._initApiCallLookup();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    delete() {
        const form = this.formValue;
        this.deleteItem.emit(form);
    }

    private _initApiCallLookupForm() {
        const id = this.apiCallLookups[this.index]?.id ?? this.generateGuid();

        this.lookupForm = this.formBuilder.group({
            id: [id , null],
            name: ['', null],
            value: ['', null]
        });
        if (!_.isEmpty(this.apiCallDataLookup)) {
            this.lookupForm.get('name').setValue(this.apiCallDataLookup.name);
            this.lookupForm.get('value').setValue(this.apiCallDataLookup.value);
        }

        // Debounce the entire form group (covers both name + value)
        this.lookupForm.valueChanges
            .pipe(
                debounceTime(400),
                distinctUntilChanged((a, b) => a?.name === b?.name && a?.value === b?.value),
                filter(() => this.isNotEmpty()),
                takeUntil(this.destroy$)
            )
            .subscribe(() => this.emitLookup());
    }

    private emitLookup(): void {
        const form = this.formValue;

        const data = {
            selected: form,
            index: this.index
        };

        if (this.isNotEmpty()) {
            this.itemInteraction.emit(data);
        }
    }

    private _initApiCallLookup() {
        this._initApiCallLookupForm();
    }

    get formValue() {
        return this.lookupForm.value;
    }

    isNotEmpty(): boolean {
        let form = this.formValue;

        return !!(form.name && form.value);
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
