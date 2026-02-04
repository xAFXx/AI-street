import {
  Component, EventEmitter,
  Injector,
  OnInit, Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { AppComponentBase } from '@axilla/axilla-shared';
import { BsModalRef } from 'ngx-bootstrap/modal';
import {
  FormGroup,
  FormControl,
  Validators,
  FormBuilder
} from '@angular/forms';
import { Subject, throwError } from 'rxjs';

import { take, catchError, finalize } from 'rxjs/operators';
import { LazyLoadEvent } from 'primeng/api';
import {
  IDescribeImageInputDto, IDescribeImageOutputDto, ImageDescriptionServiceProxy,
  IPagedResultDtoOfQueryTemplatesDto,
  IQueryTemplatesDto,
  ISetAssignmentInputDto,
} from "../../../shared";

declare let abp: any;

@Component({
  selector: 'describe-image-modal',
  templateUrl: './describe-image-modal.component.html',
  styleUrls: ['describe-image-modal.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class DescribeImageModalComponent extends AppComponentBase implements OnInit {

  base64Image: string | null = null;

  public onClose: Subject<string> = new Subject();

  active = false;
  saving = false;

  aiModels: any;

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
    private _idService: ImageDescriptionServiceProxy,
  ) {
    super(injector);
  }

  ngOnInit() {

    this._setDdAIModels();
  }

  private _setDdAIModels() {
    //this.aiModels = this._setDd();
    this.aiModels.unshift({ label: 'Select AI model', value: 'null' });
  }
  private _setDd() {
    let tmp = [];

    // let data = Object.keys(this._rcActions)
    //   .map(key => {
    //     return this._rcActions[key];
    //   });
    //
    // for (let i = 0; i < data.length; ++i) {
    //   let item = data[i];
    //
    //   if (typeof item === 'number')
    //     continue;
    //
    //   tmp.push({
    //     label: item,
    //     value: item
    //   });
    // }

    return tmp;
  }

  close(): void {
    //this.f.reset();
    this._modal.hide();
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        this.base64Image = reader.result as string;
        this.onClose.next(this.base64Image);
      };
      reader.readAsDataURL(file);
      this.close();
    }
  }



}
