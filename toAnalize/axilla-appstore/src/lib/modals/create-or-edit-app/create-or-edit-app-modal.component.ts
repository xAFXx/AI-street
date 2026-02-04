import {Component, Injector, Input, OnInit, ViewChild} from '@angular/core';
import {AppComponentBase, Dictionary} from '@axilla/axilla-shared';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {FormArray, FormBuilder, FormControl, FormGroup, Validators} from '@angular/forms';
import {Subject} from 'rxjs';

import _ from 'lodash';

import {Paginator} from 'primeng/paginator';
import {Table} from 'primeng/table';
import {
  AppStatus,
  AuthenticationMethod,
  IAdditionalPropertyDto,
  IAdditionalPropertyInputDto,
  IAppAssignmentListDto,
  ICreateOrEditAppInput
} from "../../shared";

@Component({
  selector: 'create-or-edit-app-modal',
  templateUrl: './create-or-edit-app-modal.component.html',
  styleUrls: ['create-or-edit-app-modal.component.less']
})
export class CreateOrEditAppModalComponent extends AppComponentBase implements OnInit {
  @Input() app: IAppAssignmentListDto;
  @Input() isEdit: boolean;

  public onClose: Subject<ICreateOrEditAppInput> = new Subject();
  public onRemove: Subject<any> = new Subject();

  createorEditAppModalForm: FormGroup;
  authentication = AuthenticationMethod;

  selectedLine: any;

  active = false;
  saving = false;


