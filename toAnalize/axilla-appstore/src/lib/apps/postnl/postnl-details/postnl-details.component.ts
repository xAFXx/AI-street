import {Component, OnInit, Injector, ViewChild, OnDestroy} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Table} from 'primeng/table';
import {Paginator} from 'primeng/paginator';
import {FormGroup, FormControl} from '@angular/forms';

import {
  VDBServiceProxy,
  AppServiceBaseServiceProxy,
  IPagedResultDtoOfVirtualDbRowDto,
  ISaveToVirtualDbInput,
  IApplicationJobArgsInput
} from "../../../shared/service-proxies/service-proxies";

import {LazyLoadEvent} from 'primeng/api';
import {appModuleAnimation, AppComponentBase, PrimengTableHelper } from "@axilla/axilla-shared";
import {Subscription} from 'rxjs';

import {debounceTime, concatMap, take, tap} from "rxjs/operators";
import {Subject, Observable} from "rxjs";
import _ from 'lodash';

import {PostnlChangeAmountModalComponent} from './postnl-change-amount-modal/postnl-change-amount-modal.component';
import {ZebraService} from "../common/zebra-printer/zebra.service";

declare let abp: any;

@Component({
  selector: 'app-postnl-details',
  templateUrl: './postnl-details.component.html',
  styleUrls: ['./postnl-details.component.less'],
  animations: [appModuleAnimation()]
})
export class PostNLDetailsComponent extends AppComponentBase implements OnInit, OnDestroy {
  @ViewChild('postnlModal', {static: true}) postnlModal: PostnlChangeAmountModalComponent;
  @ViewChild('dataTable', {static: true}) dataTable: Table;
  @ViewChild('paginator', {static: true}) paginator: Paginator;

  databaseTableHelper: PrimengTableHelper;

  private _dbName = 'PostNL.Orders';

  constructor(
    injector: Injector,
    private _activatedRoute: ActivatedRoute,
    public _postnlService: VDBServiceProxy,
    public _appServiceBase: AppServiceBaseServiceProxy,
    public _zebraPrinter: ZebraService
  ) {
    super(injector);

    this.databaseTableHelper = new PrimengTableHelper();
    this.databaseTableHelper.defaultRecordsCountPerPage = 10;//l
  }

  sourceName: string;
  processorName: string;
  databaseForm: FormGroup;
  openedItem: string;
  openedValue = {};
  $subscriptions: Subscription[] = [];
  countOfPackages: number = 1;
  startingProcessorLabel = abp.localization.localize('Axilla.RunningProcessor', 'Axilla');
  startingPrintingLabel = abp.localization.localize('Axilla.Printing', 'Axilla');

  ngOnInit(): void {
    let subscription = this._appServiceBase.getAllSettings(undefined, undefined).subscribe(result => {
      this.sourceName = result.filter(x => x.name === "App.PostNL.VDB.Source")[0].value;
      this.getVDBRows();

      this.processorName = result.filter(x => x.name === "App.PostNL.DataTransport.Processor")[0].value;
    });
    this.$subscriptions.push(subscription);
    let searchSubscription = this.searchTerm$.subscribe();
    this.$subscriptions.push(searchSubscription);
    this._initDatabaseKeySearchForm();
  }

  ngOnDestroy() {
    this.$subscriptions.forEach(x => x.unsubscribe());
  }

  private readonly searchTerm = new Subject<void>();
  private readonly searchTerm$ = this.searchTerm.asObservable().pipe(
    debounceTime(300),
    concatMap(() => this.getVDBRowsOnPagination$())
  );

  getVDBRowsOnPagination(event?: LazyLoadEvent) {
    if (this.primengTableHelper.shouldResetPaging(event)) {
      this.paginator.changePage(0);
      return;
    }
    this.getVDBRowsOnPagination$(event).pipe(
      take(1)
    ).subscribe();
  }

