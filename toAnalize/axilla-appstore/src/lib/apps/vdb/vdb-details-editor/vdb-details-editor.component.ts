import {Component, OnInit, ViewChild, Injector, Input, Output, EventEmitter} from '@angular/core';
import {JsonEditorComponent, JsonEditorOptions} from 'ang-jsoneditor';
import {AppComponentBase} from "@axilla/axilla-shared";

import {
  VDBServiceProxy,
  IUpdateJsonViewSettingInput,
  ISaveToVirtualDbInput
} from '../../../shared';

import {JsonEditorService} from "../../../shared/services/editor.service";

declare let abp: any;

@Component({
  selector: 'app-vdb-details-editor',
  templateUrl: './vdb-details-editor.component.html',
  styleUrls: ['./vdb-details-editor.component.less']
})
export class VdbDetailsEditorComponent extends AppComponentBase implements OnInit {
  @ViewChild(JsonEditorComponent, {static: true}) editor: JsonEditorComponent;

  editorOptions: JsonEditorOptions;

  @Input() vdbName: string;
  @Input() openedItem: string;
  @Input() openedValue: Object;
  @Input() mode: any;
  @Output() closeRow = new EventEmitter();
  @Output() saveRow = new EventEmitter();
  @Output() changeMode = new EventEmitter();

  notSavedValue: Object;

  constructor(
    injector: Injector,
    public _vdbService: VDBServiceProxy,
    public _jsonEditorService: JsonEditorService
  ) {
    super(injector);

    this.editorOptions = this._jsonEditorService.initEditor();
  }

  ngOnInit(): void {
    this.notSavedValue = this.openedValue;
  }

  updateSetting(input: string) {
    const inner = {
      value: input
    } as IUpdateJsonViewSettingInput;

    this._vdbService.updateJsonViewSetting(inner).subscribe();
    this.changeMode.emit(input);
  }

  saveVdbRow() {
    const body = {
      key: this.openedItem,
      innerObject: this.openedValue,
      databaseName: this.vdbName
    } as ISaveToVirtualDbInput;

    this._vdbService.saveToVirtualDb(body)
      .subscribe(() => {
        abp.notify.success("The row with key '" + this.openedItem + "' was successfully saved!");
        this.saveRow.emit(this.openedValue);
      });
  }

  changeRow(json: Object) {
    let jsonInString = JSON.stringify(json);
    this.notSavedValue = JSON.parse(jsonInString);
  }

  closeItem() {
    this.closeRow.emit();
  }
}
