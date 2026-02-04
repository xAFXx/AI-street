import {
    Component,
    Injector,
    OnInit,
    Input,
} from '@angular/core';
import {Subject} from 'rxjs';
import {BaseChannelModalComponent} from "../base-channel-modal.component";
import {FieldType, INtlmModel} from "../../models/models";

@Component({
    selector: 'ntlm-modal.component',
    templateUrl: './ntlm-modal.component.html',
    styleUrls: ['ntlm-modal.component.less']
})
export class NtlmModalComponent extends BaseChannelModalComponent implements OnInit {

    submit = new Subject<INtlmModel>();

    fields: FieldType[] = [
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
        {id: 'authVariables', type: 'array', value: []},
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

    onSubmit() {
        const formValue = this.createChannelForm.value;
        const channel: INtlmModel = {
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
