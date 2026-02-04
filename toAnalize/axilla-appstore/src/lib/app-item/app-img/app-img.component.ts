import {
  Component,
  ViewEncapsulation,
  Input,
  EventEmitter,
  Output
} from "@angular/core";

import {AppConsts} from '@axilla/axilla-shared';

import _ from 'lodash';

@Component({
  selector: 'app-img',
  templateUrl: './app-img.component.html',
  styleUrls: ['./app-img.component.less'],
  encapsulation: ViewEncapsulation.None
})
export class AppImgComponent {
  @Input() img: string;

  defaultLogo = AppConsts.appBaseUrl + '/assets/common/images/logo128.png';
  smallLogo = AppConsts.appBaseUrl + '/assets/common/images/logo64.png';

  @Output() openApp = new EventEmitter<void>();

  isNotEmpty(): boolean {
    if (!this.img) {
      return false;
    }
    const str = this.img.trimEnd().trimStart();

    return !(!str || str.length === 0);
  }

  ifContainsUrl(): boolean {
    return new RegExp("([a-zA-Z0-9]+://)?([a-zA-Z0-9_]+:[a-zA-Z0-9_]+@)?([a-zA-Z0-9.-]+\\.[A-Za-z]{2,4})(:[0-9]+)?(/.*)?").test(this.img);
  }

  isBase64(): boolean {
    return _.includes(this.img, 'base64');
  }

  onOpenApp(): void {
    this.openApp.next();
  }
}
