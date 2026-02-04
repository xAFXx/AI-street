import {
    Component,
    Directive,
    Injectable,
    Injector,
    Input, OnInit,
} from '@angular/core';
import {AppComponentBase} from '@axilla/axilla-shared';
import {
    FormGroup,
    FormControl,
    Validators
} from '@angular/forms';
import {BsModalRef} from "ngx-bootstrap/modal";
import {AbpSessionService} from "abp-ng2-module";
import {IPagedResultDtoOfVirtualDbRowDto, IVirtualDbRowDto, VDBServiceProxy} from "../../../shared";
import {map, take, takeUntil, tap} from "rxjs/operators";
import {BehaviorSubject, Subject} from "rxjs";

declare var abp: any;

@Directive()
export abstract class BaseChannelModalComponent extends AppComponentBase {
    @Input() appName?: string;
    @Input() urlVariables: any;
    @Input() appAdditionalProperties: any;

    private readonly vdbName = 'Apps.Apprxr';

    protected _modal: BsModalRef;
    protected _session: AbpSessionService;
    protected _vdbService: VDBServiceProxy;

    protected readonly destroy$ = new Subject<void>();

    private _appsGatewaySubject = new BehaviorSubject<any[]>([]);
    readonly appsGateway$ = this._appsGatewaySubject.asObservable();

    get appsGateways(): any[] {
        return this._appsGatewaySubject.getValue() ?? [];
    }

    private _appGatewayAvailableSubject = new BehaviorSubject<boolean>(false);
    readonly appGatewayAvailable$ = this._appGatewayAvailableSubject.asObservable();

    get isGatewayAvailable(): boolean {
        return this._appGatewayAvailableSubject.getValue() ?? false;
    }

    createChannelForm: FormGroup = new FormGroup({
        authVariables: new FormGroup({})
    });

    protected fields: any[] = [];

    protected constructor(
        injector: Injector,
    ) {
        super(injector);

        this._modal = injector.get(BsModalRef);
        this._session = injector.get(AbpSessionService);
        this._vdbService = injector.get(VDBServiceProxy);
    }

    baseOnInit(): void {
        this.getAppsGateways();

        this.appGatewayAvailable$
            .pipe(
                takeUntil(this.destroy$),
            )
            .subscribe(isAvailable => {
                if (isAvailable) {
                    this.fields.push({
                        id: 'gateway',
                        type: 'checkbox',
                        value: false
                    });
                    this.initForm();
                }
            })
    }

    protected initForm(): void {
        if (!this.fields || this.fields.length === 0) {
            return;
        }

        this.fields.forEach(field => {
            const {id, required} = field;

            // Skip invalid or missing IDs
            if (!id) return;

            // Check if control already exists
            const existingControl = this.createChannelForm.get(id);
            if (existingControl) {
                // Optionally reset its value/validators instead of skipping
                existingControl.setValidators(required ? Validators.required : null);
                existingControl.updateValueAndValidity({emitEvent: false});
                return;
            }

            // Add new control if it doesn't exist
            const control = new FormControl('', required ? Validators.required : null);
            this.createChannelForm.addControl(id, control);
        });

        this.initAuthArgs();
    }

    get authVariables(): FormGroup {
        return this.createChannelForm.get("authVariables") as FormGroup;
    }

    get authFields(): any {
        return this.fields.find(item => item.id == 'authVariables').value;
    }

    isAuthVariables(id: string): boolean {
        return id == 'authVariables';
    }

    getAppsGateways() {
        this._vdbService.getSearchVirtualDbRows(
            undefined,
            this.vdbName,
            undefined,
            undefined,
            undefined,
            false,
            '',
            0,
            1000
        )
            .pipe(
                take(1),
                map((gatewaysResult: IPagedResultDtoOfVirtualDbRowDto) => {
                    return gatewaysResult.items;
                }),
                map((gatewayRows: IVirtualDbRowDto[]) => {
                    return gatewayRows.map(row => JSON.parse(row.value)) ?? [];
                }),
                tap((apps: any[]) => {
                    this._appsGatewaySubject.next(apps);
                }),
                tap((apps: any[]) => {
                    const availability = this.appsGateways.some(item => item.name === this.appName);
                    this._appGatewayAvailableSubject.next(availability);

                })
            ).subscribe()
    }

    initAuthArgs() {
        let tempFields = [];
        if (this.urlVariables && this.urlVariables.length > 0) {
            for (let i = 0; i < this.urlVariables.length; i++) {
                let label = this.urlVariables[i];
                let id = label;//.split('.').pop();
                let placeholder = `Axilla.Channel.Modal.${id}.Placeholder`;

                tempFields.push({id: id, label: label, value: '', type: 'text', placeholder: placeholder,});

                this.authVariables.addControl(id, new FormControl("", Validators.required));
            }
        }

        if (this.appAdditionalProperties) {
            // @ts-ignore
            for (const [key, value] of Object.entries(this.appAdditionalProperties)) {
                let label = key;
                let id = label;//.split('.').pop();
                let placeholder = `Axilla.Channel.Modal.${id}.Placeholder`;

                tempFields.push({id: id, label: label, value: value || '', type: 'text', placeholder: placeholder});

                this.authVariables.addControl(id, new FormControl("", Validators.required));
                this.authVariables.get(id).setValue(value);
            }
        }

        this.fields.find(item => item.id == 'authVariables').value = tempFields;
    }

    close(): void {
        this._modal.hide();
        this.createChannelForm.reset();
    }
}
