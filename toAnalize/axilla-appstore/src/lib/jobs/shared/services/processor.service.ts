import {Injectable} from '@angular/core';
import {NotifyService} from 'abp-ng2-module';

import {
  VDBServiceProxy,
  WorkFlowServiceProxy,
  ProcessorDebugServiceProxy,
  IStepDto,
  IProcessorExecutionDefinitionDto,
  IProcessorStepOutputDto,
  IPagedResultDtoOfVirtualDbRowDto,
  IProcessorDependency,
  IRunProcessorInStepOperationOutputDto, IProcessorOverviewDto,
  IRunProcessorInStepOperationInputDto
} from '../../../shared/service-proxies/service-proxies';

import _ from 'lodash';

import {tap, finalize} from "rxjs/operators";
import {Observable, Subject} from "rxjs";

import {ProcessorConsts, StepOrigin} from '../ProcessorConst';

declare let abp: any;

@Injectable()
export class ProcessorService {


  // Region processor homepage cache

  private _currentDefinitions : IProcessorExecutionDefinitionDto[]  = [];

  set currentDefinitions(definitions: IProcessorExecutionDefinitionDto[]) {
    this._currentDefinitions = definitions;
  }

  get currentDefinitions() : IProcessorExecutionDefinitionDto[] {
    return this._currentDefinitions;
  }

  private _currentProcessorSearch: string;
  set currentProcessorSearch(search: string) {
    this._currentProcessorSearch = search;
  }
  get currentProcessorSearch() {
    return this._currentProcessorSearch;
  }


  //#region Modes

  private _isEditMode: boolean;
  set isEditMode(isEditMode: boolean) {
    this._isEditMode = isEditMode;
  }

  get isEditMode() {
    return this._isEditMode;
  }

  private _isPreviewMode: boolean = true;
  set isPreviewMode(isPreviewMode: boolean) {
    this._isPreviewMode = isPreviewMode;
  }

  get isPreviewMode() {
    return this._isPreviewMode;
  }

  setEditMode() {
    this.isEditMode = true;
    this.isPreviewMode = false;
  }

  setEditModeWithSelection(step: IStepDto) {
    this.setEditMode();
    this.selectStep(step);
  }

  setPreviewMode() {
    this.isEditMode = false;
    this.isPreviewMode = true;

    this.isShowHome = true;

    this.isShowStepResult = false;
    this.isShowNoStepResult = false;

    this.unselectStep();
  }

  clear() {
    this.setPreviewMode();
  }

  private _isShowHome: boolean = true;
  set isShowHome(isShowHome: boolean) {
    this._isShowHome = isShowHome;
  }

  get isShowHome() {
    return this._isShowHome;
  }

  showHomeView() {
    this.isShowHome = true;
    this.isShowStepResult = false;

  }

  showResultView() {
    this.isShowHome = false;
    this.isShowStepResult = true;
  }

  private _isShowStepResult: boolean;
  set isShowStepResult(isShowStepResult: boolean) {
    this._isShowStepResult = isShowStepResult;
  }

  get isShowStepResult() {
    return this._isShowStepResult;
  }

  private _isShowNoStepResult: boolean;
  set isShowNoStepResult(isShowNoStepResult: boolean) {
    this._isShowNoStepResult = isShowNoStepResult;
  }

  get isShowNoStepResult() {
    return this._isShowNoStepResult;
  }

  //#endregion Modes


  //#region PED

  private _definition: IProcessorExecutionDefinitionDto;
  set definition(definition: IProcessorExecutionDefinitionDto) {
    this._definition = definition;
  }

  get definition() {
    return this._definition;
  }

  //#endregion PED


  //#region Complete Processor

  private _fullProcessor: string;
  set fullProcessor(processor: string) {
    this._fullProcessor = processor;
  }

  get fullProcessor() {
    return this._fullProcessor;
  }

  //#region dataActions

  private _dataActions: string;
  set dataActions(dataActions: string) {
    this._dataActions = dataActions;
  }

  get dataActions() {
    return this._dataActions;
  }

  private _dataActionsOriginal: any[];
  set dataActionsOriginal(dataActions: any[]) {
    this._dataActionsOriginal = dataActions;
  }

  get dataActionsOriginal() {
    return this._dataActionsOriginal;
  }

  private _initDataActions(dataActions: any[]) {
    this.dataActionsOriginal = dataActions;
    this.dataActions = JSON.stringify(dataActions);
  }

  //#endregion dataActions

  //#region actionActions
  private _actionActions: string;
  set actionActions(actionActions: string) {
    this._actionActions = actionActions;
  }

  get actionActions() {
    return this._actionActions;
  }

  private _actionActionsOriginal: any[];
  set actionActionsOriginal(actionActions: any[]) {
    this._actionActionsOriginal = actionActions;
  }

