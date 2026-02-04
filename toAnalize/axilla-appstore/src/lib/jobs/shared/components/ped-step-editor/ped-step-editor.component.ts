import {Component, OnInit, Injector, Input, Output, EventEmitter, ViewEncapsulation, OnDestroy} from '@angular/core';

import {take, finalize, repeat, filter, delay, takeUntil} from 'rxjs/operators';

import {ActivatedRoute} from '@angular/router';
import {PEDComponentBase} from '../ped-base.component';

import _ from 'lodash';

import {FormGroup, FormControl} from '@angular/forms';
import {
  IPagedResultDtoOfVirtualDbRowDto,
  IProcessorStepOutputDto,
  IRunProcessorInStepOperationInputDto,
  IRunProcessorInStepOperationOutputDto, ProcessorStateEnum
} from "../../../../shared";

@Component({
  selector: 'app-ped-step-editor',
  templateUrl: './ped-step-editor.component.html',
  styleUrls: ['./ped-step-editor.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class PEDStepEditorComponent extends PEDComponentBase implements OnInit, OnDestroy {
  @Input() processorId?: string;

  @Output() saveStep?: EventEmitter<any> = new EventEmitter();

  //#region Editor Step Definition
  stepValue: any;

  private _initStepEditEditor() {
    this.stepValue = this.stepDefinition;
  }

  stepDisableHandler(state: boolean) {
    if (state) {
      this.dissableStep();
    } else {
      this.enableStep();
    }

    this._initStepEditEditor();
  }

  //#endregion Editor Step Definition

  changeStepValue(data) {
    this.processorService.tmpStepDefinition = data;
    this.processorService.updateStepDefinition(data);
  }

  //#region Editor Result
  resultValue: any;

  private _initResultEditor() {
    let data = {
      'step': this.step,
      'runId': undefined
    };

    this.showResult(data);
  }

  //#endregion Editor Result

  get showErrorHandler(): boolean {
    return this.processorService.showErrorHandler;
  }

  goBack() {
    this.processorService.showErrorHandler = false;
    this.onErrorForm.reset();
  }

  saveErrorNotificationGroup() {

  }

  //#region Form
  onErrorForm: FormGroup;

  private initForm() {
    this.onErrorForm = new FormGroup({
      email: new FormControl(null),
    });
  }

  get f() {
    return this.onErrorForm;
  }

  //#endregion

  setErrorReceiver() {

  }

  constructor(
    injector: Injector,
    private _activatedRoute: ActivatedRoute,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this._initStepEditEditor();
    this._initResultEditor();

    this._initStepOrigin();

    this.initForm();
  }

  private _initStepOrigin() {
    this.processorService.initStepOrigin(this.getStepOrigin(this.step));
  }

  onSaveStep(): void {
    this.saveStep.emit(this.step)
  }

  //opens laste result for current processor
  onShowResult(step: any): void {
    console.log('showResult', step);

    let data = {
      'step': this.step,
      'runId': undefined
    };
    this.showResult(data);
  }

  //opens edit current step modal
  editStep(step: any): void {
    console.log('editStep', step);
  }

  //opens edit current step modal
  runStep(step: any): void {
    const input = {
      processorExecutionDefinitionId: this.processorId,
      startStepName: step.stepName,
      stopStepName: step.stepName
    } as IRunProcessorInStepOperationInputDto;

    this.processorService.runProcessorAsyncInStepOperationMode$(input)
      .subscribe((result: IRunProcessorInStepOperationOutputDto) => {
        if (result) {
          let data = {
            'step': this.step,
            'runId': result.runId
          };
          this.showResult(data);
        }
      });
  }

  //opens laste result for current processor
  showResult(input: any): void {
    this.showLoadingIndicator();

    const step = input.step;

    this.processorService.getStepResult$(this.processorId, step.stepName, input.runId)
      .pipe(
        delay(2000),
        repeat(20),
        filter((data: IProcessorStepOutputDto, index) => this.retry(data, index)),
        take(1),
        takeUntil(this.unsubscribe)
      )
      .subscribe((result: IProcessorStepOutputDto) => {
        if (result.state == ProcessorStateEnum.Finished && result.vdbName) {
          let vdbName = this._getVDBName(result.vdbName);
          this.getDatabases(vdbName);
        } else {
          this.hideLoadingIndicator();
          this.clear();
        }
      });
  }

  retry(data: IProcessorStepOutputDto, index): boolean {
    if (data.state == ProcessorStateEnum.Finished && data.vdbName) {
      return true;
    }

    if (data.state == ProcessorStateEnum.NotRun || data.state == ProcessorStateEnum.Busy) {
      return false;
    }

    return true;
  }

  getDatabases(vdbName: string) {
    this.processorService.getDataFromVdb$(vdbName)
      .pipe(finalize(() => this.hideLoadingIndicator()))
      .subscribe((result: IPagedResultDtoOfVirtualDbRowDto) => {
        let data = result.items;

        this.resultValue = _.map(data, (item) => {
          return item.value;
        })
      });
  }

  clear() {
    this.resultValue = '';
  }
}
