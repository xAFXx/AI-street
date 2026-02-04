import {
    Component,
    Injector,
    OnInit,
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

import {RcHttpActionPayload, RemoteControlActions} from '../models';
import { RemoteControlService } from '../services/remote-control.service';
import { take, catchError, finalize } from 'rxjs/operators';
import { LazyLoadEvent } from 'primeng/api';
import {  Table } from 'primeng/table';
import { Paginator } from 'primeng/paginator';
import {
  ICreateQueryTemplateInputDto,
  IPagedResultDtoOfQueryTemplatesDto,
  IQueryTemplatesDto,
  ISetAssignmentInputDto,
  IUpdateQueryTemplateInputDto
} from "../../../shared";

declare let abp: any;

@Component({
    selector: 'set-assignment-modal',
    templateUrl: './set-assignment-modal.component.html',
    styleUrls: ['set-assignment-modal.component.less'],
    encapsulation: ViewEncapsulation.None
})
export class SetAssignmentModalComponent extends AppComponentBase implements OnInit {
    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;

    public onClose: Subject<ISetAssignmentInputDto> = new Subject();

    setAssignmentModalForm: FormGroup;

    selectedTemplate: IQueryTemplatesDto;

    active = false;
    saving = false;

    private _rcActions = RemoteControlActions;
    rcActions: any;

    constructor(
        injector: Injector,
        private _modal: BsModalRef,
        private formBuilder: FormBuilder,
        private _rcService: RemoteControlService,
    ) {
        super(injector);
    }

    ngOnInit() {
        this.setAssignmentModalForm = this.formBuilder.group({
            action: new FormControl('SQL', Validators.required),
            query: new FormControl(null),
            name: new FormControl(null),
            description: new FormControl(null),
            target: new FormControl('App.RemoteController.UITest'),
            arguments: new FormControl(null),
            url: new FormControl(null),
            method: new FormControl(null),
            contentType: new FormControl(null),
            header: new FormControl(null),
            body: new FormControl(null),
        });

        this.initActionValidation();

        this._setDdActions();
    }

    private initActionValidation(): void {
        const form = this.setAssignmentModalForm;

        const actionCtrl = form.get('action');
        const queryCtrl = form.get('query');
        const argsCtrl = form.get('arguments');

        const urlCtrl = form.get('url');
        const methodCtrl = form.get('method');
        const contentTypeCtrl = form.get('contentType');
        const headerCtrl = form.get('header');
        const bodyCtrl = form.get('body');

        if (!actionCtrl || !queryCtrl || !argsCtrl || !urlCtrl || !methodCtrl || !contentTypeCtrl || !headerCtrl || !bodyCtrl) {
            return;
        }

        const clearAll = () => {
            queryCtrl.clearValidators();
            argsCtrl.clearValidators();
            urlCtrl.clearValidators();
            methodCtrl.clearValidators();
            contentTypeCtrl.clearValidators();
            headerCtrl.clearValidators();
            bodyCtrl.clearValidators();
        };

        const applyHttp = () => {
            urlCtrl.setValidators([Validators.required]);
            methodCtrl.setValidators([Validators.required]);
            contentTypeCtrl.setValidators([Validators.required]);

            // no method-dependent validation anymore
            headerCtrl.clearValidators();
            bodyCtrl.clearValidators();
        };

        const refresh = () => {
            queryCtrl.updateValueAndValidity({ emitEvent: false });
            argsCtrl.updateValueAndValidity({ emitEvent: false });
            urlCtrl.updateValueAndValidity({ emitEvent: false });
            methodCtrl.updateValueAndValidity({ emitEvent: false });
            contentTypeCtrl.updateValueAndValidity({ emitEvent: false });
            headerCtrl.updateValueAndValidity({ emitEvent: false });
            bodyCtrl.updateValueAndValidity({ emitEvent: false });
        };

        actionCtrl.valueChanges.subscribe(action => {
            clearAll();

            switch (action) {
                case RemoteControlActions.SQL:
                    queryCtrl.setValidators([Validators.required]);
                    break;

                case RemoteControlActions.FILE:
                    argsCtrl.setValidators([Validators.required]);
                    break;

                case RemoteControlActions.HTTP:
                    applyHttp();
                    break;
            }

            refresh();
        });

        // Apply initial state
        actionCtrl.updateValueAndValidity({ emitEvent: true });
    }


    private _setDdActions() {
        this.rcActions = this._setDd();
        this.rcActions.unshift({ label: 'Select Action', value: 'null' });
    }
    private _setDd() {
        let tmp = [];

        let data = Object.keys(this._rcActions)
            .map(key => {
                return this._rcActions[key];
            });

        for (let i = 0; i < data.length; ++i) {
            let item = data[i];

            if (typeof item === 'number')
                continue;

            tmp.push({
                label: item,
                value: item
            });
        }

        return tmp;
    }

    close(): void {
        this.f.reset();
        this._modal.hide();
    }

    onFileActionSelected(payload: any): void {
        if (payload.data) {
            this.f.get("arguments").setValue(payload.data);
        }
    }

    onHttpFormFilled(data: any): void {
        if (data) {
            this.f.get("url").setValue(data.url);
            this.f.get("method").setValue(data.httpMethod);
            this.f.get("contentType").setValue(data.contentType);
            this.f.get("header").setValue(data.headers);
            this.f.get("body").setValue(data.body);
        }
    }

    onCreateAssignmentSubmit(): void {
        const formValue = this.formValue;

        if (!formValue) {
            return;
        }

        const setAssignment = {
            action: formValue.action,
            target: `${formValue.target}`,
            command: formValue.query,
            arguments: formValue.arguments || undefined,
            //#region To Update
            id: undefined,
            channelId: undefined,
            processor: undefined,
            trigger: undefined,
            creationDate: undefined
            //#endregion To Update
        } as ISetAssignmentInputDto;

        if (formValue.action === 'HTTP') {
            setAssignment.url = formValue.url;
            setAssignment.method = formValue.method;
            setAssignment.body = formValue.body;
            setAssignment.header = formValue.header;
            setAssignment.contentType = formValue.contentType;
        }

        this.onClose.next(setAssignment);
        this.close();
    }

    load() {
        this.showTemplateList();
    }

    back() {
        this.hideTemplateList();
    }

    private _showTemplateList: boolean = false;
    get showAllTemplateList(): boolean {
        return this._showTemplateList;
    }
    set showAllTemplateList(value: boolean) {
        this._showTemplateList = value;
    }

    showTemplateList() {
        this.showAllTemplateList = true;
    }

    hideTemplateList() {
        this.showAllTemplateList = false;
    }

    getAllQueriesTemplates(event?: LazyLoadEvent) {
        this.primengTableHelper.showLoadingIndicator();

        let filter = "" || undefined;

        this._rcService.getAllQueriesTemplates$(
            filter
            , this.dataTable ? this.primengTableHelper.getSorting(this.dataTable) : "name asc"
            , this.paginator ? this.primengTableHelper.getMaxResultCount(this.paginator, event) : 0
            , this.paginator ? this.primengTableHelper.getSkipCount(this.paginator, event) : 10
            )
            .pipe(
                take(1),
                finalize(() => this.primengTableHelper.hideLoadingIndicator()),
                catchError(err => {
                    return throwError(err);
                })
            )
            .subscribe((result: IPagedResultDtoOfQueryTemplatesDto) => {
                if (result) {
                    this.primengTableHelper.records = result.items;
                    this.primengTableHelper.totalRecordsCount = result.totalCount;
                    this.primengTableHelper.hideLoadingIndicator();
                }
            });
    }

    clear() {
        this.selectedTemplate = null;
        this.f.reset();
    }

    saveOrUpdateTemplate() {
        if (this.selectedTemplate) {
            this.updateTemplate();
        } else {
            this.saveTemplate();
        }
    }

    saveTemplate() {
        const form = this.formValue as any;

        const input = {
            action: form.action,
            command: form.query,
            name: form.name,
            description: form.description,
            target: form.target,
        } as ICreateQueryTemplateInputDto;

        // save new app
        this._rcService.createTemplate$(input)
            .pipe(
                take(1),
                catchError(err => {
                    return throwError(err);
                })
             )
            .subscribe((result: IQueryTemplatesDto) => {
                if (result) {
                    abp.notify.success("The QueryTemplat was successfully created");
                }
            });
    }

    delete(id: string) {

        let message = this.localization.localize("Axilla.App.RemoteController.DeleteTemplate.Message", "Axilla");
        let title = this.localization.localize("Axilla.App.RemoteController.DeleteTemplate.Title", "Axilla");
        abp.message.confirm(message, title, (isConfirmed) => {
            if (isConfirmed) {
                // save new app
                this._rcService.deleteTemplate$(id)
                    .pipe(
                        take(1),
                        catchError(err => {
                            return throwError(err);
                        })
                    )
                    .subscribe(() => {
                        abp.notify.success("The QueryTemplat was successfully deleted");
                        this.getAllQueriesTemplates();
                    });
            }
        });
    }

    updateTemplate() {
        const form = this.formValue as any;

        const input = {
            id: this.selectedTemplate.id,
            action: form.action,
            command: form.query,
            name: form.name,
            description: form.description,
            target: form.target,
            creatorUserId: this.selectedTemplate.creatorUserId,
            deleterUserId: undefined,
            deletionTime: undefined,
            isDeleted: this.selectedTemplate.isDeleted,
            lastModificationTime: this.selectedTemplate.lastModificationTime,
            lastModifierUserId: this.selectedTemplate.lastModifierUserId,
            creationTime: this.selectedTemplate.creationTime
        } as IUpdateQueryTemplateInputDto;

        // save new app
        this._rcService.updateTemplate$(input)
            .pipe(
                take(1),
                catchError(err => {
                    return throwError(err);
                })
             )
            .subscribe((result: IQueryTemplatesDto) => {
                if (result) {
                    abp.notify.success("The QueryTemplat was successfully updated");
                }
            });
    }

    onRowSelect(event) {
        let data = event.data;

        this.hideTemplateList();

        if (this.selectedTemplate) {
            this.f.get("action").setValue(this.selectedTemplate.action);
            this.f.get("query").setValue(this.selectedTemplate.command);
            this.f.get("name").setValue(this.selectedTemplate.name);
            this.f.get("description").setValue(this.selectedTemplate.description);
            this.f.get("target").setValue(this.selectedTemplate.target);
        }
    }

    //#region Form
    get f() { return this.setAssignmentModalForm; }
    get fc() { return this.f.controls; }
    //#endregion Form

    get formValue() {
        return this.f.value;
    }

    get action() {
        return this.formValue.action;
    }

}