  authOptions = (Object.keys(AuthenticationMethod) as string[])
    .filter(k => isNaN(Number(k))) // keep only string keys, ignore numeric reverse mapping
    .map(k => ({
      label: this.prettify(k),
      value: (AuthenticationMethod as any)[k] as number
    }))
    .sort((a, b) => a.label.localeCompare(b.label)); // optional: sort by label

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
    private formBuilder: FormBuilder
  ) {
    super(injector);
  }

  ngOnInit() {
    this.createorEditAppModalForm = this.formBuilder.group({
      title: new FormControl(null, Validators.required),
      name: new FormControl(null, Validators.required),
      description: new FormControl(null, Validators.required),
      imagecss: new FormControl(null, null),
      status: new FormControl(null, null),
      baseUrl: new FormControl(null, null),
      authentication: new FormControl(null, Validators.required),
      price: new FormControl(null, null),
      additionalProperties: new FormArray([]),
      applicationProperties: new FormArray([])
    });

    if (this.app && this.app.id) {
      this._initApp();
    }
  }

  private prettify(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/Oauth/g, 'OAuth')
      .replace(/^IMAP$/, 'IMAP')
      .replace(/^SFTP$/, 'SFTP')
      .replace(/^NTLM$/, 'NTLM')
      .replace(/^OAUTH NETSUITE$/, 'OAuth (NetSuite)');
  }

  private _initApp() {
    if (this.app.title) this.f.get('title').setValue(this.app.title);
    if (this.app.name) this.f.get('name').setValue(this.app.name);
    if (this.app.description) this.f.get('description').setValue(this.app.description);
    if (this.app.imageCSS) this.f.get('imagecss').setValue(this.app.imageCSS);
    //if (this.app.price) this.f.get('price').setValue(this.app.price);
    if (this.app.baseUrl) this.f.get('baseUrl').setValue(this.app.baseUrl);
    if (this.app.authentication || this.app.authentication === 0 || this.app.authentication === AuthenticationMethod.Oauth) this.f.get('authentication').setValue(this.app.authentication);
    if (this.app.appStatus) this.f.get('status').setValue(this.app.appStatus);

    if (this.app.additionalDicProperties) {
      this.isShowAdditionalProperty = true;
      _.forOwn(this.app.additionalDicProperties, (value, key) => {
        this._addField(key, value);
      });
    }

    if (this.app.applicationProperties) {
      _.forOwn(this.app.applicationProperties, (property: IAdditionalPropertyDto) => {
        this._addApplicationPropertyField(property);
      });
    }
  }

  close(): void {
    this.createorEditAppModalForm.reset();
    this.isShowAdditionalProperty = false;
    this._modal.hide();
  }

  onCreateAppSubmit(): void {
    const formValue = this.formValue();

    if (!formValue) {
      return;
    }
    const baseUrl = !formValue.baseUrl ? '' : formValue.baseUrl;

    const price = +formValue.price || 0;

    const id = this.app?.id || undefined;

    const createApp = {
      id: id,
      title: formValue.title,
      name: formValue.name,
      description: formValue.description,
      imageCSS: formValue.imagecss,
      appStatus: AppStatus.TEST,
      baseUrl: baseUrl,
      authentication: +formValue.authentication,
      price: price,
      additionalProperties: this.setAdditionalProperties(formValue.additionalProperties),
      applicationProperties: formValue.applicationProperties,
    } as ICreateOrEditAppInput;

    this.onClose.next(createApp);
    this.close();
  }


  //#region Form
  get f() {
    return this.createorEditAppModalForm;
  }

  get fc() {
    return this.f.controls;
  }

  //#endregion Form

  //#region AdditionalProperties
  get ap() {
    return this.fc.additionalProperties as FormArray;
  }

  private setAdditionalProperties(additionalProperties: any): any {
    let dict = new Dictionary();
    _.each(additionalProperties,
      (item) => {

        dict.set(item.propertyName, item.propertyValue);
      });
    return dict.items;
  }

  private _addEmptyField() {
    this.ap.push(this.formBuilder.group({
      propertyName: ['', null],
      propertyValue: ['', null]
    }));
  }

  private _addField(propertyName: string, propertyValue: string) {
    this.ap.push(this.formBuilder.group({
      propertyName: [propertyName, null],
      propertyValue: [propertyValue, null]
    }));
  }

  isShowAdditionalProperty: boolean = false;

  addAdditionalProperty() {
    this.isShowAdditionalProperty = true;
    this._addEmptyField();
  }

  removeAdditionalProperty(propertyId: any) {
    this.ap.removeAt(propertyId);
  }

  //#endregion AdditionalProperties


  //#region ApplicationProperties

  get aplicationProperties() {
    return this.fc.applicationProperties as FormArray;
  }

  @ViewChild('applicationPropertiesDataTable', {static: true}) dataTable: Table;
  @ViewChild('applicationPropertiesPaginator', {static: true}) paginator: Paginator;

  applicationProperties: IAdditionalPropertyInputDto[] = [];

  private _addEmptyApplicationPropertyField() {
    this.aplicationProperties.push(this.formBuilder.group({
      name: ['', Validators.required],
      defaultValue: ['', null],
      linkedToChannel: [false, null],
      required: [true, null],
      useCache: [false, null],
      isOwner: [true, null],
      type: [1, null]
    }));

  }

  private _addApplicationPropertyField(property: IAdditionalPropertyDto) {
    this.aplicationProperties.push(this.formBuilder.group({
      name: [property.name, Validators.required],
      defaultValue: [property.defaultValue, null],
      linkedToChannel: [property.linkedToChannel, null],
      required: [property.required, null],
      useCache: [property.useCache, null],
      id: [property.id, null],
      isOwner: [property.isOwner, null],
      type: [property.type, null]
    }));

    this.setDatatableData();
  }

  addNewApplicationProperty($event) {
    this._addEmptyApplicationPropertyField();
  }

  removeApplicationProperty(index: number, property?: any) {
    if (property) {
      this.onRemove.next({appId: this.app.appId, propertyId: property.value});
    }

    this.aplicationProperties.removeAt(index);
    this.setDatatableData();
  }

  setDatatableData() {
    this.primengTableHelper.records = Object.assign([], this.aplicationProperties.controls.slice(0, this.primengTableHelper.defaultRecordsCountPerPage));
    this.primengTableHelper.totalRecordsCount = this.aplicationProperties.controls.length;
  }

  onPaging(event) {
    const skipCount = event.page * event.rows;
    this.primengTableHelper.records = Object.assign([], this.primengTableHelper.records.slice(skipCount, (skipCount + event.rows)));
  }

  //#endregion ApplicationProperties


  private formValue() {
    return this.createorEditAppModalForm.value;
  }

  get isPureHttp(): boolean {
    const formValue = this.formValue();
    const authentication = +formValue.authentication;
    return authentication === AuthenticationMethod.PureHttp;
  }
}
