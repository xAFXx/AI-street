import {Component, OnInit, Injector, Input, Output, EventEmitter, ViewEncapsulation} from '@angular/core';

import {PEDComponentBase} from '../ped-base.component';
import {IStepDto} from "../../../../shared";

@Component({
  selector: 'app-processor-action-step',
  templateUrl: './processor-action-step.component.html',
  styleUrls: ['./processor-action-step.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class ProcessorActionStepComponent extends PEDComponentBase implements OnInit {
  getAllOrderGuidesForCustomers$() {
    throw new Error("Method not implemented.");
  }

  private _step: IStepDto;
  @Input() set step(steps: IStepDto) {
    this._step = steps;
  }

  get step() {
    return this._step;
  }

  get isEditMode(): boolean {
    return this.processorService.isEditMode;
  }

  @Output() showResult: EventEmitter<any> = new EventEmitter();
  @Output() editStep: EventEmitter<any> = new EventEmitter();
  @Output() runStep: EventEmitter<any> = new EventEmitter();

  @Output() stepDisable?: EventEmitter<any> = new EventEmitter();

  constructor(
    injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this._checkIfDisabled();

    this._init();
  }

  private _init() {

    //this.searchTerm$.subscribe();
  }

  //private readonly searchTerm = new Subject<void>();
  //private readonly searchTerm$ = this.searchTerm.asObservable().pipe(
  //    debounceTime(1000),
  //    concatMap(() => this.getAllOrderGuidesForCustomers$())
  //);

  //search() {
  //    this.searchTerm.next();
  //}

  //privte _onErrorEmailChange(): Observable<string> {
  //    let observable =

  //    return
  //}

  //#region Step State
  isStepDisabled: boolean;

  private _checkIfDisabled() {
    this.isStepDisabled = this.processorService.isStepDisabled();
  }

  //#endregion Step State

  //opens laste result for current processor
  onShowResult($event?: Event): void {
    if ($event) {
      $event.stopPropagation();
      $event.preventDefault();
    }

    this.processorService.selectStep(this.step);

    this.showResult.emit(this.step);
  }

  //opens edit current step modal
  onEditStep($event?: Event): void {
    if ($event) {
      $event.stopPropagation();
      $event.preventDefault();
    }

    if (!this.isEditMode) {
      this.editStep.emit(this.step);
    }
  }

  onRunStep() {
    this.runStep.emit(this.step)
  }

  goBack() {
    this.processorService.setPreviewMode();
  }

  addErrorNotificationGroup($event) {
    this.processorService.showErrorHandler = true;
  }

  updateErrorNotificationGroup($event) {
    this.processorService.showErrorHandler = true;
  }

  removeErrorNotificationGroup($event) {
    this.removeOnErrorHandlingStep();
  }

  stepDisableHandler($event) {
    let state = $event.checked;

    this.stepDisable.emit(state);
  }
}
