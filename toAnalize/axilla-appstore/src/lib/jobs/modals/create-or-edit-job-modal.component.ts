import {
  Component,
  Injector,
  Input,
} from '@angular/core';
import {AppComponentBase} from '@axilla/axilla-shared';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {Subject} from 'rxjs';
import {
  FormGroup,
  FormControl,
} from '@angular/forms';

import {
  WorkFlowServiceProxy,
  AuthenticationMethod,
  IChannelDefinitionDto,
  IProcessorExecutionDefinitionDto
} from '../../shared';

declare let abp: any;

@Component({
  selector: 'createOrEditJobModal',
  templateUrl: './create-or-edit-job-modal.component.html',
  styleUrls: ['./create-or-edit-job-modal.component.less']
})
export class CreateOrEditJobModalComponent extends AppComponentBase {
  jobForm: FormGroup;

  @Input("apiDefinitionId") apiDefinitionId?: string;
  @Input("authentication") authentication?: AuthenticationMethod;

  submit = new Subject<any>();

  processorsDdDummy = ['Axilla/ProcessorExecutionHandler', 'Axilla/PushPullDistribution'];
  ddProcessors: any;

  dateFormat = 'DD-MM-YYYY';

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
    private readonly _workFlowService: WorkFlowServiceProxy,
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this._init();
  }

  private _init() {
    this.initForm();

    this._initProcessors();
    this._initPED();
    this._initChannel();
  }

  //#region Form
  private initForm() {
    this.jobForm = new FormGroup({
      workflowName: new FormControl(null),
      processorExecutionDefinition: new FormControl(null),
      jobName: new FormControl(null),
      channelId: new FormControl(null),
      params: new FormControl(null),
      startTime: new FormControl(null),
      startImmediately: new FormControl(null),
      isDayly: new FormControl(null),
      cron: new FormControl(null),
      isDate: new FormControl(null),
    });
  }

  get f() {
    return this.jobForm;
  }

  get isDate() {
    return this.f.get('isDate').value;
  }

  set cron(value: string) {
    this.f.get('cron').setValue(value);
  }

  //#endregion

  //#region Cron
  private _cronExpression: string;
  get cronExpression(): string {
    if (!this._cronExpression) {
      return '4 3 2 12 1/1 ? *';
    }
    return this._cronExpression;
  }

  set cronExpression(value: string) {
    this._cronExpression = value;
    this.cron = value;
  }

  public isCronDisabled = false;
  //#endregion  Cron


  //#region Processors
  private _initProcessors() {
//        this._bookingPeriodMappingService
//            .getAll(undefined, undefined, undefined, undefined, true, undefined, undefined, undefined)
//            .subscribe(result => {
//                if (result) {
    this._setDdGla(this.processorsDdDummy);
//                }
//            });
  }

  private _setDdGla(result: any) {
    let label = abp.localization.localize('Axilla.Job.SelectProcessor', 'Axilla');
    this.ddProcessors = this._setProcessorDd(result);
    this.ddProcessors.unshift({label: label, value: null});
  }

  private _setProcessorDd(items: any) {
    let tmp = [];
    for (let i = 0; i < items.length; ++i) {
      let item = items[i];
      tmp.push({
        label: item,
        value: item
      });
    }
    return tmp;
  }

  //#endregion Documen Type

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
    let label = abp.localization.localize('Axilla.Job.SelectChannelId', 'Axilla');
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

  //#endregion ChannelId

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
    let label = abp.localization.localize('Axilla.Job.SelectProcessorExecutionDefinition', 'Axilla');
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

  //#endregion ExecutionDefinition

  onCreateJobAndClose() {
    this._onCreateJob();
    this.close();
  }

  onCreateJob() {
    this._onCreateJob();
  }

  private _onCreateJob() {
    const formValue = this.jobForm.value;

    this.submit.next(formValue);
  }

  close(): void {
    this._modal.hide();
    this.jobForm.reset();
  }
}
