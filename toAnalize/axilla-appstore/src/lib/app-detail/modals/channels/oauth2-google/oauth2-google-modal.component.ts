import {
    Component,
    Injector,
    OnInit,
    Input,
} from '@angular/core';
import {Subject} from 'rxjs';
import {BaseChannelModalComponent} from "../base-channel-modal.component";
import {FieldType, IGoogleOauthModel} from "../../models/models";

@Component({
    selector: 'oauth2-google-modal.component',
    templateUrl: './oauth2-google-modal.component.html',
    styleUrls: ['oauth2-google-modal.component.less']
})
export class Oauth2GoogleModalComponent extends BaseChannelModalComponent implements OnInit {

    submit = new Subject<IGoogleOauthModel>();

    override fields: FieldType[] = [
        {
            id: 'email',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.Email.Placeholder',
            label: 'Axilla.Channel.Modal.Email',
            value: ''
        },
        {
            id: 'certificate',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.Certificate.Placeholder',
            label: 'Axilla.Channel.Modal.Certificate',
            value: ''
        },
        {id: 'authVariables', type: 'array', value: []}
    ];

    constructor(
        injector: Injector
    ) {
        super(injector);
    }

    ngOnInit(): void {
        this.initForm();
        this.baseOnInit();
    }

    onSubmit() {
        const formValue = this.createChannelForm.value;
        const channel: IGoogleOauthModel = {
            email: formValue.email,
            certificate: formValue.certificate,
            authVariables: formValue.authVariables
        }

        if (this.isGatewayAvailable) {
            channel.gateway = formValue.gateway;
        }

        this.submit.next(channel);
        this.close();
    }
}
