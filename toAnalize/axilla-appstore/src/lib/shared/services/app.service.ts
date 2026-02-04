import {Injectable, Injector} from '@angular/core';

import {Subject} from 'rxjs';
import {take} from "rxjs/operators";
import {NotifyService} from 'abp-ng2-module';

import {
  AppServiceBaseServiceProxy,
  AppStoreServiceProxy,
  ChannelDefinitionServiceProxy,
  AppJobSchedulerServiceProxy,
  IAppAssignmentListDto,
  IChannelDefinitionDto,
  IPagedResultDtoOfChannelDefinitionDto, IStartProcessorJobInput, ICreateJobDefinitionInput,
} from "../service-proxies/service-proxies";

import {UpdateFieldTypes} from '@axilla/axilla-shared';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  private notify: NotifyService;

  private _installedApp: IAppAssignmentListDto[] = [];
  get installedApp(): IAppAssignmentListDto[] {
    return this._installedApp;
  }

  set installedApp(value: IAppAssignmentListDto[]) {
    this._installedApp = value;
  }

  public startJobs: Subject<any> = new Subject();

  app: IAppAssignmentListDto;
  channel: IChannelDefinitionDto;

  private _globalObject: any[] = [];
  get globalObject(): any[] {
    return this._globalObject;
  }

  set globalObject(value: any[]) {
    this._globalObject = value;
  }

  private _globalObjects: any[] = [
    {
    name: "ExactGlobe",
    properties: [
        {
      type: UpdateFieldTypes.Text,
      name: "App.ExactGlobe.Setting.DatabaseName",
      value: null,
      required: true,
      linkedToChannel: false,
      channelId: null,
      useCache: false
    },
        {
      type: UpdateFieldTypes.Text,
      name: 'App.ExactGlobe.Setting.ServerName',
      value: null,
      required: true,
      linkedToChannel: false,
      channelId: null,
      useCache: false
    }
    ]
    },
    {
    name: "ExactSynergy",
    properties: [{
    type: UpdateFieldTypes.Text,
    name: "App.ExactSynergy.Setting.DatabaseName",
    value: null,
    required: true,
    linkedToChannel: false,
    channelId: null,
    useCache: false
    }, {
    type: UpdateFieldTypes.Text,
    name: 'App.ExactSynergy.Setting.ServerName',
    value: null,
    required: true,
    linkedToChannel: true,
    channelId: null,
    useCache: false
    }]
    },
    {
      name: "ExactOnline",
      properties: [{
        type: UpdateFieldTypes.Text,
        name: "App.ExactOnline.Setting.DefaultJournal",
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.ExactOnline.Setting.DivisionId',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.ExactOnline.Setting.BTW0.Code',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.ExactOnline.Setting.BTWL.Code',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.ExactOnline.Setting.BTWH.Code',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.ExactOnline.Setting.BTWVerlegd.Code',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.ExactOnline.Setting.CustomRange',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.ExactOnline.Setting.Country',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null,
        useCache: false
      },
      ]
    },
    {
      name: "Ion",
      actions: [],
      properties: [{
        type: UpdateFieldTypes.Date,
        name: 'App.Ion.Setting.Relations.LastReadDate',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null
      }, {
        type: UpdateFieldTypes.Date,
        name: 'App.Ion.Setting.Projects.SyncStartDate',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null
      }, {
        type: UpdateFieldTypes.Date,
        name: 'App.Ion.Setting.Invoices.LastReadDate',
        value: null,
        required: true,
        linkedToChannel: true,
        channelId: null
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.Ion.Setting.Projects.ActivityIdToSkip',
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null
      },]
    },
    {
      name: "PostNL",
      properties: [{
        type: UpdateFieldTypes.Text,
        name: "App.PostNL.VDB.Source",
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: "App.PostNL.DataTransport.Processor",
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: "App.PostNL.Shipment.City",
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null,
        useCache: false
      }, {
        type: UpdateFieldTypes.Text,
        name: "App.PostNL.Shipment.CompanyName",
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null,
        useCache: false
      },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.CountryCode",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.HouseNr",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.Street",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.Zipcode",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.CollectionLocation",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.ContactPerson",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.CustomerCode",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.CustomerNumber",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.Email",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        },
        {
          type: UpdateFieldTypes.Text,
          name: "App.PostNL.Shipment.Name",
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null,
          useCache: false
        }
      ]
    },
    {
      name: "Twinfield",
      actions: [
        {
          name: 'Axilla.App.Twinfield.SyncRelations',
          properties: {
            processors: [
              {
                appName: 'Twinfield',
                processorsNames: ['Twinfield/SyncRelations']
              }
            ],
            channelId: '{{Twinfield||ChannelId}}',
            isDayly: true,
            params: JSON.stringify({
              OrganizationUnitId: '{{OrganizationUnitId||Current}}',
              TwinfieldChannelId: '{{Twinfield||ChannelId}}',
              IonChannelId: '{{Ion||ChannelId}}',
              TenantId: '{{TenantId||Current}}'
            }),
            startImmediately: true,
          }
        },
        {
          name: 'Axilla.App.Twinfield.SyncTimeSheets',
          properties: {
            processors: [
              {
                appName: 'Twinfield',
                processorsNames: ['Twinfield/SyncTimeSheets']
              }
            ],
            channelId: '{{Twinfield||ChannelId}}',
            isDayly: true,
            params: JSON.stringify({
              OrganizationUnitId: '{{OrganizationUnitId||Current}}',
              TwinfieldChannelId: '{{Twinfield||ChannelId}}',
              IonChannelId: '{{Ion||ChannelId}}',
              TenantId: '{{TenantId||Current}}'
            }),
            startImmediately: true,
          }
        },
        {
          name: 'Axilla.App.Twinfield.SyncInvoices',
          properties: {
            processors: [
              {
                appName: 'Twinfield',
                processorsNames: ['Twinfield/SyncInvoices']
              }
            ],
            channelId: '{{Twinfield||ChannelId}}',
            isDayly: true,
            params: JSON.stringify({
              OrganizationUnitId: '{{OrganizationUnitId||Current}}',
              TwinfieldChannelId: '{{Twinfield||ChannelId}}',
              IonChannelId: '{{Ion||ChannelId}}',
              TenantId: '{{TenantId||Current}}'
            }),
            startImmediately: true,
          }
        }
      ],
      properties: [{
        type: UpdateFieldTypes.Text,
        name: 'App.Twinfield.Setting.JournalTransaction.JournalBalance',
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.Twinfield.Setting.Invoices.DayBook',
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.Twinfield.Setting.TwinfieldCompanyCode',
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null
      }, {
        type: UpdateFieldTypes.Text,
        name: 'App.Twinfield.Setting.SalesTransaction.ARReceivable',
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null

      },]
    },
    {
      name: "Recras",
      properties: [
        {
          type: UpdateFieldTypes.Date,
          name: 'App.Recras.Setting.SyncStartDate',
          value: null,
          required: false,
          linkedToChannel: false,
          channelId: null,
        }
      ]
    },
    {
      name: "Xero",
      properties: [{
        type: UpdateFieldTypes.Date,
        name: 'App.XeroXeinadin.Setting.TrialBalance.StartDate',
        value: null,
        required: true,
        linkedToChannel: false,
        channelId: null
      },
        {
          type: UpdateFieldTypes.Date,
          name: 'App.XeroXeinadin.Setting.Customer.StartDate',
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null
        },
        {
          type: UpdateFieldTypes.Date,
          name: 'App.XeroXeinadin.Setting.Invoices.StartDate',
          value: null,
          required: true,
          linkedToChannel: false,
          channelId: null
        }],
      actions: [
        {
          name: 'Axilla.App.XeroXeinadin.TrialBalance',
          properties: {
            processors: [
              {
                appName: 'XeroXeinadin',
                processorsNames: ['XeroXeinadin/TrialBalance']
              }
            ],
            channelId: '{{Xero||ChannelId}}',
            isDayly: false,
            params: JSON.stringify({
              OrganizationUnitId: '{{OrganizationUnitId||Current}}',
              XeroChannelId: '{{Xero||ChannelId}}',
              GoogleChannelId: '{{GoogleBigQuery||ChannelId}}',
              TenantId: '{{TenantId||Current}}',
              XeroTenantId: ''
            }),
            startImmediately: true,
          }
        },
        {
          name: 'Axilla.App.XeroXeinadin.Invoice',
          properties: {
            processors: [
              {
                appName: 'XeroXeinadin',
                processorsNames: ['XeroXeinadin/Invoice']
              }
            ],
            channelId: '{{Xero||ChannelId}}',
            isDayly: true,
            params: JSON.stringify({
              OrganizationUnitId: '{{OrganizationUnitId||Current}}',
              XeroChannelId: '{{Xero||ChannelId}}',
              GoogleChannelId: '{{GoogleBigQuery||ChannelId}}',
              TenantId: '{{TenantId||Current}}',
              XeroTenantId: ''
            }),
            startImmediately: true,
          }
        },
        {
          name: 'Axilla.App.XeroXeinadin.Customer',
          properties: {
            processors: [
              {
                appName: 'XeroXeinadin',
                processorsNames: ['XeroXeinadin/Customer']
              }
            ],
            channelId: '{{Xero||ChannelId}}',
            isDayly: true,
            params: JSON.stringify({
              OrganizationUnitId: '{{OrganizationUnitId||Current}}',
              XeroChannelId: '{{Xero||ChannelId}}',
              GoogleChannelId: '{{GoogleBigQuery||ChannelId}}',
              TenantId: '{{TenantId||Current}}',
              XeroTenantId: ''
            }),
            startImmediately: true,
          }
        }
      ],
    }
  ];

  get globalObjects(): any[] {
    return this._globalObjects;
  }

  public getByName: Subject<IAppAssignmentListDto> = new Subject();

  constructor(
    private readonly _appStoreService: AppStoreServiceProxy,
    private readonly _appServiceBase: AppServiceBaseServiceProxy,
    private readonly _appJobSchedulerService: AppJobSchedulerServiceProxy,
    private readonly channelDefinitionServiceProxy: ChannelDefinitionServiceProxy,
    injector: Injector) {
    this.notify = injector.get(NotifyService);
  }

  getAppByName(name: string) {
    this._appStoreService.getByName(name)
      .pipe(take(1))
      .subscribe((result) => {
        this.app = result;

        this.getByName.next(this.app);

        this._initChannel();
      });
  }

  private _initChannel() {
    const appId = this.app.appAssignmentId;
    this.channelDefinitionServiceProxy
      .getAllForApp(
        appId, '', 0, 10
      )
      .pipe(take(1))
      .subscribe((result: IPagedResultDtoOfChannelDefinitionDto) => {
        if (result && result.items.length > 0) {
          this.channel = result.items[0];
        }
      });
  }

  getAppCredentialsByAppName(appName: string) {
    return this.globalObjects.filter(app => app.name == appName);
  }

  startJob(params: IStartProcessorJobInput): void {
    if (params == null) {
      this.notify.warn('There is nothing to start', 'Starting processor abborted');
      return;
    }

    this._appServiceBase.startJob(params)
      .pipe(take(1))
      .subscribe((result) => {
        this.notify.info("Job start", "Starting processor success");
      });
  }

  scheduleJob(params: ICreateJobDefinitionInput): void {
    if (params == null) {
      this.notify.warn("There is nothing to start", "Scheduling job abborted");
      return;
    }

    this._appJobSchedulerService.create(params)
      .pipe(take(1))
      .subscribe((result) => {
        this.notify.info("Job start", "Scheduling job success");
      });
  }

  startMultipleJobs(params: IStartProcessorJobInput[]): void {
    if (params == null) {
      this.notify.warn("There is nothing to start", "Starting processor abborted");
      return;
    }

    this._appServiceBase.startMultipleJobs(params)
      .pipe(take(1))
      .subscribe((result) => {
        console.log(result);
        this.notify.info("Job start", "Starting processor success");
      });
  }
}
