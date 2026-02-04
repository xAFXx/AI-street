import {Component, Input} from "@angular/core";
import {SafeHtml, SafeResourceUrl} from "@angular/platform-browser";

@Component({
  selector: 'oauth2-modal.component',
  templateUrl: './oauth2-twinfield-modal.component.html'
})
export class Oauth2TwinfieldModalComponent {

  constructor() {  }

  @Input() htmlString: SafeHtml;
  @Input() url: SafeResourceUrl;

}
