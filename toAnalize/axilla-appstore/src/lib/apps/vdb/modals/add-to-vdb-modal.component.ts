import {
  Component,
  Injector,
  Input,
} from '@angular/core';
import {AppComponentBase} from '@axilla/axilla-shared';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {Subject} from 'rxjs';
import {
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import {AbpSessionService} from 'abp-ng2-module';

import {JsonEditorOptions} from 'ang-jsoneditor';

declare let abp: any;

@Component({
  selector: 'addToVDBModal',
  templateUrl: './add-to-vdb-modal.component.html'
})
export class AddToVDBModalComponent extends AppComponentBase {
  addForm: FormGroup;

  dateFormat = 'DD-MM-YYYY';
  submit = new Subject<any>();

  @Input() vdbName: string;
  openedValue: any;
  mode: any;
  editorOptions: JsonEditorOptions;

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
    private _session: AbpSessionService,
  ) {
    super(injector);

    this.editorOptions = new JsonEditorOptions();
  }

  ngOnInit(): void {
    this._init();

    this.mode = abp.setting.get("App.VDB.JsonView.DefaultView") as any;

    this.editorOptions.modes = ['tree', 'code'];
    this.editorOptions.mode = this.mode;

    this.editorOptions.onModeChange = function (newMode, oldMode) {
      if (this.mode !== newMode) {
        this.updateSetting(newMode);
      }
    }.bind(this);

    this.editorOptions.onChangeText = function (jsonstr) {
      try {
        this.changeRow(JSON.parse(jsonstr));
      } catch (e) {
      }
    }.bind(this);
  }

  private _init() {
    this.initForm();
  }

  //#region Form
  private initForm() {
    this.addForm = new FormGroup({
      vdbName: new FormControl(null, Validators.required),
      keyName: new FormControl(null, Validators.required),
      ttl: new FormControl(1, Validators.required),
      innerObject: new FormControl(null)
    });

    if (this.vdbName) {
      this.addForm.get("vdbName").setValue(this.vdbName);
    }
  }

  //#endregion

  create() {
    const formValue = this.addForm.value;
    this.submit.next(formValue);
    this.close();
  }

  close(): void {
    this._modal.hide();
    this.addForm.reset();
  }
}
