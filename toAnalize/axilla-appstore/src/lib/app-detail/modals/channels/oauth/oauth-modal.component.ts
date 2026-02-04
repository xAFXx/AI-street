import {
    Component,
    Injector,
    OnInit,
} from '@angular/core';
import {Subject} from 'rxjs';
import {BaseChannelModalComponent} from "../base-channel-modal.component";
import {FieldType, IChannelModel} from "../../models/models";

@Component({
    selector: 'oauth-modal.component',
    templateUrl: './oauth-modal.component.html'
})
export class OauthModalComponent extends BaseChannelModalComponent implements OnInit {

    submit = new Subject<IChannelModel>();

    fields: FieldType[] = [
        {
            id: 'userName',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.ConsumerKey.Placeholder',
            label: 'Axilla.Channel.Modal.ConsumerKey',
            value: ''
        },
        {
            id: 'password',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.ConsumerSecret.Placeholder',
            label: 'Axilla.Channel.Modal.ConsumerSecret',
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
        const channel: IChannelModel = {
            username: formValue.userName,
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
