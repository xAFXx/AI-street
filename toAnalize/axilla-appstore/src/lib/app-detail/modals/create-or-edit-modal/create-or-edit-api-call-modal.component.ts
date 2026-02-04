import {Component, Injector, Input, OnInit} from '@angular/core';
import {AppComponentBase} from '@axilla/axilla-shared';
import {
  ApiConfServiceProxy,
  IApiCallHeaderesDto,
  IApiCallInputDto,
  IApiCallsOutputDto,
  ICreateApiInputDto,
} from '../../../shared/service-proxies/service-proxies';

import {BsModalRef} from 'ngx-bootstrap/modal';
import {AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Subject} from 'rxjs';
import {take} from 'rxjs/operators';

import * as _ from 'lodash';
import {ApiCallService} from '../../../shared/services/api-call.service';

export enum Methods {
  POST,
  GET,
  PUT,
  PATCH,
  DELETE,
  MERGE,
  COPY,
  HEAD,
  OPTIONS,
  LINK,
  UNLINK,
  PURGE,
  LOCK,
  UNLOCK,
  PROPFIND,
  VIEW
}

declare let abp: any;

@Component({
  selector: 'createOrEditApiCallModal',
  templateUrl: './create-or-edit-api-call-modal.component.html'
})
export class CreateOrEditApiCallModalComponent extends AppComponentBase implements OnInit {
  @Input() apiCallId: string;
  @Input() appId: string;

  createOrEditModalForm: FormGroup;
  public saveSubject: Subject<ICreateApiInputDto> = new Subject();
  public updateSubject: Subject<IApiCallInputDto> = new Subject();

  private apiCallsOutputDto: IApiCallsOutputDto;
  methods = Methods;
  editModele = false;
  currentPage = 1;

  accessGranted = false;

  constructor(
    injector: Injector,
    private fb: FormBuilder,
    private _modal: BsModalRef,
    private _apiCallService: ApiCallService,
    private readonly _apiConfService: ApiConfServiceProxy
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.editModele = !this.apiCallId;
    this.initForm();
  }

  private _patchFormValue(apiCall: IApiCallsOutputDto) {
    this.createOrEditModalForm.patchValue({
      title: apiCall.title,
      call: apiCall.call,
      description: apiCall.description,
      method: apiCall.method,
      authenticationRequired: apiCall.authenticationRequired,
      requestHeader: apiCall.requestHeader,
      acceptHeader: apiCall.acceptHeader,
      body: apiCall.body,
      outputMapping: apiCall.outputMapping,
      usedForAuthentication: apiCall.usedForAuthentication
    });

    _.each(apiCall.headers, (item, index: number) => {
      this.onApiCallHeaderSelected({
        selected: item, index: index, initialState: true
      });
    });
  }

  private initForm() {
    if (!this.editModele) {
      this._apiConfService
        .getById(this.apiCallId)
        .pipe(
          take(1)
        ).subscribe((apiCall: IApiCallsOutputDto) => {
        this.apiCallsOutputDto = apiCall;
        this.accessGranted = apiCall.accessGranted;
        this._patchFormValue(apiCall);
      });
    } else {
      this.accessGranted = true;
    }

    this.createOrEditModalForm = this.fb.group({
      //tab 1
      title: new FormControl(null, [Validators.required, Validators.minLength(3)]),
      call: new FormControl(null, [Validators.required, Validators.minLength(3)]),
      description: new FormControl('', null),
      method: new FormControl('', null),
      authenticationRequired: new FormControl('', null),
      requestHeader: new FormControl('', null),
      acceptHeader: new FormControl('', null),
      //tab 2
      body: new FormControl('', null),
      outputMapping: new FormControl('', null),
      //tab 3
      //callHeaders: new FormArray([], this._minLengthArray(1)),
      callHeaders: new FormArray([], null),
      usedForAuthentication: new FormControl('', null),
    });
  }

  private _minLengthArray(min: number) {
    return (c: AbstractControl): { [key: string]: any } => {
      if (c.value.length >= min)
        return null;

      return {'minLengthArray': {valid: false}};
    }
  }

  //#region "Datatables region"
  initDatatable() {
    this.primengTableHelper.records = [];
    this.primengTableHelper.totalRecordsCount = 0;
  }

  //#region "Api Header region"
  addNewCallHeader() {
    this._apiCallService.addEmptyRow();
    this.setDatatableData();
  }

  setDatatableData() {
    this.primengTableHelper.records = Object.assign([], this.apiCallHeaders.slice(0, this.primengTableHelper.defaultRecordsCountPerPage));
    this.primengTableHelper.totalRecordsCount = this.apiCallHeaders.length;
  }

  onApiCallHeaderSelected(data?: any) {
    let selectedItem = null;
    let index = null;

    if (data) {
      selectedItem = data.selected;
      index = data.index;

      if (selectedItem) {
        if (this._apiCallService.ifExist(data.index)) {
          this.apiCallHeaders[index] = selectedItem;
        } else {
          this.apiCallHeaders.push(selectedItem);
        }
      }

      this.createOrEditModalForm.setControl('callHeaders', this.fb.array(this.apiCallHeaders || []));
      this.setDatatableData();

      if (!data.initialState) {
        this.createOrEditModalForm.get('callHeaders').markAsDirty();
      }
    }
  }

