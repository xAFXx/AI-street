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

@Component({
  selector: 'onErrorPEDStepModal',
  templateUrl: './on-error-modal.component.html',
  styleUrls: ['./on-error-modal.component.less']
})
export class OnErrorPEDStepModalComponent extends AppComponentBase {
  onErrorForm: FormGroup;

  submit = new Subject<any>();

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
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
    this.onErrorForm = new FormGroup({
      email: new FormControl(null),
    });
  }

  get f() {
    return this.onErrorForm;
  }

  //#endregion


  onSetError() {
    this._onSetError();
  }

  private _onSetError() {
    const formValue = this.onErrorForm.value;

    this.submit.next(formValue.email);

    this.close();
  }

  close(): void {
    this._modal.hide();
    this.onErrorForm.reset();
  }
}
