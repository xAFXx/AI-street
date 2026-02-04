import { Injectable } from '@angular/core';

import {
  ICreateQueryTemplateInputDto,
  IPagedResultDtoOfQueryTemplatesDto,
  IPopAssignmentInputDto,
  IQueryTemplatesDto,
  ISetAssignmentInputDto,
  ISetAssignmentOutputDto, IUpdateQueryTemplateInputDto,
  RemoteControlServiceProxy
} from '../../../shared';

import { tap } from "rxjs/operators";
import { Observable } from "rxjs";

@Injectable()
export class RemoteControlService {

    constructor(
        private _rcService: RemoteControlServiceProxy,
    ) {
    }

    getAllQueriesTemplates$(
        filter: string | undefined
        , sorting: any
        , skipCount: any
        , maxResultCount: any
        ): Observable<IPagedResultDtoOfQueryTemplatesDto> {

        return this._rcService.getPagedResultQueryTemplate(
            filter || undefined,
            sorting || "",
            skipCount || 0,
            maxResultCount || 10
        ).pipe(
            tap((result: IPagedResultDtoOfQueryTemplatesDto) => {

            })
        );
    }

    deleteTemplate$(input: string): Observable<void> {
        return this._rcService.delete(input)
            .pipe(
                tap(() => {

                })
            );
    }

    createTemplate$(input: ICreateQueryTemplateInputDto): Observable<IQueryTemplatesDto> {
        return this._rcService.create(input)
            .pipe(
                tap((result: IQueryTemplatesDto) => {

                })
            );
    }

    updateTemplate$(input: IUpdateQueryTemplateInputDto): Observable<IQueryTemplatesDto> {
        return this._rcService.update(input)
            .pipe(
                tap((result: IQueryTemplatesDto) => {

                })
            );
    }

    setAssignment$(input: ISetAssignmentInputDto): Observable<ISetAssignmentOutputDto> {
        return this._rcService.setAssignment(input)
            .pipe(
                tap((result: ISetAssignmentOutputDto) => {

                })
            );
    }

    popAssignment$(input: IPopAssignmentInputDto): Observable<string> {
        return this._rcService.popAssignment(input)
            .pipe(
                tap((result: string) => {

                })
            );
    }
}
