import {
  Component,
  ViewEncapsulation,
  Input,
  Output,
  EventEmitter
} from "@angular/core";
import {IAppAssignmentListDto} from "../shared";

@Component({
  templateUrl: './app-item.component.html',
  styleUrls: ['./app-item.component.less'],
  selector: 'app-item',
  encapsulation: ViewEncapsulation.None
})
export class AppItemComponent {
  @Input() app: IAppAssignmentListDto;
  @Output() openApp = new EventEmitter<IAppAssignmentListDto>();
  @Output() removeFromTenant = new EventEmitter<string>();
  @Output() editApp = new EventEmitter<IAppAssignmentListDto>();
  @Output() installApp = new EventEmitter<string>();

  @Input() installation: boolean = false;

  onOpenApp(): void {
    this.openApp.next(this.app);
  }

  onEditApp(): void {
    this.editApp.next(this.app);
  }

  onRemoveFromTenant() {
    this.removeFromTenant.emit(this.app.appId);
  }

  onInstallApp() {
    this.installApp.emit(this.app.appId);
  }
}
