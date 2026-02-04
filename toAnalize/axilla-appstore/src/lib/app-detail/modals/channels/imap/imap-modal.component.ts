import {
    Component,
    Injector,
    OnInit,
    OnDestroy,
} from '@angular/core';

import {Subject} from 'rxjs';
import {
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';

import {BaseChannelModalComponent} from "../base-channel-modal.component";
import {FieldType, IIMAPModel} from "../../models/models";

@Component({
  selector: 'imap-modal.component',
  templateUrl: './imap-modal.component.html',
  styleUrls: ['imap-modal.component.less']
})
export class IMAPModalComponent extends BaseChannelModalComponent implements OnInit, OnDestroy {

  submit = new Subject<IIMAPModel>();

    override fields: FieldType[] = [
    {
      id: 'username',
      type: 'text',
      placeholder: 'Axilla.Channel.Modal.Username.Placeholder',
      label: 'Axilla.Channel.Modal.Username',
      value: '',
      required: true
    },
    {
      id: 'password',
      type: 'text',
      placeholder: 'Axilla.Channel.Modal.Password.Placeholder',
      label: 'Axilla.Channel.Modal.Password',
      value: '',
      required: true
    },
    {
      id: 'domain',
      type: 'text',
      placeholder: 'Axilla.Channel.Modal.Domain.Placeholder',
      label: 'Axilla.Channel.Modal.Domain',
      value: '',
      required: false
    },
    {
        id: 'authVariables',
        type: 'array',
        value: []
    }
  ];

    constructor(
        injector: Injector,
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.initForm();
        this.baseOnInit();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

  onSubmit() {
    const formValue = this.createChannelForm.value;
    const channel: IIMAPModel = {
      username: formValue.username,
      password: formValue.password,
      domain: formValue.domain,
      authVariables: formValue.authVariables
    }

    if (this.isGatewayAvailable) {
        channel.gateway = formValue.gateway;
    }

    this.submit.next(channel);
    this.close();
  }

}
