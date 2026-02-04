import { Injectable, Injector } from '@angular/core';
import { Router } from '@angular/router';
import ZebraBrowserPrintWrapper from './zebra-browser-print-wrapper';

@Injectable({
    providedIn: 'root',
})
export class ZebraService {
    selected_device: any;
    devices = [];

    constructor(injector: Injector,
    ) {
    }

    private create() {
      return new ZebraBrowserPrintWrapper();
    }

    async print(data: any)  {
        try {

          debugger;
            // Create a new instance of the object
            const browserPrint = this.create();

            // Select default printer
            const defaultPrinter = await browserPrint.getDefaultPrinter();

            // Set the printer
            browserPrint.setPrinter(defaultPrinter);

            // Check printer status
            const printerStatus = await browserPrint.checkPrinterStatus();

            // Check if the printer is ready
            if (printerStatus.isReadyToPrint) {

                browserPrint.print(data);
            } else {
                console.log("Error/s", printerStatus.errors);
            }
        } catch (error) {
            if (error.message.includes("Failed to fetch")) {
                throw new Error("Missing default printer, please check");
            }
            throw new Error(error);
        }
    };

    async printFromBase64(data: any) {
        try {
            let output = atob(data);
            if (output) {
                // Create a new instance of the object
                const browserPrint = this.create();

                // Select default printer
                const defaultPrinter = await browserPrint.getDefaultPrinter();

                // Set the printer
                browserPrint.setPrinter(defaultPrinter);

                // Check printer status
                const printerStatus = await browserPrint.checkPrinterStatus();

                // Check if the printer is ready
                if (printerStatus.isReadyToPrint) {
                    browserPrint.print(output);
                } else {
                    console.log("Error/s", printerStatus.errors);
                }
            } else {
                console.log("Error/s", "Check input ", data);
            }
        } catch (error) {
            if (error.message.includes("Failed to fetch")) {
                throw new Error("Missing default printer, please check");
            }
            throw new Error(error);
        }
    };

}
