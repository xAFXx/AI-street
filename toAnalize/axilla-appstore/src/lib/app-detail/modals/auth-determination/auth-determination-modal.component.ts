import {
  Component,
  Injector,
  ViewChild,
  Output,
  EventEmitter,
} from '@angular/core';

import {AppComponentBase, UpdateFieldTypes} from '@axilla/axilla-shared';

import { ModalDirective} from 'ngx-bootstrap/modal';

import {IAuthVars} from '../models/models';

@Component({
  selector: 'authDeterminationModal',
  templateUrl: './auth-determination-modal.component.html'
})
export class AuthDeterminationModalComponent extends AppComponentBase {
  @ViewChild('authDeterminationModal', {static: true}) modal: ModalDirective;

  @Output() modalSave: EventEmitter<any> = new EventEmitter<any>();

  UpdateFieldTypes: typeof UpdateFieldTypes = UpdateFieldTypes;

  variables: any[];

  active = false;
  saving = false;

  constructor(
    injector: Injector,
  ) {
    super(injector);
  }

  show(variables?: string[]): void {
    const self = this;
    self.active = true;

    if (variables && variables.length > 0) {
      this.variables = variables.map(i => {
        const item: IAuthVars = {
          value: '',
          name: i,
        }

        return item;
      });

      self.modal.show();
    }
  }

  onChangeUpdateFieldTextValue(value, name) {
    this.variables.filter(a => a.name === name.toLowerCase())[0].value = value;
  }

  save() {
    this.modalSave.emit(this.variables);

    this.close();
  }

  close(): void {
    this.modal.hide();
  }
}