  private getVDBRowsOnPagination$(event?: LazyLoadEvent): Observable<IPagedResultDtoOfVirtualDbRowDto> {
    this.primengTableHelper.showLoadingIndicator();
    return this._postnlService.getVirtualDbRows(
      this.databaseKey || "",
      this.sourceName,
      undefined,
      undefined,
      undefined,
      false,
      this.databaseTableHelper.getSorting(this.dataTable),
      this.databaseTableHelper.getSkipCount(this.paginator, event) || 0,
      this.databaseTableHelper.getMaxResultCount(this.paginator, event) || this.databaseTableHelper.defaultRecordsCountPerPage
    )
      .pipe(tap((result: IPagedResultDtoOfVirtualDbRowDto) => {
        let items = this._shipmentInfoConverter(result.items);

        let rows = _.map(items, item => {
          return {
            key: item.Key,
            value: JSON.stringify(item),
            disableBtn: false,
            shipmentAvailable: item.ResponseShipments && item.ResponseShipments.length > 0,
            printedLabel: this._getPrintedLabel(item)

          }
        });

        this.databaseTableHelper.records = rows;
        this.databaseTableHelper.totalRecordsCount = result.totalCount;
        this.databaseTableHelper.hideLoadingIndicator();
      }));

  }

  errorDetector(index: number, data: any): boolean {
    let order = JSON.parse(data.value);
    if (order.ResponseShipments && order.ResponseShipments.length > 0 && order.ResponseShipments[index - 1]) {
      let o = order.ResponseShipments[index - 1];

      if (o.Errors && o.Errors.length > 0) {
        return true;
      }
    }
    return false;
  }

  private _getPrintedLabel(item: any) {
    if (item.ResponseShipments && item.ResponseShipments.length > 0) {
      return item.ResponseShipments.length;
    }
    return 0;
  }

  private _saveVdbRow(key: string, data: any) {
    const body = {
      key: key,
      innerObject: data,
      databaseName: this._dbName
    } as ISaveToVirtualDbInput;

    this._postnlService.saveToVirtualDb(body)
      .subscribe(() => {
        abp.notify.success("The row with key '" + this.openedItem + "' was successfully saved!");
      });
  }

  private _shipmentInfoConverter(data: any): any[] {
    let orders = [];
    if (data && data.length > 0) {
      for (let i = 0; i < data.length; i++) {
        let order = JSON.parse(data[i].value);
        if (order.ShipmentInfo) {
          if (order.ShipmentInfo && order.ShipmentInfo?.Errors?.length > 0) {

            if (!order.ResponseShipments) {
              order.ResponseShipments = [];
            }

            if (order.ResponseShipments && order.ResponseShipments.length == 0) {
              order.ResponseShipments.push({'Errors': order.ShipmentInfo.Errors});
            }

          } else if (order.ShipmentInfo && order.ShipmentInfo?.ResponseShipments) {
            order.ResponseShipments = order.ShipmentInfo.ResponseShipments;
          }

          delete order.ShipmentInfo;

          this._saveVdbRow(order.Key, order);
        }
        orders.push(order);
      }
    }

    return orders
  }

  search() {
    this.searchTerm.next();
  }

  openChooseAmountModal() {
    this.postnlModal.show();
  }

  private _initDatabaseKeySearchForm() {
    this.databaseForm = new FormGroup({
      key: new FormControl(null)
    });
  }

  get databaseKey() {
    if (this.databaseForm) {
      return this.databaseForm.get('key').value;
    }
    return '';
  }