  get actionActionsOriginal() {
    return this._actionActionsOriginal;
  }

  private _initActionActions(actionActions: any[]) {
    this.actionActionsOriginal = actionActions;
    this.actionActions = JSON.stringify(actionActions);
  }

  //#endregion actionActions


  //#region outputActions
  private _outputActions: string;
  set outputActions(outputActions: string) {
    this._outputActions = outputActions;
  }

  get outputActions() {
    return this._outputActions;
  }


  private _outputActionsOriginal: any[];
  set outputActionsOriginal(outputActions: any[]) {
    this._outputActionsOriginal = outputActions;
  }

  get outputActionsOriginal() {
    return this._outputActionsOriginal;
  }

  private _initOutputActionsActions(outputActions: any[]) {
    this.outputActionsOriginal = outputActions;
    this.outputActions = JSON.stringify(outputActions);
  }

  //#endregion outputActions


  initProcessor(step: IStepDto) {
    const stepDefinition = step.stepDefinition;
    this.fullProcessor = JSON.stringify(stepDefinition);

    const process = (stepDefinition as any).Process[0];

    this._initDataActions(process.Data);
    this._initActionActions(process.Actions);
    this._initOutputActionsActions(process.Outputs);
  }

  getStepInfo(step: IStepDto): string {
    let stepInfo = "";

    const stepDefinition: any = step.stepDefinition;

    const action = stepDefinition.Action;
    const name = stepDefinition.Name;

    if (action && name) {
      stepInfo = `${stepDefinition.Name} - ${stepDefinition.Action}`
    } else {
      stepInfo = `${stepDefinition.Name}`
    }

    return stepInfo;
  }

  getStepDescription(step: IStepDto) {
    let stepInfo = "";

    const stepDefinition: any = step.stepDefinition;

    const description = stepDefinition.Description;
    if (description) {
      stepInfo = description;
    }

    return stepInfo;
  }

  getStepOrigin(step: IStepDto): string {
    let origin = "data-actions";

    const stepDefinition: any = step.stepDefinition;
    const name = stepDefinition.Name;

    if (step.stepType == "Processor") {
      origin = "processor";
    } else {
      let ifExistsInData = this._checkIfStepContains(this.dataActionsOriginal, name);
      if (ifExistsInData) {
        origin = "data-actions";
        return origin;
      }

      let ifExistsInActions = this._checkIfStepContains(this.actionActionsOriginal, name);
      if (ifExistsInActions) {
        origin = "action-actions";
        return origin;
      }

      let ifExistsInOutput = this._checkIfStepContains(this.outputActionsOriginal, name);
      if (ifExistsInOutput) {
        origin = "output-actions";
        return origin;
      }
    }

    return origin;
  }

  private _checkIfStepContains(source, stepName: string): boolean {

    let ifContains = false;

    for (let i = 0; i < source.length; i++) {
      let item = source[i];

      if (item.Name == stepName) {
        ifContains = true;
      }
    }

    return ifContains;
  }

  private _getStepIndexIfContains(source, stepName: string): number {
    let index = -1;

    for (let i = 0; i < source.length; i++) {
      let item = source[i];

      if (item.Name == stepName) {
        index = i;
      }
    }

    return index;
  }

  //#endregion Complete Processor


  constructor(
    private readonly _processorDebugService: ProcessorDebugServiceProxy,
    private readonly _workFlowService: WorkFlowServiceProxy,
    private readonly notify: NotifyService,
    public _vdbService: VDBServiceProxy,
  ) {

  }


  //#region Steps

  private _currentStep: IStepDto | undefined;
  set currentStep(step: IStepDto | undefined) {
    this._currentStep = step;
  }

  get currentStep() {
    return this._currentStep;
  }


  private _checkControllBlock(): boolean {
    let state = false;

    if (this.currentStep && this.currentStep.stepDefinition) {

      state = _.has(this.currentStep.stepDefinition, 'Control');
    }

    return state;
  }

  isStepDisabled(): boolean {
    let state = false;


    if (this._checkControllBlock()) {

      let controlBlock = (this.currentStep.stepDefinition as any).Control;
    }

    return state;
  }


  private _showErrorHandler: boolean;
  set showErrorHandler(showErrorHandler: boolean) {
    this._showErrorHandler = showErrorHandler;
  }

  get showErrorHandler(): boolean {
    return this._showErrorHandler;
  }


  isErrorHandlerDisabled(): boolean {
    let state = false;

    if (this._checkControllBlock()) {

      let controlBlock = (this.currentStep.stepDefinition as any).Control;
    }

    return state;
  }

  selectStep(step: IStepDto) {
    this.currentStep = step;
  }

  unselectStep() {
    this.currentStep = undefined;
  }


