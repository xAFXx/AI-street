import {
  Component,
  ViewEncapsulation,
  Injector,
  OnInit,
  ViewChild, ElementRef
} from "@angular/core";
import {AppComponentBase, appModuleAnimation} from "@axilla/axilla-shared";

import {Router} from "@angular/router";
import {BsModalService, BsModalRef} from "ngx-bootstrap/modal";
//import {SetAssignmentModalComponent} from "./modals/set-assignment-modal.component";
import {take, catchError, takeUntil, repeat, delay, takeWhile} from "rxjs/operators";
import {throwError, Subject, combineLatest} from "rxjs";

import {JsonEditorComponent, JsonEditorOptions} from "ang-jsoneditor";
import {
  IStartImageProcessingOutputDto
} from "../../shared";
import {DescribeImageModalComponent} from "./modals/describe-image-modal.component";
import {DescribeImageService} from "./services/describe-image.service";

declare let abp: any;

@Component({
  selector: 'app-rc',
  templateUrl: './image-description.component.html',
  styleUrls: ['./image-description.component.less'],
  encapsulation: ViewEncapsulation.None,
  animations: [appModuleAnimation()]
})

export class ImageDescriptionComponent extends AppComponentBase implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef;

  destroy$ = new Subject<boolean>();

  //#region Editor
  @ViewChild(JsonEditorComponent, {static: true}) editor: JsonEditorComponent;

  editorOptions: JsonEditorOptions;
  //#endregion Editor

  isLoading: boolean = false;
  //application creation modal

  isHovering = false;
  startPictureLoading = false;
  uploadError: string | null = null;

  get isFileUploadOpened(): boolean {
    return this.describeImageService.isFileUploadOpened;
  }

  public _describeImageModal$: BsModalRef;

  protected describeImageService: DescribeImageService;

  constructor(injector: Injector,
              private readonly modalService: BsModalService,
  ) {
    super(injector);

    this.editorOptions = new JsonEditorOptions();

    this.describeImageService = injector.get(DescribeImageService);
  }

  ngOnInit(): void {
    this.editorOptions.modes = ['tree', 'code'];

    this._initSubscriptions();
  }


  private _initSubscriptions() {

    this.describeImageService.isLoading$
      .pipe(
        takeUntil(this.destroy$), // Automatically unsubscribes when destroy$ emits
      )
      .subscribe((isLoading: boolean) => {
        setTimeout(() => this.isLoading = isLoading, 0);
      });

    combineLatest([
      this.describeImageService.base64Search$
    ])
      .pipe(
        takeUntil(this.destroy$)
      )
      .subscribe(([base64Search]) => {
          this.startImageProcessing();
      });

  }


  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }



  toggleFileUpload() {
    this.describeImageService.toggleFileUpload();
  }
  forceCloseFileUpload() {
    this.describeImageService.forceCloseFileUploadModal();
  }

  onImageSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.handleFile(file);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isHovering = false;
    const file = event.dataTransfer?.files[0];
    this.handleFile(file);
  }

  handleFile(file?: File) {
    if (!file) {
      return;
    }
    this.startPictureLoading = true;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff', 'image/webp'];

    if (allowedTypes.indexOf(file.type) === -1) {
      this.uploadError = 'Upload failed. Supported filetypes: .jpg, .png, .tiff, or .webp';
      this.describeImageService.clearImageForPreview();
      return;
    }

    this.uploadError = null;
    const reader = new FileReader();
    reader.onload = () => {
      this.describeImageService.setImageForPreviewAndRunSearch(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isHovering = true;
  }

  onDragLeave() {
    this.isHovering = false;
  }

  openFileDialog() {
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    if (fileInput) {
      fileInput.click();
    }
  }

  protected closeFileDialog() {
    this.toggleFileUpload();
  }

  protected focusInput() {
    this.searchInput.nativeElement.focus();
  }

  //open madal to add an application
  describe(): void {
    //this._clear();

    this._describeImageModal$ = this.modalService.show(DescribeImageModalComponent,
      {
        class: 'w-80'
      });
    let describeImageModal = this._describeImageModal$.content as DescribeImageModalComponent;

    describeImageModal.onClose
      .pipe(
        take(1)
      ).subscribe((input: string) => {
        if (!input) {
          abp.notify.error(this.l('ThereIsNoViewConfigurationForX'));
        }
    });
  }

  private _clear() {
    this.isLoading = false;
  }


  startImageProcessing() {
    this.describeImageService.startImageProcessing$()
      .pipe(
        takeUntil(this.destroy$),
      )
      .subscribe((result: IStartImageProcessingOutputDto)=>{

      })
  }


  getAssignmentResult() {
    // const input  = {
    //   contains: this.lastAssignmentId || undefined,
    //   key: this.lastAssignmentKey || undefined
    // } as IPopAssignmentInputDto;

    // this._rcService.popAssignment$(input)
    //   .pipe(
    //     delay(5000),
    //     takeUntil(this.destroy$), // Stop if component is destroyed
    //     takeWhile(result => this._isEmpty(result), true), // Repeat only while the result is empty
    //     repeat(), // Keep repeating the request until takeWhile stops it
    //   ).subscribe({
    //   next: (result: string) => {
    //     if(result) {
    //       this.openedValue = JSON.parse(result);
    //       this.isLoading = false;
    //
    //       this.destroy$.next(true);
    //     }
    //   },
    //   error: (err) => {
    //     console.error('Error occurred:', err);
    //   }
    // });
  }

  private _isEmpty(value: any): boolean {
    if(!value) {
      return true;
    }

    if (typeof value === 'string') {
      return value === '';
    }

    if (typeof value === 'object' && value !== null) {
      return Object.keys(value).length === 0;
    }

    return false;
  }

}
