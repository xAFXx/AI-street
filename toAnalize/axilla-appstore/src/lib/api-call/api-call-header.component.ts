import {Component, EventEmitter, ViewEncapsulation, Injector, Output, Input, OnInit} from '@angular/core';

import {FormGroup, FormControl, Validators} from '@angular/forms';

import {AppComponentBase} from '@axilla/axilla-shared';
import _ from 'lodash';
import {IApiCallHeaderesDto} from "../shared";

@Component({
  selector: 'api-call-header-item',
  templateUrl: './api-call-header.component.html',
  styleUrls: ['./api-call-header.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class ApiCallHeaderComponent extends AppComponentBase implements OnInit {
  @Output() itemSelected: EventEmitter<any> = new EventEmitter<any>();
  @Output() deleteItem: EventEmitter<any> = new EventEmitter<any>();

  @Input() index: number;
  @Input() apiCallHeader: IApiCallHeaderesDto;

  apiCallHeaderForm: FormGroup;

  constructor(
    injector: Injector
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this._initApiCallHeader();
  }

  delete() {
    this.deleteItem.emit(this.apiCallHeader);
  }

  private _initApiCallHeaderForm() {
    this.apiCallHeaderForm = new FormGroup({
      name: new FormControl(null, [Validators.required]),
      value: new FormControl(null, [Validators.required]),
      accessGranted: new FormControl(null, [Validators.required]),
    });

    if (!_.isEmpty(this.apiCallHeader)) {
      this.apiCallHeaderForm.get('name').setValue(this.apiCallHeader.name);
      this.apiCallHeaderForm.get('value').setValue(this.apiCallHeader.value);
      this.apiCallHeaderForm.get('accessGranted').setValue(this.apiCallHeader.accessGranted);
    } else {
      this.apiCallHeaderForm.get('accessGranted').setValue(true);
    }
  }

  private _initApiCallHeader() {
    this._initApiCallHeaderForm();
  }

  get formValue() {
    return this.apiCallHeaderForm.value;
  }

  onSelectApiCallHeader() {
    let form = this.formValue;

    let data = {
      selected: form,
      index: this.index
    }

    if (this.isNotEmpty()) {
      this.itemSelected.emit(data);
    }
  }

  isNotEmpty(): boolean {
    let form = this.formValue;

    return !!(form.name && form.value);
  }
}
