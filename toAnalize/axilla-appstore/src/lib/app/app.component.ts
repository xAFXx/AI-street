import {
  Component,
  ViewEncapsulation,
  Injector
} from "@angular/core";

import {AppComponentBase, appModuleAnimation} from "@axilla/axilla-shared";

@Component({
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.less'],
  selector: 'app',
  encapsulation: ViewEncapsulation.None,
  animations: [appModuleAnimation()]
})
export class AppComponent extends AppComponentBase {
  constructor(injector: Injector,
  ) {
    super(injector);
  }
}
