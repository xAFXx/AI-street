import {
    Component,
    Injector,
    OnInit,
    Input,
} from '@angular/core';
import {Subject} from 'rxjs';
import {ITokenSecretModel} from '../../models/models';
import {BaseChannelModalComponent} from "../base-channel-modal.component";
import {FieldType} from "../../models/models";

@Component({
    selector: 'token-secret-modal.component',
    templateUrl: './token-secret-modal.component.html',
    styleUrls: ['token-secret-modal.component.less']
})
export class TokenSecretModalComponent extends BaseChannelModalComponent implements OnInit {
    submit = new Subject<ITokenSecretModel>();

    fields: FieldType[] = [
        {
            id: 'token',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.Token.Placeholder',
            label: 'Axilla.Channel.Modal.Token',
            value: ''
        },
        {
            id: 'secret',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.Secret.Placeholder',
            label: 'Axilla.Channel.Modal.Secret',
            value: ''
        },
        {id: 'authVariables', type: 'array', value: []}
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
        const channel: ITokenSecretModel = {
            token: formValue.token,
            secret: formValue.secret,
            authVariables: formValue.authVariables
        }

        this.submit.next(channel);
        this.close();
    }

}
