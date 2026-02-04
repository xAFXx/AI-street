import {
    Component,
    Injector,
    OnInit,
    Input,
} from '@angular/core';
import {Subject} from 'rxjs';

import {FieldType, ICustomAuthModel} from "../../models/models";
import {BaseChannelModalComponent} from "../base-channel-modal.component";

@Component({
    selector: 'custom-auth-modal.component',
    templateUrl: './custom-auth-modal.component.html',
    styleUrls: ['custom-auth-modal.component.less']
})
export class CustomAuthModalComponent extends BaseChannelModalComponent implements OnInit {

    submit = new Subject<ICustomAuthModel>();

    fields: FieldType[] = [
        {
            id: 'headername',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.HeaderName.Placeholder',
            label: 'Axilla.Channel.Modal.HeaderName',
            value: '',
            required: true
        },
        {
            id: 'prefix',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.Prefix.Placeholder',
            label: 'Axilla.Channel.Modal.Prefix',
            value: '',
            required: true
        },
        {
            id: 'value',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.Value.Placeholder',
            label: 'Axilla.Channel.Modal.Value',
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
        const channel: ICustomAuthModel = {
            headername: formValue.headername,
            prefix: formValue.prefix,
            value: formValue.value,
            authVariables: formValue.authVariables
        }

        if (this.isGatewayAvailable) {
            channel.gateway = formValue.gateway;
        }

        this.submit.next(channel);
        this.close();
    }
}