  deleteItem(item: IApiCallHeaderesDto) {
    this.createOrEditModalForm.get('callHeaders').markAsDirty();

    if (item.id && this.apiCallId) {
      this._apiConfService.deleteHeader(item.id)
        .subscribe(() => {
          this.apiCallHeaders =
            Object.assign([], this.apiCallHeaders.filter(obj => obj.name !== item.name));
          this.onApiCallHeaderSelected(item);
        });
    } else {
      this.apiCallHeaders = Object.assign([], this.apiCallHeaders.filter(obj => obj.name !== item.name && obj.value !== item.value));
      this.onApiCallHeaderSelected(item);
    }
  }

  onPagingItem(event?: any) {
    if (!event) {
      this.currentPage = 1;
      const skipCount = 0;
      this.primengTableHelper.records = Object.assign([], this.apiCallHeaders.slice(skipCount, (skipCount + this.primengTableHelper.defaultRecordsCountPerPage)));
      this.primengTableHelper.totalRecordsCount = this.apiCallHeaders.length;
      return;
    }
    this.currentPage = event.page;

    const skipCount = event.page * event.rows;
    this.primengTableHelper.records = Object.assign([], this.apiCallHeaders.slice(skipCount, (skipCount + event.rows)));
    this.primengTableHelper.totalRecordsCount = this.apiCallHeaders.length;
  }

  private _resetForm() {
    this.createOrEditModalForm.reset();

    this._apiCallService.reset();
    this.createOrEditModalForm.setControl('callHeaders', this.fb.array([]));

    this.setDatatableData();
  }

  getApiCallHeaderIndex(index: number) {
    let i = index;
    return i * this.currentPage;
  }

  get apiCallHeaders(): IApiCallHeaderesDto[] {
    return this._apiCallService.apiCallHeaders;
  }

  set apiCallHeaders(items: IApiCallHeaderesDto[]) {
    this._apiCallService.apiCallHeaders = items;
  }

  get isPrevIsEmpty(): boolean {
    return this._apiCallService.isPrevIsEmpty;
  }

  //#endregion "Api Header region"


  //#endregion "Datatables region"

  get isValid(): boolean {
    //if we create then only check the form validation
    if (this.editModele) {
      return !this.createOrEditModalForm.valid;
    } else {//if we edit, then we check the form and whether the fields have been changed
      if (!this.apiCallsOutputDto) {
        return false;
      }

      if (this.createOrEditModalForm.valid && this.createOrEditModalForm.dirty) {
        return false;
      }
      return true;
    }
  }

  trackByFunction = (index, item) => {
    return `${item.id}${item.name}${item.value}`;
  }

  save(): void {
    const formValue = this.createOrEditModalForm.value;
    let headers: IApiCallHeaderesDto[] = [];
    if (formValue.callHeaders && formValue.callHeaders.length > 0) {
      headers = _.map(formValue.callHeaders,
        (item: IApiCallHeaderesDto) => {
          return {
            id: item.id || undefined,
            name: item.name,
            value: item.value,
            apiCallId: undefined,
            tenantId: undefined,
            accessGranted: item.accessGranted
          } as IApiCallHeaderesDto;
        });
    }

    if (this.editModele) {//create
      const createApiCall = {
        call: formValue.call,
        title: formValue.title,
        id: this.appId,
        description: formValue.description,
        method: formValue.method,
        authenticationRequired: formValue.authenticationRequired,
        acceptHeader: formValue.acceptHeader || undefined,
        requestHeader: formValue.requestHeader || undefined,
        body: formValue.body || undefined,
        outputMapping: formValue.outputMapping || undefined,
        apiCallHeaders: headers || undefined,
        allowNullTenant: undefined,
        tenantId: abp.session.tenantId || undefined,
        usedForAuthentication: formValue.usedForAuthentication || undefined,
      } as ICreateApiInputDto;
      this.saveSubject.next(createApiCall);
    } else {//update
      const apiCallInput = {
        call: formValue.call,
        title: formValue.title,
        id: this.apiCallsOutputDto.id,
        description: formValue.description,
        method: formValue.method,
        authenticationRequired: formValue.authenticationRequired,
        acceptHeader: formValue.acceptHeader || undefined,
        requestHeader: formValue.requestHeader || undefined,
        body: formValue.body || undefined,
        outputMapping: formValue.outputMapping || undefined,
        apiCallHeaders: headers || undefined,
        accessGranted: undefined,
        usedForAuthentication: formValue.usedForAuthentication || undefined,
      } as IApiCallInputDto;
      this.updateSubject.next(apiCallInput);
    }

    this.close();
  }

  close(): void {
    this._modal.hide();

    if (this.editModele) {
      this.editModele = false;
    }

    this.apiCallsOutputDto = {} as IApiCallsOutputDto;
    this._resetForm();
  }
}
