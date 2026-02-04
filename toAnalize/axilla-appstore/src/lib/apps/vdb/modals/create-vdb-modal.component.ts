import {
  Component,
  Injector,
} from '@angular/core';
import {AppComponentBase} from '@axilla/axilla-shared';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {Subject} from 'rxjs';
import {
  FormGroup,
  FormControl,
} from '@angular/forms';
import {AbpSessionService} from 'abp-ng2-module';

@Component({
  selector: 'createVDBModal',
  templateUrl: './create-vdb-modal.component.html'
})
export class CreateVDBModalComponent extends AppComponentBase {
  createForm: FormGroup;

  dateFormat = 'DD-MM-YYYY';

  submit = new Subject<any>();

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
    private _session: AbpSessionService,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this._init();
  }

  private _init() {
    this.initForm();
  }

  //#region Form
  private initForm() {
    this.createForm = new FormGroup({
      vdbName: new FormControl(null)
    });
  }

  //#endregion

  create() {
    const formValue = this.createForm.value;
    this.submit.next(formValue);
    this.close();
  }

  close(): void {
    this._modal.hide();
    this.createForm.reset();
  }
}
