import {Component, Injector, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from "@angular/core";
import {AppComponentBase, PrimengTableHelper, UpdateFieldTypes} from "@axilla/axilla-shared";
import {ActivatedRoute, Router} from "@angular/router";
import {catchError, filter, switchMap, take} from "rxjs/operators";
import {
    ApiConfServiceProxy,
    ApiConnectionSettingServiceProxy,
    AppServiceBaseServiceProxy,
    AppStoreServiceProxy,
    ChannelDefinitionServiceProxy,
    IAdditionalPropertyDto,
    IApiCallInputDto,
    IApiCallsOutputDto,
    IAppAssignmentListDto,
    AuthenticationMethod,
    ICreateApiInputDto,
    IAuthArguments,
    IPagedResultDtoOfChannelDefinitionDto,
    ICreateJobDefinitionInput,
    ICreateNewChannelInput,
    IChannelDefinitionDto,
    ICreateApiConnectionSettingDto,
    IUpdateApiConnectionSettingDto,
    ILoginOauth2
} from "../shared";
import {BehaviorSubject, of, Subscription, tap, throwError} from "rxjs";
import {BsModalRef, BsModalService} from "ngx-bootstrap/modal";

import {
    IAuthVariable,
    IApiKeyModel,
    IBearerModel,
    IChannelModel,
    ICustomAuthModel,
    IGoogleOauthModel,
    IIMAPModel,
    INtlmModel,
    IOauth2Model,
    ITokenSecretModel
} from "./modals/models/models";

import {DomSanitizer} from "@angular/platform-browser";
import {Paginator} from 'primeng/paginator';
import {Table} from 'primeng/table';
import {LazyLoadEvent} from 'primeng/api'

import {
    AuthDeterminationModalComponent,
    CreateApiConnectionSettingModalComponent,
    CreateOrEditApiCallModalComponent,
} from './modals/index';

import {
    BearerModalComponent,
    IMAPModalComponent,
    Oauth2GoogleModalComponent,
    TokenSecretModalComponent,
    CustomAuthModalComponent,
    NtlmModalComponent,
    OauthModalComponent,
    Oauth2TwinfieldModalComponent,
    ApiKeyModalComponent,
    CreateChannelModalComponent, Oauth2ModalComponent,
} from './modals/channels'

import {CreateOrEditJobModalComponent, UpdateExecutionDefinitionModalComponent} from '../jobs/index';

import _ from 'lodash';

import {AppService, CustomSettingsService} from '../shared/services/index';
import {AppStorePermissions} from '../shared/permissions/shared-permissions';
import {ExecuteApiModalComponent} from "../modals/execute-api/execute-api-modal.component";

declare let abp: any;

@Component({
    templateUrl: './app.detail.component.html',
    styleUrls: ['./app.detail.component.less',
        '../baseDesign.css',
    ],
    selector: 'apps.store',
    encapsulation: ViewEncapsulation.None
})
export class AppDetailComponent extends AppComponentBase implements OnInit, OnDestroy {
    @ViewChild('authDeterminationModal', {static: true}) authDeterminationModal: AuthDeterminationModalComponent;

    @ViewChild('dataTable', {static: true}) dataTable: Table;
    @ViewChild('paginator', {static: true}) paginator: Paginator;

    urlVariables: string[] = [];

    get AppStorePermissions(): typeof AppStorePermissions {
        return AppStorePermissions;
    }

    //Object to binding default properties
    get globalObjects(): any[] {
        return this.appService.globalObjects;
    }

    get globalObject(): any[] {
        return this.appService.globalObject;
    }

    channelDefinitionTH: PrimengTableHelper;
    UpdateFieldTypes: typeof UpdateFieldTypes = UpdateFieldTypes;

    constructor(injector: Injector,
                private route: ActivatedRoute,
                private router: Router,
                private readonly _appStoreService: AppStoreServiceProxy,
                private readonly apiConfService: ApiConfServiceProxy,
                private readonly modalService: BsModalService,
                private readonly _apiConnectionSettingService: ApiConnectionSettingServiceProxy,
                private readonly channelDefinitionServiceProxy: ChannelDefinitionServiceProxy,
                private readonly _appServiceBase: AppServiceBaseServiceProxy,
                private readonly _sanitizer: DomSanitizer,
                private appService: AppService,
                private customSettingsService: CustomSettingsService
    ) {
        super(injector);

        this.channelDefinitionTH = new PrimengTableHelper();
    }

    createJobModal$: Subscription;
    changeRouter$: Subscription;

    ngOnDestroy(): void {
        if (this.createJobModal$) {
            this.createJobModal$.unsubscribe();
        }
        if (this.changeRouter$) {
            this.changeRouter$.unsubscribe();
        }
    }

    ngOnInit(): void {
        this.channelDefinitionTH = new PrimengTableHelper();
        this.changeRouter$ = this.route.params.subscribe(params => {
            this.initIAppAssignmentListDto();
            this.initApiCallsOutput();
        });

        this._initPEDEvents();
    }

    isValid(name: string, required: boolean): boolean {
        if (!required) {
            return true;
        }

        const nameValue = this.globalObject[0].properties.filter(f => f.name === name)[0].value;
        return !!nameValue;
    }

    isValidProperty(property: IAdditionalPropertyDto): boolean {
        if (!property.required) {
            return true;
        }

        const nameValue = property.name;
        return !!nameValue;
    }

    get getTotalCount(): number {
        let channelDefinitionTH = this.channelDefinitionTH;
        if (channelDefinitionTH) {
            if (channelDefinitionTH.records) {
                return channelDefinitionTH.records.length;
            }
        }
        return 0;
    }

    private _channelDefinitionsSubject = new BehaviorSubject<IChannelDefinitionDto[]>([]);
    channelDefinitions$ = this._channelDefinitionsSubject.asObservable();

    private _appId: string;
    private _appSubject = new BehaviorSubject<IAppAssignmentListDto>(null);
    app$ = this._appSubject.asObservable().pipe(filter(f => !!f));

    get appDetail(): IAppAssignmentListDto {
        return this._appSubject.getValue();
    }

    get authentication(): AuthenticationMethod {
        return this._appSubject.getValue().authentication;
    }

    private _apiCallsSubject = new BehaviorSubject<IApiCallsOutputDto[]>([]);
    apiCalls$ = this._apiCallsSubject.asObservable();

    showButtonCreateConnectionSettings = this.app$.pipe(
        filter(f => !!f),
        switchMap((app: IAppAssignmentListDto) => {
            const result = app.authentication !== AuthenticationMethod.NoAuthentication;
            return of(result);
        })
    );

    showBearer$ = this.app$.pipe(
        filter(f => !!f),
        switchMap((app: IAppAssignmentListDto) => {
            const result = app.authentication === AuthenticationMethod.Bearer;
            return of(result);
        })
    );
    showApiKey$ = this.app$.pipe(
        filter(f => !!f),
        switchMap((app: IAppAssignmentListDto) => {
            const result = app.authentication === AuthenticationMethod.ApiKey;
            return of(result);
        })
    );

    getChannelDefinition(event?: LazyLoadEvent) {
        const row = this.channelDefinitionTH.getMaxResultCount(this.paginator, null);

        if (this._appAssignmentId) {
            this.channelDefinitionServiceProxy
                .getAllForApp(
                    this._appAssignmentId,
                    this.channelDefinitionTH.getSorting(this.dataTable),
                    this.channelDefinitionTH.getSkipCount(this.paginator, event),
                    row == 0 ? 10 : row
                )
                .pipe(
                    take(1),
                    tap((result: IPagedResultDtoOfChannelDefinitionDto) => {
                        this._channelDefinitionsSubject.next(result.items);
                    })
                )
                .subscribe((result: IPagedResultDtoOfChannelDefinitionDto) => {

                    this.channelDefinitionTH.totalRecordsCount = result.totalCount;
                    this.channelDefinitionTH.records = result.items;
                    this.channelDefinitionTH.hideLoadingIndicator();
                });
        }
    }

    private _appAssignmentId: string;

    private initIAppAssignmentListDto(): void {
        this.route.params
            .pipe(take(1),//for automatic unsubscription
                catchError(err => {
                    return throwError(err);
                }))
            .subscribe(params => {
                this._appId = params['id'];

                if (!this._appId) {
                    this.router.navigate(['app/appstore']);
                }

                this._appStoreService.getById(this._appId)
                    .pipe(take(1))
                    .subscribe((app: IAppAssignmentListDto) => {
                        if (app.name === 'Ublion') {
                            this.router.navigate(['app/appstore/app', this._appId]);
                        }

                        if (!app.id) {
                            this.router.navigate(['app/appstore']);
                        }
                        this._appAssignmentId = app.appAssignmentId;
                        this._appSubject.next(app);

                        this.customSettingsService.refreshCustomSettings(app.id, app.name);

                        this.getChannelDefinition();
                        this.checkBaseUrl();
                    });
            });
    }

    private initApiCallsOutput(): void {
        this.apiConfService.getByAppId(this._appId)
            .pipe(
                take(1),
                catchError(err => {
                    return throwError(err);
                })
            )
            .subscribe((apiCalls: IApiCallsOutputDto[]) => {
                this._apiCallsSubject.next(apiCalls);
            });
    }

    backToAppList(): void {
        this.router.navigate(['app/appstore']);
    }

    get appId(): string {
        return this._appSubject.getValue().id;
    }

    get appAdditionalProperties(): any {
        return this._appSubject.getValue().additionalDicProperties;
    }

    get appBaseUrl(): string {
        return this._appSubject.getValue().baseUrl;
    }

    addNewApiCall() {
        this.createOrEdit();
    }

    onRowSelect($event) {
        this.editApiCall($event.data.id);
    }

    deleteApi(id: string) {
        this.apiConfService
            .delete(id)
            .pipe(take(1))
            .subscribe(() => {
                this.deleteFromApiCalls(id);
            });
    }

    openDeleteChannelConfirmWindow(channelId: string) {
        let message = this.ls('Axilla', 'Axilla.DeleteChannel.Message');
        let title = this.ls('Axilla', 'Axilla.DeleteChannel.Title');

        abp.message.confirm(message,
            title,
            (result: boolean) => {
                if (result) {
                    this.deleteChannel(channelId);
                }
            });
    }

    deleteChannel(channelId: string) {
        this.channelDefinitionServiceProxy.delete(channelId)
            .pipe(take(1))
            .subscribe((result) => {
                this.getChannelDefinition();
            });
    }

    get ifDisabled(): boolean {
        if (this.channelDefinitionTH && this.channelDefinitionTH.records) {
            return this.channelDefinitionTH.records.length > 0;
        }

        return false;
    }

    private createOrEdit(id?: string) {

        const createOrEditApiCall = this.modalService.show(CreateOrEditApiCallModalComponent, {
            'initialState': {
                apiCallId: id,
                appId: this.appId
            },
            'backdrop': 'static',
            'keyboard': false,
            'class': "w-80"
        });

        let selectModal = createOrEditApiCall.content as CreateOrEditApiCallModalComponent;

        selectModal.saveSubject
            .pipe(take(1))
            .subscribe((createApiInput: ICreateApiInputDto) => {
                this._appStoreService.addApiCall(createApiInput)
                    .pipe(
                        take(1),
                        catchError(err => {
                            return throwError(err);
                        })
                    ).subscribe((apiCallsOutput: IApiCallsOutputDto) => {
                    const apis = this._apiCallsSubject.getValue();
                    apis.push(apiCallsOutput);
                    this._apiCallsSubject.next(apis);
                });


            });

        selectModal.updateSubject
            .pipe(take(1))
            .subscribe((updateApiCallInput: IApiCallInputDto) => {
                this.apiConfService.update(updateApiCallInput)
                    .pipe(
                        take(1),
                        catchError(err => {
                            return throwError(err);
                        })
                    ).subscribe((apiCall: IApiCallsOutputDto) => {
                    const oldApiCall = this._apiCallsSubject.getValue().find(f => f.id === apiCall.id);
                    //remove the old value from the collection
                    const apiCalls = this._apiCallsSubject.getValue().filter(f => f.id !== oldApiCall.id);
                    apiCalls.push(apiCall);
                    //update the table
                    this._apiCallsSubject.next(apiCalls);
                });

            });
    }

    openAddNewJob(): void {
        const createOrEditJob = this.modalService.show(CreateOrEditJobModalComponent, {
            'initialState': {
                apiDefinitionId: this.appId,
                authentication: this.authentication
            },
            'backdrop': 'static',
            'keyboard': false,
            'class': "w-80"
        });

        let createJob = createOrEditJob.content as CreateOrEditJobModalComponent;
        this.createJobModal$ = createJob
            .submit
            .subscribe((data: ICreateJobDefinitionInput) => {
                if (!data.isDayly) {
                    data.isDayly = false;
                }

                this.appService.scheduleJob(data);
            });
    }

    private _updateExecutionDefinition: BsModalRef;

    openUpdateDefinition(): void {
        let title = '';

        this.app$
            .pipe(take(1))
            .subscribe((app: IAppAssignmentListDto) => {
                title = app.title
            });

        this.onShowPEDModal();
    }

    private _initPEDEvents() {
        abp.event.on('onHidePEDModal', () => this.onHidePEDModal());
        abp.event.on('onShowPEDModal', () => this.onShowPEDModal());
    }

    onHidePEDModal() {
        this._updateExecutionDefinition.hide();
    }

    onShowPEDModal() {
        this._updateExecutionDefinition = this.modalService.show(UpdateExecutionDefinitionModalComponent, {
            'initialState': {
                apiDefinitionId: this.appId,
                authentication: this.authentication,
                appTitle: '',
            },
            'backdrop': 'static',
            'keyboard': false,
            'class': "w-80"
        });
    }

    //open madal add connection settings()
    openAddConnectionSettings(): void {
        const createOrEditApiCall = this.modalService.show(CreateApiConnectionSettingModalComponent, {
            'initialState': {
                apiDefinitionId: this.appId,
                authentication: this.authentication
                //appId: this.appId
            }
        });

        let createApiConnectionSetting = createOrEditApiCall.content as CreateApiConnectionSettingModalComponent;
        createApiConnectionSetting
            .create
            .pipe(take(1))
            .subscribe((createApiConnectionSetting: ICreateApiConnectionSettingDto) => {
                this._apiConnectionSettingService
                    .create(createApiConnectionSetting)
                    .pipe(take(1))
                    .subscribe((updateApiConnectionSetting: IUpdateApiConnectionSettingDto) => {

                    });
            });
    }

    private deleteFromApiCalls(id: string) {
        //remove the old value from the collection
        const apiCalls = this._apiCallsSubject.getValue().filter(f => f.id !== id);
        this._apiCallsSubject.next(apiCalls);
    }

    //#region Execute API
    protected executeApi(id: string) {

        const executeApiModalComponent = this.modalService.show(ExecuteApiModalComponent, {
            'initialState': {
                apiCall: this.getApiCallById(id),
                appId: this.appId,
                channelId: this.channelDefinitionTH.records[0]?.id
            },
            'backdrop': 'static',
            'keyboard': false,
            'class': "w-80"
        });
        const modalComponent = executeApiModalComponent.content as ExecuteApiModalComponent;

        // modalComponent.submit
        //     .pipe(take(1))
        //     .subscribe((model: any) => {
        //         let data = {
        //             installedAppGuid: this._appId,
        //             oauthArguments: this._convertOauth2ToAuthArgumentsFilled(model),
        //             gateway: model.gateway ?? false
        //         } as ICreateNewChannelInput;
        //
        //         this._checkOauthArguments(data, model);
        //         this._createChannel(data);
        //     });
    }

    private getApiCallById(id: string): IApiCallsOutputDto {
        return this._apiCallsSubject.getValue().find(f => f.id === id);
    }

    //#endregion Execute API



    //#region CreateChannel

    openNewChannel() {
        switch (this.authentication) {
            case AuthenticationMethod.Oauth2Twinfield: {
                this.handleOauth2Twinfield();
                break;
            }
            case AuthenticationMethod.Oauth2: {
                this.handleOauth2();
                break;
            }
            case AuthenticationMethod.BasicAuth: {
                this.openBasicAuth();
                break;
            }
            case AuthenticationMethod.Oauth: {
                this.openOauthAuth();
                break;
            }
            case AuthenticationMethod.Bearer: {
                this.openBearer();
                break;
            }
            case AuthenticationMethod.ApiKey: {
                this.openApiKey();
                break;
            }
            case AuthenticationMethod.NoAuthentication: {
                this.handleNoAuth();
                break;
            }
            case AuthenticationMethod.Token: {
                this.openTokenSecret();
                break;
            }
            case AuthenticationMethod.Oauth2_Google: {
                this._openGoogleAuth();
                break;
            }
            case AuthenticationMethod.NTLM: {
                this._openNTLMAuth();
                break;
            }
            case AuthenticationMethod.IMAP: {
                this._openIMAPAuth();
                break;
            }
            case AuthenticationMethod.CustomAuth: {
                this._openCustomAuth();
                break;
            }
        }
    }

    private handleNoAuth() {
        let data = {
            installedAppGuid: this._appId
        } as ICreateNewChannelInput;

        this._appServiceBase.createChannel(data)
            .pipe(take(1))
            .subscribe((result: IChannelDefinitionDto) => {
                this.getChannelDefinition();
            });
    }

    private _convertOauth2ToAuthArgumentsFilled(model: IOauth2Model): IAuthArguments[] {
        const result: IAuthArguments[] = [];

        Object.entries(model).forEach(([key, val]) => {
            if (key === 'gateway' || key === 'authVariables') return;
            if (val === null || val === undefined) return;

            result.push({
                name: key,
                value: String(val)
            });
        });

        return result;
    }

    private handleOauth2() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        if (this.appAdditionalProperties) {
            options['appAdditionalProperties'] = this.appAdditionalProperties;
        }

        const createChannelModalComponent = this.modalService.show(Oauth2ModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as Oauth2ModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: any) => {

                let missingAuthArguments = this._convertOauth2ToAuthArgumentsFilled(model);
                const baseAuthVariables = model.authVariables;

                const oauthArgumentsObject = {
                    ...baseAuthVariables,
                    ...Object.fromEntries(
                        missingAuthArguments.map(v => [v.name, v.value])
                    )
                };

                const oauthArguments = Object.entries(oauthArgumentsObject)
                    .map(([name, value]) => {
                        return {name: name, value: value} as IAuthArguments
                    });

                let data = {
                    installedAppGuid: this._appId,
                    oauthArguments: oauthArguments,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._createChannel(data);
            });
    }

    private handleOauth2Twinfield() {
        if (this.checkBaseUrl()) {
            this.showAuthDeterminationModal();
            return;
        }

        this._appServiceBase.getOauth2Authentication(this._appId, [])
            .pipe(take(1))
            .subscribe((loginOauth2: ILoginOauth2) => {
                //this.openOauth2(loginOauth2.loginMask, loginOauth2.loginUrl);
                window.location.href = loginOauth2.loginUrl;
            });
    }

    private _openCustomAuth() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        if (this.appAdditionalProperties) {
            options['appAdditionalProperties'] = this.appAdditionalProperties;
        }

        const createChannelModalComponent = this.modalService.show(CustomAuthModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as CustomAuthModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: ICustomAuthModel) => {
                let data = {
                    username: model.headername,
                    password: model.value,
                    domain: model.prefix,
                    installedAppGuid: this._appId,
                    oauthArguments: undefined,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);
                //TODO: change call
                this._createChannel(data);
            });
    }

    private _openIMAPAuth() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        if (this.appAdditionalProperties) {
            options['appAdditionalProperties'] = this.appAdditionalProperties;
        }

        const createChannelModalComponent = this.modalService.show(IMAPModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as IMAPModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: IIMAPModel) => {
                let data = {
                    username: model.username,
                    password: model.password,
                    domain: model.domain,
                    installedAppGuid: this._appId,
                    oauthArguments: undefined,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);
                //TODO: change call
                this._createChannel(data);
            });
    }

    private _openNTLMAuth() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        if (this.appAdditionalProperties) {
            options['appAdditionalProperties'] = this.appAdditionalProperties;
        }

        const createChannelModalComponent = this.modalService.show(NtlmModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as NtlmModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: INtlmModel) => {
                let data = {
                    username: model.username,
                    password: model.password,
                    domain: model.domain,
                    installedAppGuid: this._appId,
                    oauthArguments: undefined,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);
                //TODO: change call
                this._createChannel(data);
            });
    }

    private _openGoogleAuth() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        const createChannelModalComponent = this.modalService.show(Oauth2GoogleModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as Oauth2GoogleModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: IGoogleOauthModel) => {
                let data = {
                    username: model.certificate,
                    password: model.email,
                    installedAppGuid: this._appId,
                    oauthArguments: undefined,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);
                //TODO: change call
                this._createChannel(data);
            });
    }

    private openTokenSecret() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        const createChannelModalComponent = this.modalService.show(TokenSecretModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as TokenSecretModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: ITokenSecretModel) => {
                let data = {
                    username: model.token,
                    password: model.secret,
                    installedAppGuid: this._appId,
                    oauthArguments: undefined,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);

                this._createChannel(data);
            });
    }

    private openOauthAuth() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        const createChannelModalComponent = this.modalService.show(OauthModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as OauthModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: IChannelModel) => {
                let data = {
                    username: model.username,
                    password: model.password,
                    installedAppGuid: this._appId,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);

                this._createChannel(data);
            });
    }

    private openBasicAuth() {
        if (this.checkBaseUrl()) {
            this.showAuthDeterminationModal();
            return;
        }

        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        const createChannelModalComponent = this.modalService.show(CreateChannelModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as CreateChannelModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: IChannelModel) => {
                let data = {
                    username: model.username,
                    password: model.password,
                    installedAppGuid: this._appId,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);

                this._createChannel(data);
            });
    }

    private openBearer() {
        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        const createChannelModalComponent = this.modalService.show(BearerModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as BearerModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: IBearerModel) => {
                let data = {
                    password: model.password,
                    installedAppGuid: this._appId,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);

                this._createChannel(data);
            });
    }

    private openApiKey() {
        if (this.checkBaseUrl()) {
            this.showAuthDeterminationModal();
            return;
        }

        let options = {
            ...this._getModalOptions(),
            appName: this.appDetail.title,
        };

        const createChannelModalComponent = this.modalService.show(ApiKeyModalComponent, {'initialState': options});
        const modalComponent = createChannelModalComponent.content as ApiKeyModalComponent;

        modalComponent.submit
            .pipe(take(1))
            .subscribe((model: IApiKeyModel) => {
                let data = {
                    password: model.password,
                    installedAppGuid: this._appId,
                    gateway: model.gateway ?? false
                } as ICreateNewChannelInput;

                this._checkOauthArguments(data, model);

                this._createChannel(data);
            });
    }

    private openOauth2(htmlStr: string, loginUrl: string) {
        const htmlStrTemp = this._sanitizer.bypassSecurityTrustHtml(htmlStr);
        const loginUrlTemp = this._sanitizer.bypassSecurityTrustResourceUrl(loginUrl);
        const oauth2ModalComponent = this.modalService.show(Oauth2TwinfieldModalComponent, {
            'initialState': {
                htmlString: htmlStrTemp,
                url: loginUrlTemp
            }
        });
    }

    //#region Helper
    private _createChannel(data: ICreateNewChannelInput) {
        this._appServiceBase.createChannel(data)
            .pipe(take(1))
            .subscribe((result: IChannelDefinitionDto) => {
                this.getChannelDefinition();
            });
    }

    private _checkOauthArguments(data: ICreateNewChannelInput, model: IAuthVariable) {
        if (model.authVariables && !_.isEmpty(model.authVariables)) {
            // @ts-ignore
            data.oauthArguments = Object.entries(model.authVariables)
                .map(([name, value]) => {
                    return {name: name, value: value} as IAuthArguments
                });
        }
    }

    private _getModalOptions() {
        let options = {};
        if (this.urlVariables && this.urlVariables.length > 0) {
            options['urlVariables'] = this.urlVariables;
        }
        return options;
    }

    //#endregion Helper

    //#endregion CreateChannel

    getOauthLogin($event?: any[]): void {
        if ($event && $event.length > 0) {
            this._appServiceBase.getOauth2Authentication(this._appId, $event)
                .pipe(take(1))
                .subscribe((loginOauth2: ILoginOauth2) => {
                    window.location.href = loginOauth2.loginUrl;
                });
        }
    }

    editApiCall(id: string) {
        this.createOrEdit(id);
    }

    onChangeUpdateFieldTextValue(value, name, channelId, useCache = true) {
        const app = this._appSubject.getValue();

        this.customSettingsService
            .onChangeUpdateFieldTextValueWithRefresh(name,
                value,
                app.appId,
                channelId,
                app.name,
                useCache);
    }

    startJob(params: any): void {
        if (params == null) {
            abp.message.warn("There is nothing to start", "Starting processor abborted");
            return;
        }

        this._appServiceBase
            .startJob(params)
            .subscribe((result) => {
                console.log(result);
            });
    }

    checkBaseUrl(): boolean {
        if (!this.appBaseUrl) {
            return false;
        }
        let appBaseUrl = this.appBaseUrl.replace('||CustomSetting', '');
        if (!appBaseUrl) {
            return false;
        }

        this.urlVariables = this.getVariablesFromString(appBaseUrl);
        return this.urlVariables.length > 0;
    }

    private getVariablesFromString(url: string): string[] {
        let results = url.match(/{{[\w.]*}}/g);
        if (results == null) {
            return [];
        }
        if (results.length == 0) {
            return [];
        }

        return results.map(item => {
            return item.replace('{{', '').replace('}}', '');
        });
    }

    showAuthDeterminationModal(): void {
        this.authDeterminationModal.show(this.urlVariables);
    }
}
