import {Injectable, Injector} from '@angular/core';

import {take, tap, takeUntil, catchError} from 'rxjs/operators';
import {BehaviorSubject, Observable, of, throwError} from 'rxjs';

import * as _ from 'lodash';
import dayjs from 'dayjs';

import {
  IDescribeImageInputDto,
  IDescribeImageOutputDto,
  IDescribeImageTasksInputDto,
  ImageDescriptionServiceProxy,
  IStartImageProcessingOutputDto
} from "../../../shared";
import {LazyLoadEvent} from "primeng/api";


@Injectable({
  providedIn: 'root'
})
export class DescribeImageService {

  private _isLoading$: BehaviorSubject<boolean>;
  private _base64Search$: BehaviorSubject<string>;

  private _isFileUploadOpened$: BehaviorSubject<boolean>;
  private _imagePreview$: BehaviorSubject<string>;

  protected imageDescriptionServiceProxy: ImageDescriptionServiceProxy;

  constructor(injector: Injector) {
    this.imageDescriptionServiceProxy = injector.get(ImageDescriptionServiceProxy);

    this.initialization();
  }

  private initialization() {
    this._base64Search$ = new BehaviorSubject<string>('');

    this._isLoading$ = new BehaviorSubject<boolean>(false);

    this._isFileUploadOpened$ = new BehaviorSubject<boolean>(false);
    this._imagePreview$ = new BehaviorSubject<string>(undefined);
  }

  flush() {
    this.clearImageForPreview();
  }

  //#region base64 Search
  setBase64Search(filterValue: string)  {
    this._base64Search$.next(filterValue);
  }
  get base64Search$(): Observable<string> {
    return this._base64Search$.asObservable();
  }
  get base64Search(): string {
    return this._base64Search$.getValue();
  }
  private _resetBase64SearchQuery() {
    this._base64Search$.next(undefined);
  }
  //#endregion base64 Search

  //#region IsLoading
  get isLoading$(): Observable<boolean> {
    return this._isLoading$.asObservable();
  }
  showLoadingIndicator() {
    this._isLoading$.next(true);
  }
  hideLoadingIndicator() {
    this._isLoading$.next(false);
  }
  get isLoading(): boolean {
    return this._isLoading$.getValue();
  }
  //#endregion

  //#region File Upload

  get isFileUploadOpened(): boolean {
    return this._isFileUploadOpened$.getValue();
  }

  private openFileUploadModal() {
    this._isFileUploadOpened$.next(true);
  }
  private closeFileUploadModal() {
    this._isFileUploadOpened$.next(false);
  }

  forceCloseFileUploadModal() {
    this.closeFileUploadModal();
  }

  toggleFileUpload() {
    if (this.isFileUploadOpened) {
      this.closeFileUploadModal();
    } else {
      this.openFileUploadModal();
    }
  }

  get imagePreview$(): Observable<string> {
    return this._imagePreview$.asObservable();
  }
  get imagePreview(): string {
    return this._imagePreview$.getValue();
  }
  setImageForPreview(value: string) {
    this._imagePreview$.next(value);
  }
  setImageForPreviewAndRunSearch(value: string) {
    this.setImageForPreview(value);

    this.beginImageSearch();
  }

  clearImageForPreview(changeViewMode: boolean = true) {
    this._imagePreview$.next(undefined);
  }

  beginImageSearch() {
    this.setBase64Search(this.imagePreview);
  }

  async convertImageToBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl);
    const blob = await response.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => resolve(reader.result as string);
    });
  }

  //#endregion  File Upload



  startImageProcessing$(event?: LazyLoadEvent): Observable<IStartImageProcessingOutputDto> {

    let input = {

    } as IDescribeImageTasksInputDto;

    return this.imageDescriptionServiceProxy.startImageProcessing(input)
      .pipe(
        catchError(err => {
          return throwError(err);
        }),
        tap((result: IStartImageProcessingOutputDto) => {
          console.log(result);
        })
      );
  }


}

