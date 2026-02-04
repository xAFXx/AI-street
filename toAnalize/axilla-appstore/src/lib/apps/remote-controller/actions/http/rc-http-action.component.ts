import {Component, EventEmitter, Injector, OnInit, Output} from "@angular/core";
import { AppComponentBase } from "@axilla/axilla-shared";
import {FormBuilder, FormControl, FormGroup, Validators} from "@angular/forms";
import { Subject } from "rxjs";
import {debounceTime, distinctUntilChanged, filter, takeUntil} from "rxjs/operators";
import {JsonEditorOptions} from "ang-jsoneditor";
import {JsonEditorService} from "../../../../shared";

declare let abp: any;

@Component({
    selector: 'rc-http-action',
    templateUrl: './rc-http-action.component.html',
    styleUrls: ['./rc-http-action.component.less'],
})
export class RcHttpActionComponent extends AppComponentBase implements OnInit {

    @Output() formFilled: EventEmitter<any> = new EventEmitter<any>();

    httpForm: FormGroup;

    destroy$ = new Subject<boolean>();

    headerEditorOptions: JsonEditorOptions;
    bodyEditorOptions: JsonEditorOptions;

    constructor(
        injector: Injector,
        private formBuilder: FormBuilder,
        public _jsonEditorService: JsonEditorService,
    ) {
        super(injector);

        this.headerEditorOptions = this._jsonEditorService.initEditor();
        this.bodyEditorOptions = this._jsonEditorService.initEditor();

    }

    ngOnInit(): void {
        this.httpForm = this.formBuilder.group({
            url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/i)]],
            httpMethod: ['POST', Validators.required],
            contentType: ['application/json', Validators.required],

            // JSON editors or textarea inputs
            headers: [null],
            body: [null],
        });

        this.httpForm.get('headers')!.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(v => console.log('headers changed', v));

        this.httpForm.get('body')!.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$)
            )
            .subscribe(v => console.log('body changed', v));

        this.httpForm.valueChanges
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                takeUntil(this.destroy$),
                filter(() => this.httpForm.valid)
            )
            .subscribe(() => {
                this.emitIfValid();
            });

        this.initHttpMethodValidation();
    }

    ngOnDestroy() {
        this.destroy$.next(true);
        this.destroy$.unsubscribe();
    }

    private initHttpMethodValidation(): void {
        const methodCtrl = this.httpForm.get('httpMethod');
        const bodyCtrl = this.httpForm.get('body');

        if (!methodCtrl || !bodyCtrl) {
            return;
        }

        const applyBodyValidation = (method: string) => {
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                bodyCtrl.setValidators([Validators.required]);
            } else {
                bodyCtrl.clearValidators();
            }

            bodyCtrl.updateValueAndValidity({ emitEvent: false });
        };

        // React to method changes
        methodCtrl.valueChanges
            .pipe(
                takeUntil(this.destroy$),
            )
            .subscribe(method => {
                applyBodyValidation(method);
            });

        // Apply initial state
        applyBodyValidation(methodCtrl.value);
    }


    emitIfValid(): void {
        this.httpForm.markAllAsTouched();

        if (!this.httpForm.valid) {
            return;
        }

        const raw = this.httpForm.getRawValue();

        this.formFilled.emit({
            url: raw.url,
            httpMethod: raw.httpMethod,
            contentType: raw.contentType,
            headers: JSON.stringify(raw.headers) || undefined,
            body: JSON.stringify(raw.body) || undefined,
        });
    }

}