  checkIfContainsError(record: any): boolean {
    let value = JSON.parse(record.value);

    if (value.ResponseShipments && value.ResponseShipments.length > 0) {
      for (let i = 0; i < value.ResponseShipments.length; i++) {
        let order = value.ResponseShipments[i];

        if (order && order.Errors.length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  getError(record: any): string {
    let value = JSON.parse(record.value);

    if (value.ResponseShipments && value.ResponseShipments.length > 0) {
      for (let i = 0; i < value.ResponseShipments.length; i++) {
        let order = value.ResponseShipments[i];

        if (order && order.Errors.length > 0) {
          for (let j = 0; j < order.Errors.length; j++) {
            let error = order.Errors[j];
            return `Code: ${error.Code} - ${error?.Description}`;
          }
        }
      }
    }

    return "";
  }


  //Get barcodes from PostNL Order
  getBarcodes(data: any): string {
    let value = JSON.parse(data);

    let barcodes = 'Barcodes: ';

    if (value && value.ResponseShipments && value.ResponseShipments.length > 0) {
      let codes = [];
      for (let i = 0; i < value.ResponseShipments.length; i++) {
        let item = value.ResponseShipments[i];
        if (item.Errors.length > 0) {
          continue;
        }

        codes.push(item.Barcode);
      }

      if (codes.length > 0) {
        return barcodes + codes.join(', ');
      }
    }

    return '';
  }


  //Extract Address information from VDB PostNL Order
  getAddress(data: any): string {
    let value = JSON.parse(data);

    if (value) {
      return `${value.Name} - ${value.Street} ${value.HouseNr} ${value.HouseNrExt} - ${value.Zipcode} ${value.City}`;
    }

    return ``;
  }

  private _labelCounter(order: any): number {
    let count = 0;
    if (order && order.ResponseShipments && order.ResponseShipments.length > 0) {
      for (let i = 0; i < order.ResponseShipments.length; i++) {
        let item = order.ResponseShipments[i];
        if (item.Labels && item.Labels.length > 0 && item.Errors.length == 0) {
          count++;
        }
      }
    }

    return count;
  }


  getVDBRows() {
    this.databaseTableHelper.showLoadingIndicator();
    let subscription = this._postnlService
      .getVirtualDbRows(
        undefined,
        this.sourceName,
        undefined,
        undefined,
        undefined,
        false,
        undefined,
        0,
        this.databaseTableHelper.defaultRecordsCountPerPage)
      .subscribe((result: IPagedResultDtoOfVirtualDbRowDto) => {
        let items = this._shipmentInfoConverter(result.items);

        let rows = _.map(items, item => {
          return {
            key: item.Key,
            value: JSON.stringify(item),
            disableBtn: false,
            shipmentAvailable: item.ResponseShipments && item.ResponseShipments.length > 0,
            printedLabel: this._getPrintedLabel(item)
          }
        });

        this.databaseTableHelper.records = rows;
        this.databaseTableHelper.totalRecordsCount = result.totalCount;
        this.databaseTableHelper.hideLoadingIndicator();

      });
    this.$subscriptions.push(subscription);

  }

  //The function checks what to do when user selects a number of packages. Basically, there are few flows:
  //Case 1: No items were printed yet. The user chooses "2", then two item are being processed and printed
  //Case 2: 2 items were already printed. The user clicks on "3", then 1 new item is being processed and printed
  //Case 3: 2 items were already printed. The user clicks on "2", then the second item is not processing but reprinting
  startProcessor(record: any, countOfPackages: number) {
    let valueInObject = JSON.parse(record.value);

    //get amount of printed labels
    let printedLabels = this._labelCounter(valueInObject);

    // First case: if no items were printed yet, just process and print all of them
    if (!record.value.includes("ResponseShipments")) {
      valueInObject.CountOfPackages = countOfPackages;
    } else {
      // If some labels were already printed, then we are comparing processed labels to requested number
      let processedLables = (valueInObject.ResponseShipments as object[]).length;
      // If wanted quantity of labels is bigger than printed labels, that means that user wants to have few more lables to be processed and printed
      if (countOfPackages > processedLables) {
        let requestedNewPackages = countOfPackages - processedLables;
        valueInObject.CountOfPackages = requestedNewPackages;
      } else {
        //start printing disable btns change state
        this.changeBtnState(record);

        // if the number which the user have chosen is equal or less than printed labels, then we are just reprinting an item within this number
        // First of all, we need to find this item
        let shipments = (valueInObject.ResponseShipments as object[]);
        let wantedShipmentForReprint = _.take(shipments, countOfPackages);
        valueInObject.ResponseShipments = [wantedShipmentForReprint];
        (async () => {
          try {
            await this._parseAndPrint(valueInObject);
            this.changeBtnState(record);
          } catch (e) {
            this.changeBtnState(record);
            abp.message.error(e);
            throw new Error(e);
          }
        })();
        return;
      }
    }

    delete valueInObject.ResponseShipments;
    const count = valueInObject.CountOfPackages;
    delete valueInObject.CountOfPackages;
    let value = JSON.stringify(valueInObject);

    this.changeBtnState(record);

    let jobBody = {
      processorDefinitionId: this.processorName,
      appName: `PostNL-${record.key}`
    } as IApplicationJobArgsInput;

    //detecting how many times we need interate for packages
    if (count > 1) {
      let values = `${value}`;
      for (let i = 1; i < count; i++) {
        values += `, ${value}`;
      }
      jobBody.valueToStart = "[" + values + "]";
    } else {
      jobBody.valueToStart = "[" + value + "]";
    }

    let subscription = this._appServiceBase.startJobWithResult(jobBody)
      .subscribe((result: any) => {
        try {
          if (result && result?.result) {

            if (result?.result instanceof Array) {
              let orders = result?.result;
              for (let i = 0; i < orders.length; i++) {
                let order = orders[i];
                (async () => {
                  try {
                    await this._parseAndPrint(order);
                    this.updateRecord(record, order);
                    this.changeBtnState(record);

                    this.getVDBRowsOnPagination();
                  } catch (e) {
                    this.updateRecord(record, order);
                    this.changeBtnState(record);
                    abp.message.error(e);
                  }
                })();
              }
            }
          } else {
            this.changeBtnState(record);
          }
        } catch (error) {
          this.changeBtnState(record);
          this.getVDBRowsOnPagination();
        }
      });
    this.$subscriptions.push(subscription);
  }

  printShipmentInfo(record: any) {
    try {
      let value = record.value;
      this.changeBtnState(record);
      (async () => {
        try {
          await this._parseAndPrint(value);
          this.changeBtnState(record);
        } catch (e) {
          this.changeBtnState(record);
          abp.message.error(e);
        }
      })();
    } catch (e) {
      this.changeBtnState(record);
    }
  }

  changeBtnState(record: any) {
    record.disableBtn = !record.disableBtn;
  }

  updateRecord(record: any, recordValue: any) {
    //record.value = JSON.stringify(recordValue);
    record.shipmentAvailable = true;
  }

  checkIfBtnDisabled(): boolean {
    let disabled = _.some(this.databaseTableHelper.records, ['disableBtn', true]);
    if (disabled) {
      return true;
    }

    return false;
  }

  private async _parseAndPrint(data: any) {
    try {
      if (data && data?.ShipmentInfo) {
        const shipmentInfo = data.ShipmentInfo;
        await this._checkAndPrint(shipmentInfo);
      } else if (data && data?.ResponseShipments) {
        await this._checkAndPrint(data);
      } else if (typeof data === 'object') {
        await this._checkAndPrint(data);
      } else {
        let parsedData = JSON.parse(data);
        if (parsedData && parsedData.ShipmentInfo) {
          await this._checkAndPrint(parsedData.ShipmentInfo);
        }
      }
    } catch (e) {
      throw new Error(e);
    }
  }

  private async _checkAndPrint(data: any) {
    try {
      if (data && data?.Errors?.length > 0) {
        abp.message.error(data?.Errors[0].Description, data?.Errors[0].Error);
        return;
      }

      if (data && data?.ResponseShipments) {
        const responseShipments = data.ResponseShipments;
        for (let i = 0; i < responseShipments.length; i++) {
          const item = responseShipments[i];
          if (item && item?.Labels) {
            const labels = item?.Labels;
            for (let j = 0; j < labels.length; j++) {
              const label = labels[j];
              if (label && label?.Content) {
                const content = label?.Content;
                //Start Printing Procedure
                await this._zebraPrinter.printFromBase64(content);
              }
            }
          } else if (item && item.length > 0) {
            for (let j = 0; j < item.length; j++) {
              const labels = item[j]?.Labels;
              if (labels && labels.length > 0) {
                for (let k = 0; k < labels.length; k++) {
                  const label = labels[k];

                  if (label && label?.Content) {
                    const content = label?.Content;
                    //Start Printing Procedure
                    await this._zebraPrinter.printFromBase64(content);
                  }
                }
              }
            }
          }
        }
      } else if (data && data?.Barcode) {

        for (let k = 0; k < data.Labels.length; k++) {
          const label = data.Labels[k];

          if (label && label?.Content) {
            const content = label?.Content;
            //Start Printing Procedure
            await this._zebraPrinter.printFromBase64(content);
          }
        }
      }
    } catch (e) {
      throw new Error(e);
    }
  }

}
