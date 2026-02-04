import {
    Component,
    Injector,
    OnInit,
} from '@angular/core';
import {Subject} from 'rxjs';
import {FieldType, IBearerModel} from '../../models/models';
import {BaseChannelModalComponent} from "../base-channel-modal.component";

@Component({
    selector: 'bearer-modal.component',
    templateUrl: './bearer-modal.component.html',
    styleUrls: ['bearer-modal.component.less']
})
export class BearerModalComponent extends BaseChannelModalComponent implements OnInit {

    submit = new Subject<IBearerModel>();

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
        const channel: IBearerModel = {
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
