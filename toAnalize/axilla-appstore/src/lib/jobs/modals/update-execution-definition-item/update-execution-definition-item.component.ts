import {Component, Injector, OnDestroy, ViewChild, Input, Output, EventEmitter} from '@angular/core';
import {FormControl, FormGroup} from '@angular/forms';
import {AppComponentBase, ConfirmationModalComponent, PrimengTableHelper} from '@axilla/axilla-shared';

import {
  AppLoggerServiceProxy,
  WorkFlowServiceProxy,
  ProcessorDebugServiceProxy,
  LogDashboardServiceProxy,
  ProcessorEngineLogServiceProxy,
  IProcessorExecutionDefinitionDto,
  IRegistrationInputDto,
  ILogDashboardDto,
  PagedResultDtoOfRegistrationInputDto,
  ChannelDefinitionDto,
  ICreateJobDefinitionInput,
  IStepDto,
  StepDto,
  IChannelDefinitionDto, IPagedResultDtoOfRegistrationInputDto
} from "../../../shared/service-proxies/service-proxies";

import {AbpSessionService} from 'abp-ng2-module';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {Subject, Subscription} from 'rxjs';
import {JsonEditorOptions, JsonEditorComponent} from 'ang-jsoneditor';
import {take} from 'rxjs/operators';

import {LazyLoadEvent} from 'primeng/api';
import {Paginator} from 'primeng/paginator';
import {Table} from 'primeng/table';

import _ from 'lodash';

import objectPath from "object-path";

import dayjs from 'dayjs';

import {AppService} from '../../../shared/services/index';
import {ProcessorService} from '../../shared/services/processor.service';

declare let abp: any;

@Component({
  selector: 'app-update-execution-definition-item',
  templateUrl: './update-execution-definition-item.component.html',
  styleUrls: ['./update-execution-definition-item.component.less']
})
export class UpdateExecutionDefinitionItemComponent extends AppComponentBase implements OnDestroy {
  @Input() processorId?: string;

  @Output() goBackHome = new EventEmitter();


  jobForm: FormGroup;

  submit = new Subject<any>();
  run = new Subject<any>();

  @ViewChild('deleteModal', {static: true}) deleteModal: ConfirmationModalComponent;

  processorsDdDummy = ["Axilla/ProcessorExecutionHandler"];
  ddProcessors: any;
  ddDashboard: any;
  objectFromJson: object;
  isRunResultAvailable: boolean = false;

  DEFAULT_DATE_FORMAT = 'DD-MM-YYYY';
  dateFormat = 'DD-MM-YYYY';

  get definition(): IProcessorExecutionDefinitionDto {
    return this.processorService.definition;
  }

  set definition(definition: IProcessorExecutionDefinitionDto) {
    this.processorService.definition = definition;
  }


  $subscription: Subscription;

  editorOptions: JsonEditorOptions;
  dataOptions: JsonEditorOptions;
  actionsOptions: JsonEditorOptions;
  outputsOptions: JsonEditorOptions;
  loggerTableHelper: PrimengTableHelper;
  logs: IRegistrationInputDto[] = [];
  @ViewChild('logPaginator', {static: true}) logPaginator: Paginator;
  @ViewChild('dataTbleLogs', {static: true}) dataTbleLogs: Table;

  color1: string = "#1976D2";
  private loggerName = "Processor";


  selectedTab: number = 1;
  public executionDefinition = JSON.parse('[{"Name":"ProcessorName", "Process":[{"Data":[{"Name":"DataSource1"}], "Actions":[{"Name":"Action1", "Source":"DataSource1", "Action":""}], "Outputs":[{"Name":"Output1","Source":"Action1"}]}]}]');
  //processor: {
  //    "name": "",
  //    "data": [{ "name": "" }],
  //    "actions": [{ "name": "" }],
  //    "Output": [{ "name": "" }],
  //}
  public datainfo: any;
  public action: any;
  public output: any;