  editStep(step: IStepDto) {
    this.setEditModeWithSelection(step);
  }


  private _stepList: IStepDto[] = [];
  set stepList(steps: IStepDto[]) {
    this._stepList = steps;
  }

  get stepList() {
    return this._stepList;
  }


  private _archivedStepList: IStepDto[] = [];
  set archivedStepList(steps: IStepDto[]) {
    this._archivedStepList = steps;
  }

  get archivedStepList() {
    return this._archivedStepList;
  }


  loadSteps(processorId: string) {
    this.showLoadingIndicator();

    this.loadSteps$(processorId)
      .pipe(finalize(() => this.hideLoadingIndicator()))
      .subscribe((result: IStepDto[]) => {

      });
  }

  loadSteps$(processorId: string): Observable<IStepDto[]> {
    return this._processorDebugService.getSteps(processorId)
      .pipe(
        tap((result: IStepDto[]) => {
          this.stepList = _.cloneDeep(result);
          this.archivedStepList = _.cloneDeep(result);

          this.initProcessor(this.stepList[0]);
        })
      );
  }


  onlyProcessorHandler($event) {
    this.showLoadingIndicator();

    if ($event.checked) {
      let filteredSteps = _.filter(this.archivedStepList, (step) => {
        return step.stepType == 'Processor'
      });

      this.stepList = filteredSteps;
    } else {
      this.stepList = this.archivedStepList;
    }

    this.hideLoadingIndicator();
  }

  filterSteps(filter: string) {
    if (filter) {
      let filteredSteps = _.filter(this.archivedStepList, (step) => {
        let stepDefinition = JSON.stringify(step.stepDefinition).toLowerCase();
        return stepDefinition.includes(filter);
      });

      this.stepList = filteredSteps;
      return;
    }

    this.stepList = this.archivedStepList;
  }

  //#endregion Steps


  //#region Get Result

  getStepResult(pedId: string, stepName: string, runId: string | undefined) {
    this.showLoadingIndicator();

    this.getStepResult$(pedId, stepName, runId)
      .pipe(finalize(() => this.hideLoadingIndicator()))
      .subscribe((result: IProcessorStepOutputDto) => {

      });
  }

  getStepResult$(pedId: string, stepName: string, runId: string | undefined): Observable<IProcessorStepOutputDto> {
    return this._processorDebugService.getProcessorStepResultFromLastRun(pedId, stepName, runId)
      .pipe(
        tap((result: IProcessorStepOutputDto) => {

        })
      );
  }

  getDataFromVdb$(vdbName: string): Observable<IPagedResultDtoOfVirtualDbRowDto> {
    return this._vdbService.getSearchVirtualDbRowsAsObject(
      undefined,
      vdbName,
      undefined,
      undefined,
      undefined,
      true,
      undefined,
      0,
      1000)
      .pipe(
        tap((result: IPagedResultDtoOfVirtualDbRowDto) => {

        })
      );
  }

  //#endregion Get Result

  //#region Run Processor

  runProcessorAsyncInStepOperationMode$(body: IRunProcessorInStepOperationInputDto): Observable<IRunProcessorInStepOperationOutputDto> {
    this.showLoadingIndicator();
    return this._processorDebugService.runProcessorAsyncInStepOperationMode(body)
      .pipe(
        tap((result: IRunProcessorInStepOperationOutputDto) => {

        })
      );
  }

  //#endregion Run Processor

  //#region Processor Overview
  private _stepsForOverview: IProcessorDependency[];
  set stepsForOverview(stepsForOverview: IProcessorDependency[]) {
    this._stepsForOverview = stepsForOverview;
  }

  get stepsForOverview(): IProcessorDependency[] {

    if (this.currentStep) {
      return _.filter(this._stepsForOverview, (item) => item.name == this.currentStep.stepName);
    }

    return this._stepsForOverview;
  }

  getPEDOverview(processorId: string) {

    this.getPEDOverview$(processorId)
      .subscribe((ped: IProcessorOverviewDto) => {

      });
  }

  getPEDOverview$(body: string): Observable<IProcessorOverviewDto> {
    return this._processorDebugService.getOverview(body)
      .pipe(
        tap((result: IProcessorOverviewDto) => {

        })
      );
  }

  getDepenpencies(processorId: string) {

    this.getDepenpencies$(processorId)
      .subscribe((ped: IProcessorDependency[]) => {

      });
  }


  getDepenpencies$(body: string): Observable<IProcessorDependency[]> {
    return this._processorDebugService.getDepenpencies(body)
      .pipe(
        tap((result: IProcessorDependency[]) => {
          this.stepsForOverview = result;
        })
      );
  }

  //#endregion Processor Overview

  //#region Update PED

