import {Component, EventEmitter, ViewEncapsulation, Injector, Output, Input, OnInit} from '@angular/core';

import {FormGroup, FormControl, Validators, FormBuilder, AbstractControl} from '@angular/forms';

import {AppComponentBase} from '@axilla/axilla-shared';
import _ from 'lodash';
import {IExtendedApiCallHeadersDto} from './models';
import {distinctUntilChanged, Subject} from 'rxjs';
import {debounceTime, takeUntil} from 'rxjs/operators';
import {ExecuteApiService} from "./execute-api.service";

@Component({
    selector: 'execute-api-header-item',
    templateUrl: './execute-api-header.component.html',
    styleUrls: ['./execute-api-header.component.less'],
    encapsulation: ViewEncapsulation.None
})
export class ExecuteApiHeaderComponent extends AppComponentBase implements OnInit {
    @Output() deleteItem: EventEmitter<any> = new EventEmitter<any>();
    @Output() itemInteraction: EventEmitter<any> = new EventEmitter<any>();

    @Input() index: number;
    @Input() apiCallHeader: IExtendedApiCallHeadersDto;

    headerForm: FormGroup;

    private destroy$ = new Subject<void>();


    constructor(
        injector: Injector,
        private formBuilder: FormBuilder,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this._initApiCallHeader();

        this.headerForm.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(() => {
                this.onSelectApiCallHeader();
            });
    }

    delete() {
        this.deleteItem.emit(this.apiCallHeader);
    }

    private _initApiCallHeaderForm() {

        this.headerForm = this.formBuilder.group({
            id: [this.generateGuid(), null],
            headerName: ['', null],
            headerValue: ['', null],
            headerResolvedValue: ['', null]
        });

        if (!_.isEmpty(this.apiCallHeader)) {
            this.headerForm.get('headerName').setValue(this.apiCallHeader.id);
            this.headerForm.get('headerName').setValue(this.apiCallHeader.name);
            this.headerForm.get('headerValue').setValue(this.apiCallHeader.value);
            this.headerForm.get('headerResolvedValue').setValue(this.apiCallHeader.headerResolvedValue);
        }
    }

    onSelectApiCallHeader() {
        const form = this.formValue;

        this.apiCallHeader.id = form.id;
        this.apiCallHeader.name = form.headerName;
        this.apiCallHeader.value = form.headerValue;
        this.apiCallHeader.headerResolvedValue = form.headerResolvedValue;

        const data = {
            original: this.apiCallHeader,
            selected: form,
            index: this.index
        };

        if (this.isNotEmpty()) {
            this.itemInteraction.emit(data);
        }
    }

    private _initApiCallHeader() {
        this._initApiCallHeaderForm();
    }

    get formValue() {
        return this.headerForm.value;
    }

    isNotEmpty(): boolean {
        let form = this.formValue;

        return !!(form.headerName && form.headerValue);
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
