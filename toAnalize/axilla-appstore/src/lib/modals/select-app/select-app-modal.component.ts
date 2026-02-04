import {
  Component,
  Injector,
  OnInit,
  Input
} from '@angular/core';
import {BsModalRef} from 'ngx-bootstrap/modal';
import {Observable, Subject} from 'rxjs';

import {AppComponentBase} from '@axilla/axilla-shared';
import {IAppListDto, IEntityDtoOfGuid} from "../../shared";

@Component({
  selector: 'select-app-modal',
  templateUrl: './select-app-modal.component.html',
  styleUrls: [
    './select-app-modal.component.less'
  ],
})
export class SelectAppModalComponent extends AppComponentBase implements OnInit {
  @Input() apps$: Observable<IAppListDto[]>;
  public addToTenant: Subject<IEntityDtoOfGuid> = new Subject();

  constructor(
    injector: Injector,
    private _modal: BsModalRef
  ) {
    super(injector);
  }

  ngOnInit(): void {
  }

  onOpenApp() {
  }

  onSelectAppSubmit(id: string) {
    const addingApp = {
      id: id
    } as IEntityDtoOfGuid;

    this.addToTenant.next(addingApp);
    this.close();
  }

  onDeleteApp(id: string) {

  }

  close(): void {
    this._modal.hide();
  }
}
