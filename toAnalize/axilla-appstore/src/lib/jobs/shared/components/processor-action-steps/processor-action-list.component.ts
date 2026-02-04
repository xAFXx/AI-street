import {
  Component,
  OnInit,
  ViewChild,
  Injector,
  Input,
  Output,
  EventEmitter,
  ViewEncapsulation,
  ElementRef
} from '@angular/core';

import {PEDComponentBase} from '../ped-base.component';

import {FormGroup, FormControl} from '@angular/forms';
import {
  IRunProcessorInStepOperationInputDto,
  IRunProcessorInStepOperationOutputDto,
  IStepDto
} from "../../../../shared";

@Component({
  selector: 'app-processor-action-list',
  templateUrl: './processor-action-list.component.html',
  styleUrls: ['./processor-action-list.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class ProcessorActionListComponent extends PEDComponentBase implements OnInit {
  @Input() processorId?: string;

  @Output() showLastResult: EventEmitter<any> = new EventEmitter();

  @ViewChild('searchInput') input: ElementRef;

  private _stepList: IStepDto[] = [];
  @Input() set stepList(steps: IStepDto[]) {
    this._stepList = steps;
  }

  get stepList() {
    return this._stepList;
  }

  get overviewLoader() {
    return this.processorService.overviewLoader;
  }

  constructor(
    injector: Injector,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this._initSearchForm();
  }

  searchForm: FormGroup;

  private _initSearchForm() {
    this.searchForm = new FormGroup({
      search: new FormControl(null)
    });
  }

  //opens laste result for current processor
  showResult(step: any, runId: string | undefined): void {
    let data = {
      'step': step,
      'runId': runId
    };

    this.showLastResult.emit(data);
  }

  //opens edit current step modal
  editStep(step: any): void {
    this.processorService.editStep(step);
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
          this.showResult(step, result.runId);
        }
      });
  }

  search(filter: string) {
    this.processorService.filterSteps(filter)
  }

  focusSearch($event) {
    if ($event) {
      $event.preventDefault();
      $event.stopPropagation();
    }

    this.input.nativeElement.focus();

    //this.searchElement.nativeElement.focus();
  }
}
