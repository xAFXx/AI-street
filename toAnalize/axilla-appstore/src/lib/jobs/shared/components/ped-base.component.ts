import {Injectable, Injector} from "@angular/core";

import {IStepDto, VDBServiceProxy} from "../../../shared";

import {ProcessorService} from '../services/processor.service';

import {AppComponentBase} from '@axilla/axilla-shared';

import {JsonEditorOptions} from 'ang-jsoneditor';
import {ProcessorConsts} from '../ProcessorConst';
import {Subject} from 'rxjs';
import {BsModalService} from 'ngx-bootstrap/modal';
import objectPath from 'object-path';

declare let abp: any;

@Injectable()
export abstract class PEDComponentBase extends AppComponentBase {

  _vdbService: VDBServiceProxy;
  processorService: ProcessorService;

  editorOptions: JsonEditorOptions;
  modalService: BsModalService;

  get isEditMode() {
    return this.processorService.isEditMode;
  }

  get isPreviewMode() {
    return this.processorService.isPreviewMode;
  }

  get step(): IStepDto {
    return this.processorService.currentStep;
  }

  get stepDefinition(): string {
    return this.processorService.currentStep.stepDefinition;
  }

  constructor(
    injector: Injector,
  ) {
    super(injector);

    this._vdbService = injector.get(VDBServiceProxy);
    this.processorService = injector.get(ProcessorService);
    this.modalService = injector.get(BsModalService);

    this.editorOptions = new JsonEditorOptions();

    this.editorOptions.expandAll = true;
    this.editorOptions.onCreateMenu = function (items, node) {
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

    this.editorOptions.modes = ['tree', 'view', 'code'];

  }

  unsubscribe = new Subject<void>();

  ngOnDestroy() {
    this.unsubscribe.next();
  }

  origin: string;

  getStepOrigin(step: IStepDto) {
    this.origin = this.processorService.getStepOrigin(step);
    return this.processorService.getStepOrigin(step);
  }


  getStepInfo(step: IStepDto): string {
    return this.processorService.getStepInfo(step);
  }

  getStepDescription(step: IStepDto): string {
    return this.processorService.getStepDescription(step);
  }

  //#region Control Blocks

  dissableStep() {
    this.processorService.removeControllBlock(ProcessorConsts.ControlBlocks.Dissabled);
  }

  enableStep() {
    this.processorService.addControllBlock(ProcessorConsts.ControlBlocks.Dissabled);
  }

  removeOnErrorHandlingStep() {
    this.processorService.removeControllBlock(ProcessorConsts.ControlBlocks.ErrorHandling);
  }

  addOnErrorHandlingStep(email: string) {
    this.processorService.addControllBlock(ProcessorConsts.ControlBlocks.ErrorHandling, email);
  }

  //#endregion Control Blocks

  //#region Loader

  get overviewLoader(): boolean {
    return this.processorService.overviewLoader;
  }

  showLoadingIndicator() {
    this.processorService.showLoadingIndicator();
  }

  hideLoadingIndicator() {
    this.processorService.hideLoadingIndicator();
  }

  //#endregion Loader


  //#region Helpers
  protected _getVDBName(input: string): string {
    let vdbName = "";

    vdbName = input
      .replace("App.VirtualDb.", "")
      .slice(0, -1 * (abp.session.tenantId.toString().length + 1));

    return vdbName;
  }

  //#endregion Helpers

}
