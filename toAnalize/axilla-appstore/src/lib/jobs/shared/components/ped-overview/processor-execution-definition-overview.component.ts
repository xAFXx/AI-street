import {Component, OnInit, OnDestroy, Injector, Input, ViewEncapsulation} from '@angular/core';

import {take, finalize, repeat, filter, delay, takeUntil} from 'rxjs/operators';

import _ from 'lodash';
import {PEDComponentBase} from '../ped-base.component';
import {
  IPagedResultDtoOfVirtualDbRowDto,
  IProcessorStepOutputDto,
  IStepDto,
  ProcessorStateEnum,
  ProcessorStepOutputDto
} from "../../../../shared";

@Component({
  selector: 'app-processor-execution-definition-overview',
  templateUrl: './processor-execution-definition-overview.component.html',
  styleUrls: ['./processor-execution-definition-overview.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class PEDOverviewComponent extends PEDComponentBase implements OnInit, OnDestroy {
  @Input() processorId?: string;

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
    this.processorService.loadSteps(this.processorId);
  }

  home() {
    console.log('home btn');
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

  constructor(
    injector: Injector,
  ) {
    super(injector);

  }

  ngOnInit(): void {

  }

  set isShowNoStepResult(isShowNoStepResult: boolean) {
    this.processorService.isShowNoStepResult = isShowNoStepResult;
  }

  get isShowNoStepResult() {
    return this.processorService.isShowNoStepResult;
  }

  set isShowStepResult(isShowStepResult: boolean) {
    this.processorService.isShowStepResult = isShowStepResult;
  }

  get isShowStepResult() {
    return this.processorService.isShowStepResult;
  }

  //opens laste result for current processor
  showResult(input: any): void {
    this.showLoadingIndicator();

    this.error = null;

    const step = input.step;

    this.processorService.getStepResult$(this.processorId, step.stepName, input.runId)
      .pipe(
        delay(2000),
        repeat(),
        filter((data: IProcessorStepOutputDto, index) => this.retry(data, index)),
        take(1),
        takeUntil(this.unsubscribe)
      )
      .subscribe((result: IProcessorStepOutputDto) => {

        if (this.isNoResult(result)) {
          this.showStepNoResult();
        } else if (result.state == ProcessorStateEnum.Finished && this.isContainsResult(result)) {
          this.getResult(result);
        } else if (this.isContainsErrorWithResult(result)) {
          this.getResult(result);
          this.error = result.processorErrors[0];
        } else if (this.isContainsErrorWithOutResult(result)) {
          this.showStepResult();
          this.error = result.processorErrors[0];
        } else {
          this.hideLoadingIndicator();
          this.clear();
        }
      });
  }

  error: any;

  private getResult(result: IProcessorStepOutputDto) {
    let vdbName = this._getVDBName(result.vdbName);
    this.getDatabases(vdbName);
  }

  private isContainsError(result: IProcessorStepOutputDto) {
    if (result.state == ProcessorStateEnum.Error) {
      return true;
    }

    return false;
  }

  private isNoResult(result: IProcessorStepOutputDto) {
    if (result.state == ProcessorStateEnum.NoData && !this.isContainsResult(result)) {
      return true;
    }

    return false;
  }

  private isContainsResult(result: IProcessorStepOutputDto) {
    if (result.vdbName) {
      return true;
    }

    return false;
  }

  private isContainsErrorWithOutResult(result: IProcessorStepOutputDto) {
    if (!this.isContainsResult(result) && this.isContainsError(result)) {
      return true;
    }

    return false;
  }

  private isContainsErrorWithResult(result: IProcessorStepOutputDto) {
    if (this.isContainsError(result) && this.isContainsResult(result)) {
      return true;
    }

    return false;
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


  ////opens edit current step modal
  //editStep(step: any): void {
  //    console.log('editStep', step);
  //}

  ////opens edit current step modal
  //runStep(step: any): void {
  //    console.log('runStep', step);
  //}


  clear() {
    this.openedValue = '';
    this.isShowStepResult = false;
    this.isShowNoStepResult = false;
    this.error = null;
  }

  showStepResult() {
    this.hideLoadingIndicator();
    this.isShowNoStepResult = false;
    this.isShowStepResult = true;
  }

  showStepNoResult() {
    this.hideLoadingIndicator();
    this.isShowStepResult = false;
    this.isShowNoStepResult = true;
  }

  getDatabases(vdbName: string) {
    this.processorService.getDataFromVdb$(vdbName)
      .pipe(finalize(() => this.hideLoadingIndicator()))
      .subscribe((result: IPagedResultDtoOfVirtualDbRowDto) => {
        let data = result.items;

        this.openedValue = _.map(data, (item) => {
          return item.value;
        })


        this.showStepResult();
      });
  }


  search(filter: string) {
    this.processorService.filterSteps(filter)
  }
}
