import {
    Component,
    Injector,
    OnInit,
    Input,
} from '@angular/core';
import {Subject} from 'rxjs';
import {BaseChannelModalComponent} from "../base-channel-modal.component";
import {FieldType, IApiKeyModel} from "../../models/models";

@Component({
    selector: 'apikey-modal.component',
    templateUrl: './apikey-modal.component.html',
    styleUrls: ['apikey-modal.component.less']
})
export class ApiKeyModalComponent extends BaseChannelModalComponent implements OnInit {
    submit = new Subject<IApiKeyModel>();

    fields: FieldType[] = [
        {
            id: 'password',
            type: 'password',
            placeholder: 'Axilla.Channel.Modal.Password.Placeholder',
            label: 'Axilla.Channel.Modal.Password',
            value: ''
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
        const channel: IApiKeyModel = {
            password: formValue.password,
            authVariables: formValue.authVariables
        }

        if (this.isGatewayAvailable) {
            channel.gateway = formValue.gateway;
        }

        this.submit.next(channel);
        this.close();
    }
}
