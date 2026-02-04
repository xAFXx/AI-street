import {
    Component,
    ViewEncapsulation,
    OnInit,
    Injector
} from "@angular/core";

import { AppComponentBase, appModuleAnimation } from "@axilla/axilla-shared";

@Component({
    templateUrl: './job.component.html',
    styleUrls: ['./job.component.less'],
    encapsulation: ViewEncapsulation.None,
    animations: [appModuleAnimation()]
})
export class JobComponent extends AppComponentBase implements OnInit {

    processorsDd = ["Axilla/ProcessorExecutionHandler"];

    constructor(
        injector: Injector
    ) {
        super(injector);
    }

    ngOnInit(): void {

    }
}
