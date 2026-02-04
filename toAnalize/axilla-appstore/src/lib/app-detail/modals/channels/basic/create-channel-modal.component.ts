import {
    Component,
    Injector,
    OnInit,
    Input,
} from '@angular/core';
import {Subject} from 'rxjs';
import {FieldType, IChannelModel} from "../../models/models";
import {BaseChannelModalComponent} from "../base-channel-modal.component";

@Component({
    selector: 'create-channel-modal.component',
    templateUrl: './create-channel-modal.component.html',
    styleUrls: ['create-channel-modal.component.less']
})
export class CreateChannelModalComponent extends BaseChannelModalComponent implements OnInit {

    fieldTextType: boolean;
    fieldTextTypeSecondaryPassword: boolean;

    //Master Password Switching Method
    toggleFieldTextType() {
        this.fieldTextType = !this.fieldTextType;
    }

    //Secondary password switching method
    toggleFieldTextTypeSecondaryPassword() {
        this.fieldTextTypeSecondaryPassword = !this.fieldTextTypeSecondaryPassword;
    }

    submit = new Subject<IChannelModel>();

    fields: FieldType[] = [
        {
            id: 'userName',
            type: 'text',
            placeholder: 'Axilla.Channel.Modal.UserName.Placeholder',
            label: 'Axilla.Channel.Modal.UserName',
            value: ''
        },
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
