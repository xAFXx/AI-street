import {Component, ViewChild, Injector, OnInit, Input} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';

import {AppComponentBase} from '@axilla/axilla-shared';

import {UpdateExecutionDefinitionItemComponent} from
    "./update-execution-definition-item/update-execution-definition-item.component";

import {
  AuthenticationMethod,
} from "../../shared/service-proxies/service-proxies";

import {ProcessorService} from '../shared/services/processor.service';

@Component({
  selector: 'updateExecutionDefinitionModal',
  templateUrl: './update-execution-definition-modal.component.html',
  styleUrls: ['./update-execution-definition-modal.component.less']
})
export class UpdateExecutionDefinitionModalComponent extends AppComponentBase implements OnInit {
  modeHomepage: any = true;
  processorId: string = "";
  processorName: string = "";

  @Input("apiDefinitionId") apiDefinitionId?: string;
  @Input("authentication") authentication?: AuthenticationMethod;
  @Input("appTitle") appTitle?: string;

  @ViewChild('updateExecutionDefinitionItem', {static: true}) updateExecutionDefinitionItem: UpdateExecutionDefinitionItemComponent;

  constructor(injector: Injector,
              private readonly processorService: ProcessorService,
              private _modal: BsModalRef) {
    super(injector);
  }

  ngOnInit(): void {
  }

  close(): void {
    this._modal.hide();

    this.processorService.clear();
  }

  goHome() {
    this.modeHomepage = true;

    this.processorService.clear();
  }

  openProcessor(input?: string) {
    this.processorId = input;
    this.modeHomepage = false;
  }

  openProcessorNavigation(input?: any) {
    this.processorId = input.id;
    this.processorName = input.name;
    this.modeHomepage = 'navigation-processor';
    this.processorService.clear();

  }
}