  createOrUpdatePED$(body: IProcessorExecutionDefinitionDto): Observable<IProcessorExecutionDefinitionDto> {
    return this._workFlowService.createOrUpdate(body)
      .pipe(
        tap((result: IProcessorExecutionDefinitionDto) => {

        })
      );
  }

  updateStep() {

    if (this.stepOrigin.index != -1) {
      if (!this.definition) {
        this.definition = {} as IProcessorExecutionDefinitionDto;
      }

      this.definition.executionDefinition = this._initExecutionDefinition();

      this.createOrUpdatePED$(this.definition)
        .subscribe((ped: IProcessorExecutionDefinitionDto) => {
          abp.event.trigger("ped.init");
        });
    }

  }

  updateStepAndGoHome() {

    if (this.stepOrigin.index != -1) {
      if (!this.definition) {
        this.definition = {} as IProcessorExecutionDefinitionDto;
      }

      this.definition.executionDefinition = this._initExecutionDefinition();

      this.createOrUpdatePED$(this.definition)
        .subscribe((ped: IProcessorExecutionDefinitionDto) => {
          abp.event.trigger("ped.init");
          setTimeout(() => this.setPreviewMode(), 1000);
        });
    }

  }


  stepOrigin: StepOrigin;

  initStepOrigin(origin: string): StepOrigin {
    let data = {
      'origin': origin,
      'index': -1
    } as StepOrigin;

    let stepName = this.currentStep.stepName;

    switch (origin) {
      case ProcessorConsts.Actions.Data:
        data.index = this._getStepIndexIfContains(this.dataActionsOriginal, stepName);
        break;
      case ProcessorConsts.Actions.Action:
        data.index = this._getStepIndexIfContains(this.actionActionsOriginal, stepName);
        break;
      case ProcessorConsts.Actions.Output:
        data.index = this._getStepIndexIfContains(this.outputActionsOriginal, stepName);
        break;
    }

    this.stepOrigin = data;

    return data;
  }

  private _initExecutionDefinition(): string {
    let executionDefinition = this.definition.executionDefinition;

    let parsedED = JSON.parse(executionDefinition);

    switch (this.stepOrigin.origin) {
      case ProcessorConsts.Actions.Data:
        parsedED[0].Process[0].Data[this.stepOrigin.index] = this.tmpStepDefinition;
        break;
      case ProcessorConsts.Actions.Action:
        parsedED[0].Process[0].Actions[this.stepOrigin.index] = this.tmpStepDefinition;
        break;
      case ProcessorConsts.Actions.Output:
        parsedED[0].Process[0].Outputs[this.stepOrigin.index] = this.tmpStepDefinition;
        break;
    }

    return JSON.stringify(parsedED, null, 10);
  }

  private _tmpStepDefinition: any;
  set tmpStepDefinition(tmpStepDefinition: any) {
    this._tmpStepDefinition = tmpStepDefinition;
  }

  get tmpStepDefinition() {
    return this._tmpStepDefinition;
  }

  updateStepDefinition(stepDefinition: any) {
    this.currentStep.stepDefinition = stepDefinition;
  }

  //#endregion Update PED

  //#region Managing Control Blocks
  addControllBlock(blockName: string, notificationGroupName?: string) {

    if (this.currentStep) {

      let step = _.cloneDeep(this.currentStep);

      switch (blockName) {

        case ProcessorConsts.ControlBlocks.Dissabled:
          step.stepDefinition["Control"] = {
            "Disable": true
          };
          break;
        case ProcessorConsts.ControlBlocks.ErrorHandling:
          step.stepDefinition["Control"] = {
            "OnError": "Apply",
            "Apply": [
              {
                "Action": "SendEmail",
                //"EmailAddress": [
                //    `${email}`
                //],
                //"Group": notificationGroupName | `${notificationGroupName}`"MonitoringError",
                "EmailSubject": "Error in the step",
                "EmailBody": "No source"
              }
            ]
          };
          break;
      }

      this.currentStep = step;
    }
  }

  removeControllBlock(blockName: string) {
    if (this.currentStep) {

      let step = _.cloneDeep(this.currentStep);

      switch (blockName) {
        case ProcessorConsts.ControlBlocks.ErrorHandling:
        case ProcessorConsts.ControlBlocks.Dissabled:
          delete (step.stepDefinition as any).Control;
          break;
      }


      this.currentStep = step;
    }
  }

  //#endregion Managing Control Blocks

  //#region Loader

  private _overviewLoader: boolean = false;
  set overviewLoader(state: boolean) {
    this._overviewLoader = state;
  }

  get overviewLoader() {
    return this._overviewLoader;
  }

  showLoadingIndicator() {
    this.overviewLoader = true;
  }

  hideLoadingIndicator() {
    this.overviewLoader = false;
  }

  //#endregion Loader

}
