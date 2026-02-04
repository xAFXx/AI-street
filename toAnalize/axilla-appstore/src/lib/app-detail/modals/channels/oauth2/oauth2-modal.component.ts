import {
    Component,
    Injector,
    OnInit,
} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';
import {Subject} from 'rxjs';
import {BaseChannelModalComponent} from "../base-channel-modal.component";
import {FieldType, GrantTypeOption, IOauth2Model} from "../../models/models";


@Component({
    selector: 'oauth2-modal.component',
    templateUrl: './oauth2-modal.component.html',
    styleUrls: ['oauth2-modal.component.less']
})
export class Oauth2ModalComponent extends BaseChannelModalComponent implements OnInit {

    submit = new Subject<IOauth2Model>();

    // what user sees in p-dropdown
    grantTypeOptions: GrantTypeOption[] = [
        {
            label: 'Axilla.Channel.Modal.OAuth2.Grant.AuthorizationCode',
            value: 'authorization_code'
        },
        {
            label: 'Axilla.Channel.Modal.OAuth2.Grant.ClientCredentials',
            value: 'client_credentials'
        },
        {
            label: 'Axilla.Channel.Modal.OAuth2.Grant.RefreshToken',
            value: 'refresh_token'
        },
        {
            label: 'Axilla.Channel.Modal.OAuth2.Grant.Password',
            value: 'password'
        },
        {
            label: 'Axilla.Channel.Modal.OAuth2.Grant.DeviceCode',
            value: 'urn:ietf:params:oauth:grant-type:device_code'
        },
        {
            label: 'Axilla.Channel.Modal.OAuth2.Grant.JwtBearer',
            value: 'urn:ietf:params:oauth:grant-type:jwt-bearer'
        }
    ];

    // currently selected grant type
    selectedGrantType = 'authorization_code';

    // dynamic fields for the currently selected grant type
    grantFields: FieldType[] = [];

    /**
     * Base fields from your example – email, certificate, authVariables
     * handled by BaseChannelModalComponent.initForm().
     */
    override fields: FieldType[] = [
        {id: 'authVariables', type: 'array', value: []}
    ];

    /**
     * Schema for grant-type specific fields.
     * You can adjust labels/placeholder translation keys as needed.
     */
    private readonly grantTypeFieldMap: { [grantType: string]: FieldType[] } = {
        'password': [
            {
                id: 'userName',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.UserName.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.UserName',
                value: '',
                required: true
            },
            {
                id: 'userSecret',
                type: 'password',
                placeholder: 'Axilla.Channel.Modal.OAuth2.UserSecret.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.UserSecret',
                value: '',
                required: true
            },
            {
                id: 'clientId',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientId.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientId',
                value: '',
                required: true
            },
            {
                id: 'clientSecret',
                type: 'password',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientSecret.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientSecret',
                value: '',
                required: true
            },
            {
                id: 'scope',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.Scope.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.Scope',
                value: '',
                required: true
            }
        ],
        'authorization_code': [
            {
                id: 'clientId',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientId.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientId',
                value: '',
                required: true
            },
            {
                id: 'clientSecret',
                type: 'password',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientSecret.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientSecret',
                value: '',
                required: true
            },
            {
                id: 'redirectUri',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.RedirectUri.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.RedirectUri',
                value: '',
                required: true
            },
            {
                id: 'scope',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.Scope.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.Scope',
                value: '',
                required: false
            }
        ],
        'client_credentials': [
            {
                id: 'clientId',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientId.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientId',
                value: '',
                required: true
            },
            {
                id: 'clientSecret',
                type: 'password',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientSecret.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientSecret',
                value: '',
                required: true
            },
            {
                id: 'scope',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.Scope.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.Scope',
                value: '',
                required: false
            }
        ],
        'refresh_token': [
            {
                id: 'refreshToken',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.RefreshToken.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.RefreshToken',
                value: '',
                required: true
            },
            {
                id: 'clientId',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientId.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientId',
                value: '',
                required: false
            },
            {
                id: 'clientSecret',
                type: 'password',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientSecret.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientSecret',
                value: '',
                required: false
            }
        ],
        'urn:ietf:params:oauth:grant-type:device_code': [
            {
                id: 'deviceCode',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.DeviceCode.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.DeviceCode',
                value: '',
                required: true
            },
            {
                id: 'clientId',
                type: 'text',
                placeholder: 'Axilla.Channel.Modal.OAuth2.ClientId.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.ClientId',
                value: '',
                required: true
            }
        ],
        'urn:ietf:params:oauth:grant-type:jwt-bearer': [
            {
                id: 'assertion',
                type: 'textarea',
                placeholder: 'Axilla.Channel.Modal.OAuth2.Assertion.Placeholder',
                label: 'Axilla.Channel.Modal.OAuth2.Assertion',
                value: '',
                required: true
            }
        ]
    };

    constructor(
        injector: Injector
    ) {
        super(injector);
    }

    ngOnInit(): void {
        // 1) basic form from base class (email, certificate, authVariables, gateway)
        this.initForm();

        // 2) add grantType as control
        if (!this.createChannelForm.contains('grantType')) {
            this.createChannelForm.addControl(
                'grantType',
                new FormControl(this.selectedGrantType, Validators.required)
            );
        }

        // 3) initialize grant-specific fields
        this.updateGrantFields(this.selectedGrantType);

        // any shared initialization from base
        this.baseOnInit();
    }

    /**
     * Handler for dropdown change.
     */
    onGrantTypeChange(grantType: string): void {
        this.selectedGrantType = grantType;
        this.createChannelForm.get('grantType')?.setValue(grantType);
        this.updateGrantFields(grantType);
    }

    /**
     * Adds/removes controls for the current grant type on the reactive form
     * and updates `grantFields` for the template.
     */
    private updateGrantFields(grantType: string): void {
        // remove previous grant fields from form
        if (this.grantFields?.length) {
            this.grantFields.forEach(f => {
                if (this.createChannelForm.contains(f.id)) {
                    this.createChannelForm.removeControl(f.id);
                }
            });
        }

        // get fields for new grant type
        this.grantFields = this.grantTypeFieldMap[grantType] || [];

        // add controls for new grant fields
        this.grantFields.forEach(field => {
            const validators = field.required ? [Validators.required] : [];
            const initialValue = field.value ?? null;

            if (!this.createChannelForm.contains(field.id)) {
                this.createChannelForm.addControl(
                    field.id,
                    new FormControl(initialValue, validators)
                );
            }
        });
    }

    onSubmit() {
        const formValue = this.createChannelForm.value;

        const channel: IOauth2Model = formValue as IOauth2Model;

        if (this.isGatewayAvailable) {
            (channel as any).gateway = formValue.gateway;
        }

        this.submit.next(channel);
        this.close();
    }
}
