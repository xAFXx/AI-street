import {
  Component,
  ViewEncapsulation,
  Injector,
  OnInit,
  ViewChild
} from "@angular/core";
import {AppComponentBase, appModuleAnimation} from "@axilla/axilla-shared";

import {Router} from "@angular/router";
import {BsModalService, BsModalRef} from "ngx-bootstrap/modal";
import {SetAssignmentModalComponent} from "./modals/set-assignment-modal.component";
import {take, catchError, takeUntil, repeat, delay, takeWhile} from "rxjs/operators";
import {throwError, Subject} from "rxjs";
import {RemoteControlService} from "./services/remote-control.service";

import {JsonEditorComponent, JsonEditorOptions} from "ang-jsoneditor";
import {IPopAssignmentInputDto, ISetAssignmentInputDto, ISetAssignmentOutputDto} from "../../shared";

declare let abp: any;

@Component({
  selector: 'app-rc',
  templateUrl: './remote-controller.component.html',
  styleUrls: ['./remote-controller.component.less'],
  encapsulation: ViewEncapsulation.None,
  animations: [appModuleAnimation()]
})

export class RemoteControllerComponent extends AppComponentBase implements OnInit {

  //#region Editor
  @ViewChild(JsonEditorComponent, {static: true}) editor: JsonEditorComponent;

  editorOptions: JsonEditorOptions;
  //#endregion Editor

  lastAssignmentId: string;
  lastAssignmentKey: string;
  isLoading: boolean = false;
  //application creation modal
  public _setAssignmentModal$: BsModalRef;

  constructor(injector: Injector,
              private readonly modalService: BsModalService,
              private _rcService: RemoteControlService,
  ) {
    super(injector);

    this.editorOptions = new JsonEditorOptions();
  }

  ngOnInit(): void {
    this.editorOptions.modes = ['tree', 'code'];
  }


  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  //open madal to add an application
  openSetAssignmentModal(): void {
    this._clear();

    this._setAssignmentModal$ = this.modalService.show(SetAssignmentModalComponent,
      {
        class: 'w-80'
      });
    let setAssignmentModal = this._setAssignmentModal$.content as SetAssignmentModalComponent;

    setAssignmentModal.onClose
      .pipe(
        take(1)
      ).subscribe((input: ISetAssignmentInputDto) => {
      if (!input) {
        abp.notify.error(this.l('ThereIsNoViewConfigurationForX'));
      }

      this.lastAssignmentKey = input.target;

      // save new app
      this._rcService.setAssignment$(input)
        .pipe(
          take(1),
          catchError(err => {
            return throwError(err);
          })
        ).subscribe((result: ISetAssignmentOutputDto) => {
        if (result) {
          this.lastAssignmentId = result.id;
          this.isLoading = true;

          this.getAssignmentResult();
        }
      });
    });
  }

  private _clear() {
    this.isLoading = false;

    this.lastAssignmentKey = undefined;
    this.lastAssignmentId = undefined;
    this.openedValue = undefined;
  }

  destroy$ = new Subject<boolean>();
  openedValue: Object;

  getAssignmentResult() {
    const input  = {
      contains: this.lastAssignmentId || undefined,
      key: this.lastAssignmentKey || undefined
    } as IPopAssignmentInputDto;

    this._rcService.popAssignment$(input)
      .pipe(
        delay(5000),
        takeUntil(this.destroy$), // Stop if component is destroyed
        takeWhile(result => this._isEmpty(result), true), // Repeat only while the result is empty
        repeat(), // Keep repeating the request until takeWhile stops it
      ).subscribe({
        next: (result: string) => {
          if(result) {
            this.openedValue = JSON.parse(result);
            this.isLoading = false;

            this.destroy$.next(true);
          }
        },
        error: (err) => {
          console.error('Error occurred:', err);
        }
    });
  }

  private _isEmpty(value: any): boolean {
    if(!value) {
      return true;
    }

    if (typeof value === 'string') {
      return value === '';
    }

    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length === 0;
    }

    return false;
  }

}
