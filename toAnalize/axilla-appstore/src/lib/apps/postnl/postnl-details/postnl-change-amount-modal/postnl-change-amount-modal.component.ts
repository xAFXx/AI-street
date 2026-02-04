import {Component, OnInit, ViewChild, Output, EventEmitter, Input} from '@angular/core';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-postnl-change-amount-modal',
  templateUrl: './postnl-change-amount-modal.component.html',
  styleUrls: ['./postnl-change-amount-modal.component.css']
})
export class PostnlChangeAmountModalComponent implements OnInit {
  @ViewChild('postnlModal', {static: true}) postnlModal: ModalDirective;
  @Input() record: any;
  @Output() startProcessor: EventEmitter<any> = new EventEmitter<any>();

  constructor() {
  }

  active = false;
  count = 4;

  ngOnInit(): void {
  }

  close(): void {
    this.active = false;
    this.postnlModal.hide();
  }

  show(): void {
    this.active = true;
    this.postnlModal.show();

  }

  startProcessors() {
    const value = this.record;
    const count = this.count;

    this.startProcessor.emit({value, count});
  }
}
