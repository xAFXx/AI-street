import {Component, OnInit, Injector, Output, EventEmitter, ViewChild, Input} from '@angular/core';
import {AppComponentBase} from "@axilla/axilla-shared";

import { ProcessorHandler } from './processor.handler'; // Import the processor handler

import {
  WorkFlowServiceProxy,
  ISearchExecutionDefinitionDto,
  IPagedResultDtoOfProcessorExecutionDefinitionDto,
  IProcessorExecutionDefinitionDto
} from '../../../shared/service-proxies/service-proxies';

import {debounceTime, concatMap, tap} from 'rxjs/operators';
import {FormGroup, FormControl} from '@angular/forms';
import {ProcessorService} from "../../shared/services/processor.service";

@Component({
  selector: 'app-processor-homepage',
  templateUrl: './processor-homepage.component.html',
  styleUrls: ['./processor-homepage.component.scss']
})
export class ProcessorHomepageComponent extends AppComponentBase implements OnInit {

  searchForm: FormGroup; // Define the form group

  processorList: IProcessorExecutionDefinitionDto[] = [];

  @Output() onOpen: EventEmitter<any> = new EventEmitter<any>();

  @Output() goToProcessorNavigation: EventEmitter<any> = new EventEmitter<any>();

  @Input() appTitle: string;

  @ViewChild('dv', {static: true}) dv: any;

  constructor(injector: Injector,
              private _workFlowService: WorkFlowServiceProxy,
              private processorHandler: ProcessorHandler,
              private processorService: ProcessorService
  ) {
    super(injector);
  }

  navigateToProcessor(input?: any) {
    if (input) {
      this.goToProcessorNavigation.emit(input);
    }
  }

  ngOnInit(): void {
    // Initialize the form group with searchControl
    this.searchForm = new FormGroup({
      search: new FormControl(''), // FormControl initialization
    });

    const initialSearchValue = this.processorService.currentProcessorSearch || '';
    this.searchForm.get('search')?.setValue(initialSearchValue, { emitEvent: false });
    this.processorService.currentProcessorSearch = initialSearchValue;

    this.processorList = this.processorService.currentDefinitions;

    // Trigger a search for the initial value if no data is loaded
    if (!this.processorService.currentProcessorSearch && this.processorList?.length === 0) {
      this.search(initialSearchValue);
    }

    // Subscribe to valueChanges with debounce for search optimization
    this.searchForm.get('search')?.valueChanges
      .pipe(debounceTime(300))
      .subscribe((value: string) => {
        this.processorService.currentProcessorSearch = value;
        this.search(value);
      });
  }

getAll(filter: string) {
    const search = this.createSearchObject(filter);

    this._workFlowService.searchExecutionDefinition(search)
      .subscribe((res: IPagedResultDtoOfProcessorExecutionDefinitionDto) => {
          this.processorService.currentDefinitions = res.items;
          this.processorList = res.items;
      });
  }




  search(value: string) {
    const search = this.createSearchObject(value);
    this._workFlowService.searchExecutionDefinition(search)
      .subscribe((res: IPagedResultDtoOfProcessorExecutionDefinitionDto) => {
          this.processorService.currentDefinitions = res.items;
          this.processorList = res.items;
      });
  }

  //#endregion Search


  filter($event) {
    this.getAll($event.target.value);
  }

  close() {

  }

  getInitials(input: string) {
    if (input === null) {
      return "";
    }
    let initials = "";
    for (let i = 0; i < input.length; i++) {
      if (input[i] === input[i].toUpperCase()) {
        initials += input[i];
      }
    }
    return initials;
  }

  openProcessor(input?: any) {
    if (input) {
      this.onOpen.emit(input.id);
    } else {
      this.onOpen.emit();
    }
  }

  createNewPed() {
    this.openProcessor();
  }

  getColor(processor: any) {
    return {background: processor.color ? processor.color : "white"};
  }

  createSearchObject(filter: string): ISearchExecutionDefinitionDto {
    return {
      filter: filter,
      skipCount: 0,
      maxResultCount: 100,
    };
  }

  getProcessorDetails(processor: any): any | null {
    const details = this.processorHandler.getProcessorStatistics(processor.executionDefinition);

    return details;
  }

}