  public tempED: any;
  public tempDatainfo: any;
  public tempAction: any;
  public tempOutput: any;
  checked: boolean = false;

  @ViewChild(JsonEditorComponent, {static: false}) editor: JsonEditorComponent;

  get isEditMode(): boolean {
    return this.processorService.isEditMode;
  }

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
    private readonly _loggerService: AppLoggerServiceProxy,
    private _session: AbpSessionService,
    private _workFlowService: WorkFlowServiceProxy,
    private readonly _engineLogService: ProcessorEngineLogServiceProxy,
    private readonly _dashboardLogService: LogDashboardServiceProxy,
    private readonly _processorDebugService: ProcessorDebugServiceProxy,
    private appService: AppService,
    private processorService: ProcessorService,
  ) {
    super(injector);

    //#region loggerTableHelper
    this.loggerTableHelper = new PrimengTableHelper();
    this.loggerTableHelper.defaultRecordsCountPerPage = 25;
    this.loggerTableHelper.predefinedRecordsCountPerPage = [25, 50, 100];
    //#endregion loggerTableHelper


    this.editorOptions = new JsonEditorOptions();
    this.dataOptions = new JsonEditorOptions();
    this.actionsOptions = new JsonEditorOptions();
    this.outputsOptions = new JsonEditorOptions();

    this.editorOptions.expandAll = this.dataOptions.expandAll = this.actionsOptions.expandAll = this.outputsOptions.expandAll = true;
    this.editorOptions.onCreateMenu = this.actionsOptions.onCreateMenu = function (items, node) {
      const path = node.path;

      function addItemInArray(text: string, isAction: boolean = false) {
        let pathString = '';
        path.forEach(function (segment, index) {
          pathString += '.' + segment;
        });
        pathString = pathString.slice(1);
        let t = JSON.parse(text);
        if (isAction) {
          let allActions: any[] = objectPath.get(this.executionDefinition, pathString);
          if (allActions.length) {
            let lastActions = allActions[allActions.length - 1];
            let lastName = lastActions["Name"] ?? "";
            t["Source"] = lastName;
          }
        }
        objectPath.push(this.executionDefinition, pathString, t);
        if (!this.tempED) {
          this.tempED = this.executionDefinition;
        }
        this.editor.update(this.tempED);
        this.f.get('executionDefinition').setValue(JSON.stringify(this.tempED));
      }

      function addProperty(text: string, toRemoveNS: boolean = false) {
        let pathString = '';
        path.forEach(function (segment, index) {
          pathString += '.' + segment;
        });
        pathString = pathString.slice(1);
        let t = JSON.parse(text);
        let notAccepted = ["Name", "Source"];
        Object.keys(t).forEach(x => {
          if (!toRemoveNS || toRemoveNS && (x !== "Name" && x !== "Source")) {
            let newPathString = pathString + "." + x;
            objectPath.set(this.executionDefinition, newPathString, t[x]);
            if (!this.tempED) {
              this.tempED = this.executionDefinition;
            }
            this.editor.update(this.tempED);
          }
        });
        this.f.get('executionDefinition').setValue(JSON.stringify(this.tempED));
      }

      function tryToClick() {
        console.log("event");
      }

      (items as [{}]).push({
        text: "Additional items", // the text for the menu item
        title: 'Add some processor items', // the HTML title attribute
        className: 'jsoneditor-type-auto jsoneditor-menu', // the css class name(s) for the menu item
        submenu: []
      });
      const itemsAndJson: { [key: string]: string } =
        {
          "Debug BreakBefore": '{"Debug": "BreakBefore"}',
          "Debug BreakAfter": '{"Debug": "BreakAfter"}',
          "Name & Source": '{"Name": "", "Source": ""}'
        };
      (items as [{ text, submenu }]).forEach(x => {
        if (x.text == "Additional items") {
          for (let i = 0; i < Object.keys(itemsAndJson).length; i++) {
            (x.submenu).push({
              text: Object.keys(itemsAndJson)[i], // the text for the menu item
              title: 'Add additional item', // the HTML title attribute
              className: 'jsoneditor-type-auto', // the css class name(s) for the menu item
              click: addProperty.bind(this, itemsAndJson[Object.keys(itemsAndJson)[i]])
            });
          }
        }
      });
      const actionsOther: { [key: string]: string } =
        {
          "IfContains": '{"Name":"", "Source":"", "Action":"IfContains", "ManagedContainers":[""], "IfContains":[{"Contains":["SomeText"],"Apply":{}},{"NotContains":["NotSomeText"],"Apply":{}}]}',
          "CombineObject": '{"Name":"", "Source":"SourceName1", "Action": "CombineObject", "AdditionalSources": "SourceName2, SourceName3"}',
          "ConvertDocument": '{"Name": "", "Source": "PdfFile (contains: FilePath | (FolderPath & FileExtension))", "Action": "ConvertDocument"}',
          "ApplicationService": '{"Name": "","Source": "","Action": "ApplicationService", "ServiceName": "","CallName": "", "FunctionParams": [  { "Type": "String"  }],"MappingString": "" }',
          "Call": '{"Name": "", "Source": "", "Action": "Call", "Format": "", "SourceCall":"", "SourceChannelId":"", "Take":1 }',
          "Reference": '{"Name":"","Source":"CurrentSource","Action": "Reference",  "Reference": [ {"Main": {  "CurrentSource": "CurrentSource.PropertyName"},"Merge": {  "AnotherSource": "AnotherSource.PropertyName"},"Mapping": {  "CurrentSource.AnotherPropertyName": "{{AnotherSource.AnotherPropertyName}}"} }]}',
          "IncrementId": '{ "Name": "", "Source": "", "Action": "IncrementId", "Term": "word", "Start": -1, "Field": "Page"  }',
          "GroupBy": '{"Name": "", "Source": "","Action": "GroupBy",  "PropertyName": "Top",  "Deviation": 0, "MinLength":3}',
          "MarkItemsInList": '{"Name": "", "Source": "","Action": "MarkItemsInList",  "Start": "",  "End": "",  "RangeField": "Top",  "Deviation": 0, "AdditionalMarks": [{}]}',
          "ConcatObject": '{"Name": "", "Source": "","Action": "ConcatObject",  "Terms": [ "Group" ], "Skip":0, "SplitSign":"", "Format":""  "ConcatField": "Line",  "Mode": { "Action": "Single | Multi"  }}',
          "SortBy": '{  "Name": "", "Source": "","Action": "SortBy",  "Fields": "Field1,Field2"}',
          "FilterByNull": '{  "Name": "", "Source": "","Action": "FilterByNull" }',
          "Flatten": '{"Name": "","Source": "","Action": "Flatten" }',
          "SplitObjectByName": '{"Name":"","Source": "","Action": "SplitObjectByName","Property": "PropertyName","SplitValue":""-", "KeyByRegex":"", "Mode":{Action:""}}',
          "Resolve": '{ "Name": "", "Source": "", "Action": "Resolve",  "MappingString": "" }',
          "GetTotal": '{ "Name": "", "Source": "","Action": "GetTotal", "PropertyName": "" }',
          "FindPeriodMonth": '{ "Name": "", "Source": "","Action": "FindPeriodMonth", "PropertyName": "" }',
          "ValidatingExistingFields": '{"Name": "","Source": "SourceName","Action": "ValidatingExistingFields","Properties": [  { "FieldName": "SourceName.Property1", "Type": "Text | ZipCode | Double | Number | TaxNumber | Date"  },  { "FieldName": "SourceName.Property", "Type": "Text", "Required": false  }] }',
          "NameObject": '{"Name": "","Description": "Give all items a name", "Source": "","Action": "NameObject"}',
          "GroupByColumnsAsArray": '{"Name": "","Source": "","Action": "GroupByColumnsAsArray","Mapping": [{	"Source": "Code"}],"Keys": ["Name"]"}',
        };
      const actionsForeach: { [key: string]: string } =
        {
          "ForeachMergeObject": '{"Name": "", "Source": "", "Action": "Foreach-MergeObject",  "MergeSource": "", "SourceKey": ""}',
          "Foreach-Object": '{"Name": "","Source": "","Action": "Foreach-Object","Apply": {}}',
          "Foreach-AppendObject": '{"Name":"", "Source":"", "Action":"Foreach-AppendObject", "Mapping | MappingString":"" }'

        };
      const actionsFitler: { [key: string]: string } =
        {
          "Simple": '{"Name": "",	"Source": "",	"Action": "Filter",	"FilterSettings": [{"Property": "PropertyName","Equal": ""}]}',
          "And": '{"Name": "","Source": "SomeSource","Action": "Filter",  "FilterSettings": [ {"And": [  { "Higher": 0, "Lower": 0  }],"Property": "Top" }  ]}',
          "Or": '{ "Name": "", "Source": "", "Action": "Filter",	"FilterSettings": [{ "Property": "PropertyName", "Or": [{"Equal": "Case1"},{"Equal": "Case2"},{"Equal": "Case3"} ]	}]}',
          "Property_StartsWith": '{	"Name": "",	"Source": "",	"Action": "Filter",	"FilterSettings": [{"Property": "PropertyName","StartsWith":""	}]}',
        };
      const actionsGetValue: { [key: string]: string } =
        {
          "WithOutRegex_WithIndex": '{  "Name": "",  "Source": "",  "Action": "GetValueAndAssignToNewObject",  "Mapping": [    {"PropertyName": "NewPropertyName","IndexField": "PropertyNameToSearchInto","IndexToFind": [0]    }]  }',
          "Concat[]": '{  "Name": "",  "Source": "",  "Action": "GetValueAndAssignToNewObject",  "Mapping": [    {"PropertyName": "NewPropertyName","IndexField": "PropertyNameToSearchInto","IndexToFind": [], "ItemToInsertBetween":" "    }]  }',
          "WithRegex_WithIndexField_NoIndexToFind": '{  "Name": "",  "Source": "",  "Action": "GetValueAndAssignToNewObject",  "Mapping": [    {"RegexToFind": "","PropertyName": "NewPropertyName","IndexField": "PropertyNameToSearchInto","ToRemove": true    }]  }',
          "NoRegex_NoIndex": '{  "Name": "",  "Source": "",  "Action": "GetValueAndAssignToNewObject",  "Mapping": [    {  "PropertyName": "NewPropertyName",  "IndexField": "PropertyNameToSearchInto",  "Format": ""    }]  }',
        };
      const actionsStopWith: { [key: string]: string } = {
        "StopWithoutOutput": '{"Action": "StopWithoutOutput"}',
        "StopWithOutput": '{"Action": "StopWithOutput"}',
        "StopWithOutputWhenSourceIsEmpty": '{"Action": "StopWithOutputWhenSourceIsEmpty"}'
      };
      let listOfActions: { [key: string]: { [key: string]: string } }[] = [
        {'Filter': actionsFitler},
        {'ForEach': actionsForeach},
        {'GetValue': actionsGetValue},
        {'StopWith': actionsStopWith},
        {'Other': actionsOther}
      ];
      if (path[path.length - 1] === "Actions" || path[path.length - 1] == "Apply") {
        (items as [{}]).push({
          text: "Actions", // the text for the menu item
          title: 'Add action', // the HTML title attribute
          className: 'jsoneditor-type-auto jsoneditor-menu action', // the css class name(s) for the menu item
          submenu: []
        });

        Object.keys(listOfActions).forEach(actionDict => {

          (items as [{ text, submenu }]).forEach(x => {
            if (x.text === "Actions") {
              (x.submenu as [{}]).push({
                text: Object.keys(listOfActions[actionDict])[0], // the text for the menu item
                title: Object.keys(listOfActions[actionDict])[0], // the HTML title attribute
                className:
                  'jsoneditor-type-auto jsoneditor-menu', // the css class name(s) for the menu item
                submenu: []
              });
              (x.submenu as [{ text, submenu }]).forEach(y => {
                if (y.text === Object.keys(listOfActions[actionDict])[0]) {
                  let tempSource = Object.values(listOfActions[actionDict])[0];
                  for (let i = 0; i < Object.keys(tempSource).length; i++) {
                    (y.submenu as [{}]).push({
                      text: Object.keys(tempSource)[i], // the text for the menu item
                      title: Object.keys(tempSource)[i], // the HTML title attribute
                      className: 'jsoneditor-type-auto', // the css class name(s) for the menu item
                      click: path[path.length - 1] === "Actions"
                        ? addItemInArray.bind(this, Object.values(tempSource)[i], true)
                        : addProperty.bind(this, Object.values(tempSource)[i], true)
                    });
                  }
                }
              });
            }
          });
        });
      }

      if (path[path.length - 1] == "Data") {
        (items as [{}]).push({
          text: "Data", // the text for the menu item
          title: 'Add data input', // the HTML title attribute
          className: 'jsoneditor-type-auto jsoneditor-menu', // the css class name(s) for the menu item
          submenu: []
        });
        const dataAndJson: { [key: string]: string } =
          {
            "FromTenantCache": '{"Name": "","List": "Axilla.App.McoHealth.CreateSalesOrder","Origin": "TenantCache","Mode": {"Action": "Single"}}​​​',
            "RemoteJob": '{"Target": "","Command": "", "Action":"SQLRemoteControl"}'
          };
        (items as [{ text, submenu }]).forEach(x => {
          if (x.text == "Data") {
            for (let i = 0; i < Object.keys(dataAndJson).length; i++) {
              (x.submenu).push({
                text: Object.keys(dataAndJson)[i], // the text for the menu item
                title: 'Add data', // the HTML title attribute
                className: 'jsoneditor-type-auto', // the css class name(s) for the menu item
                click: addItemInArray.bind(this, dataAndJson[Object.keys(dataAndJson)[i]])
              });
            }
          }
        });
      }
      return items;
    }.bind(this);

    this.editorOptions.modes = this.dataOptions.modes = this.actionsOptions.modes = this.outputsOptions.modes = ['tree', 'view', 'code'];
  }

  ngOnInit(): void {
    this.registerEvents();

    this._init();
    this._getPED();
  }


  ngOnDestroy(): void {
    if (this.$subscription) {
      this.$subscription.unsubscribe();
    }
  }


  registerEvents(): void {
    abp.event.on('ped.init', () => {
      this._getPED();
    });
  }

  private _getPED() {
    if (this.processorId !== "") {
      let obj = {value: this.processorId};
      this.onSelectPED(obj);
    }
  }


  private _init() {
    this.initForm();
    this._initPED();
    this._initChannel();
  }


  //#region Form
  private initForm() {
    this.jobForm = new FormGroup({
      name: new FormControl(null),
      processorExecutionDefinition: new FormControl({value: null, disabled: true}),
      executionDefinition: new FormControl(null),
      channelId: new FormControl(null),
      initials: new FormControl(null),
      color: new FormControl(null),
      onlyProcessorSteps: new FormControl({value: false, disabled: false}),
    });

    this.f.get('executionDefinition').setValue(JSON.stringify(this.executionDefinition));
    this.jobForm.controls['onlyProcessorSteps'].valueChanges.subscribe(value => {
      if (value) {
        this.showProcessorsOnly();
      } else {
        this.showAll();
      }
    });
    this.prettify();

  }

  get f() {
    return this.jobForm;
  }

  get ed() {
    return this.f.get('executionDefinition').value;
  }

  set ed(value: string) {
    this.f.get('executionDefinition').setValue(value);
  }

  //#endregion

  private _addColumn(field, header, type) {
    if (field && header) {
      let obj = {field: field, header: header, type: type};
      //let obj = { field: _.camelCase(field), header: header };
      this.cols.push(obj);
    }
  }

  cols: any[] = [];

  setFields(selector) {
    this.cols = [];
    this._dashboardLogService.getByExecutionDefinition(selector).subscribe((result: ILogDashboardDto) => {
      let cols = result.logDashboardField;
      _.forEach(cols, (col) => {
        this._addColumn(col.fieldSource, col.displayName, col.type);
      });
      this.getLogData();
    });
  }

  getLogData() {
    this._engineLogService.getLogs(
      this.definition.id,
      abp.session.tenantId,
      undefined,
      undefined,
      undefined,
      undefined,
      0,
      true)
      .subscribe((result) => {
        this.loggerTableHelper.records = result;
        this.loggerTableHelper.totalRecordsCount = result.length;
      });

  }

  getLoggerData(event?: LazyLoadEvent) {
    this.loggerTableHelper.showLoadingIndicator();

    this._loggerService.getPagedResultLogs(
      this.loggerName,
      this.loggerTableHelper.getSorting(this.dataTbleLogs),
      this.loggerTableHelper.getSkipCount(this.logPaginator, event),
      this.loggerTableHelper.getMaxResultCount(this.logPaginator, event)
    )
      .pipe(take(1))
      .subscribe((pagedResult: IPagedResultDtoOfRegistrationInputDto) => {
        if (pagedResult) {
          this.loggerTableHelper.records = pagedResult.items;
          this.loggerTableHelper.totalRecordsCount = pagedResult.totalCount;
          this.loggerTableHelper.hideLoadingIndicator();

          this.logs = Object.assign([], pagedResult.items);
        }
      });
  }

  getED(json: string) {
    this.tempED = json;
  }

  getData(json: string) {
    this.tempDatainfo = json;
  }

  getAction(json: string) {
    this.tempAction = json;
  }

  getOutput(json: string) {
    this.tempOutput = json;
  }


  //#region ChannelId
  channelIds: any[] = [];
  ddChannelIds: any;

  private _initChannel() {
    this._workFlowService.getExistingChannels()
      .subscribe((result: IChannelDefinitionDto[]) => {
        if (result) {
          this._setDdChannel(result);
        }
      });
  }

  private _setDdChannel(result: any) {
    let label = abp.localization.localize("Axilla.Job.SelectChannelId", "Axilla");
    this.ddChannelIds = this._setChannelDd(result);
    this.ddChannelIds.unshift({label: label, value: null});
  }

  private _setChannelDd(items: any) {
    let tmp = [];
    for (let i = 0; i < items.length; ++i) {
      let item = items[i];
      tmp.push({
        label: item.title,
        value: item.id
      });
    }
    return tmp;
  }


  //#region ExecutionDefinition
  processorExecutionDefinition: any[] = [];
  ddProcessorExecutionDefinition: any;

  private _initPED() {
    this._workFlowService.getAll()
      .subscribe((result: IProcessorExecutionDefinitionDto[]) => {
        if (result) {
          this._setDdPED(result);
        }
      });
  }

  private _setDdPED(result: any) {
    let label = abp.localization.localize("Axilla.Job.SelectProcessorExecutionDefinition", "Axilla");
    this.ddProcessorExecutionDefinition = this._setPEDDd(result);
    this.ddProcessorExecutionDefinition.unshift({label: label, value: null});
  }

  private _setPEDDd(items: any) {
    let tmp = [];
    for (let i = 0; i < items.length; ++i) {
      let item = items[i];
      tmp.push({
        label: item.name,
        value: item.id
      });
    }
    return tmp;
  }

  //#endregion Documen Type

  onSelectPED($event) {
    const id = $event.value;

    this.definition = null;

    if (id) {
      this._workFlowService.getExecutionDefinitionById(id)
        .subscribe((result: IProcessorExecutionDefinitionDto) => {
          if (result) {
            this.definition = result;
            this.f.get('processorExecutionDefinition').setValue(result.name);

            this.f.get('name').setValue(result.name);
            this.f.get('color').setValue(result.color);
            this.f.get('executionDefinition').setValue(result.executionDefinition);
            this.f.get('initials').setValue(result.abbreviation);
            this.tempED = this.executionDefinition = JSON.parse(result.executionDefinition);
            this._initProcessorEditor(this.executionDefinition);
            this.setFields(this.definition.id);
            //this.editor.expandAll();
          }
        });
    } else {
      this.reload();
    }
  }

  private _initProcessorEditor(obj: any) {
    this.tempDatainfo = this.datainfo = obj[0].Process[0].Data;
    this.tempAction = this.action = obj[0].Process[0].Actions;
    this.tempOutput = this.output = obj[0].Process[0].Outputs;
  }

  selectMain() {
    this.selectedTab = 2;
    if (this.datainfo) {
      if (!this.tempED) {
        this.tempED = this.executionDefinition;
      }

      let str = JSON.stringify(this.tempED);
      let obj = JSON.parse(str);

      if (!this.tempDatainfo) {
        this.tempDatainfo = this.datainfo;
      }
      if (!this.tempAction) {
        this.tempAction = this.action;
      }
      if (!this.tempOutput) {
        this.tempOutput = this.output;
      }

      let strd = JSON.stringify(this.tempDatainfo);
      let stra = JSON.stringify(this.tempAction);
      let stro = JSON.stringify(this.tempOutput);

      obj[0].Process[0].Data = JSON.parse(strd);
      obj[0].Process[0].Actions = JSON.parse(stra);
      obj[0].Process[0].Outputs = JSON.parse(stro);

      this.tempED = obj;
      this.executionDefinition = obj;
    }

  }

  checkSelection() {
    if (this.selectedTab === 2) {
      this.selectedTab = 3;
      this.deselectMain();
    } else if (this.selectedTab === 1) {
      this.deselectView();
      this.deselectMain();
    }
  }

  deselectView() {
    this.executionDefinition = this.tempED = (JSON.parse(this.f.get('executionDefinition').value));
  }

  selectView() {
    if (this.executionDefinition) {
      if (this.selectedTab === 2) {
        this.deselectMain();
        this.f.get('executionDefinition').setValue(JSON.stringify(this.tempED));

      } else if (this.selectedTab === 3) {
        this.selectMain();
        this.f.get('executionDefinition').setValue(JSON.stringify(this.tempED));

      } else if (this.selectedTab === 1) {
        this.executionDefinition = this.tempED = (JSON.parse(this.f.get('executionDefinition').value));

      }
      this.selectedTab = 1;
      this.prettify();
    }

  }

  deselectMain() {
    this.selectedTab = 3;
    if (this.tempED) {
      this.f.get('executionDefinition').setValue(JSON.stringify(this.tempED));
    }
    let processor = JSON.parse(this.f.get('executionDefinition').value);
    //        if (!this.tempED) {
    this.tempED = this.executionDefinition = processor;
    //        }

    let str = JSON.stringify(this.tempED);
    let obj = JSON.parse(str);
    this.prettify();

    this._initProcessorEditor(obj);
  }

  parseError: boolean = false;

  prettify() {
    let string = this.f.get('executionDefinition').value;

    try {
      const result = JSON.stringify(JSON.parse(string), null, 10);
      this.parseError = false;

      this.f.get('executionDefinition').setValue(result);
    } catch (ex) {
      alert(ex);

      this.parseError = true;
    }

  }

  onCreateJobAndClose() {
    this.prettify();

    if (!this.parseError) {
      this._onCreateJob();
      this.close();
    }
  }

  onCreateJob() {
    this.selectView();
    //this.f.get('executionDefinition').setValue(JSON.stringify(this.executionDefinition));
    this.prettify();

    if (!this.parseError) {
      this._onCreateJob();
      //this.close();
    }
  }

  private _onCreateJob() {
    const formValue = this.jobForm.value;

    if (!this.definition) {
      this.definition = {} as IProcessorExecutionDefinitionDto;
    }

    this.definition.executionDefinition = formValue.executionDefinition;
    this.definition.name = formValue.name;
    this.definition.abbreviation = formValue.initials;
    this.definition.color = formValue.color;

    this._workFlowService.createOrUpdate(this.definition)
      .subscribe((ped: IProcessorExecutionDefinitionDto) => {
        this.notify.info(this.l('SavedSuccessfully'));
        this.onSelectPED({value: ped.id});
      });
  }

  runJob() {
    this.prettify();

    if (!this.parseError) {
      this._onCreateJob();

      const formValue = this.jobForm.value;

      let data = {
        'definition': this.definition,
        'channelId': formValue.channelId
      }

      //this.run.next(data);

      const input = {
        processorExecutionDefinition: data.definition.id,
        channelId: data.channelId,
        startImmediately: true,
        isDayly: false,
        jobName: `${data.channelId}` + ' ForceNow',
        workflowName: 'Axilla/ProcessorExecutionHandler',
        params: undefined,
        startTime: dayjs(),
        cron: (data as any).cron || undefined
      } as ICreateJobDefinitionInput;

      this.appService.scheduleJob(input);

      this.isRunResultAvailable = true;
      this.setFields(this.definition.id);
    }
  }

  close(): void {
    this._modal.hide();
    this.jobForm.reset();

    setTimeout(() => this.processorService.clear(), 2000);
  }

  get isAvailableForRun(): boolean {
    const channelId = this.f.get('channelId').value;

    if (this.definition && channelId) return false;

    return true;
  }

  delete() {
    this.deleteModal.show(this.definition.name);
  }

  confirmDelete() {
    this._workFlowService.delete(this.definition.id)
      .subscribe(() => {
        abp.notify.success("The processor was successfully deleted");
        this.reload();
      });
  }


  goHome() {
    this.goBackHome.emit();
  }

  reload() {
    this._init();
  }

  //#region Overview Tab

  private _overviewLoader: boolean = false;
  set overviewLoader(state: boolean) {
    this._overviewLoader = state;
  }

  get overviewLoader() {
    return this._overviewLoader;
  }


  set stepList(steps: IStepDto[]) {
    this.processorService.stepList = steps;
  }

  get stepList() {
    return this.processorService.stepList;
  }

  set archivedStepList(steps: IStepDto[]) {
    this.processorService.archivedStepList = steps;
  }

  get archivedStepList() {
    return this.processorService.archivedStepList;
  }

  onlyProcessorsList: IStepDto[] = [];

  loadSteps() {
    this.checkSelection();
    this.processorService.loadSteps(this.processorId);
  }

  home() {
    this.processorService.setPreviewMode();
  }

  //#region Editor Result
  openedValue: any;

  //#endregion Editor Result


  onlyProcessorHandler($event) {
    this.processorService.onlyProcessorHandler($event);
  }

  showProcessorsOnly() {
    this.stepList = this.onlyProcessorsList;
  }

  showAll() {
    this.stepList = this.archivedStepList;
  }

  //opens laste result for current processor
  showLastResult(step: any): void {

  }

  //opens edit current step modal
  editStep(step: any): void {

  }


  onUpdateStep() {
    setTimeout(() => this.processorService.updateStep(), 100);
  }


  onUpdateStepAndGoHome() {
    setTimeout(() => this.processorService.updateStepAndGoHome(), 100);
  }

  //#endregion Overview Tab


}
