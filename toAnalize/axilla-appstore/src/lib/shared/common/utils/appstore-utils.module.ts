import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';

import {SanitizeHtmlPipe} from "../pipes/sanitizeHtml";
import {KeysPipe} from "../pipes/keysPipe";
import {LocalizeAxillaAppBasePipe} from '../pipes/localizeAxillaAppBase.pipe';
import {AppPostNLUtilsModule} from '../../../apps/postnl/common/utils/postnl-utils.module';
import {AppVDBUtilsModule} from '../../../apps/vdb/common/utils/vdb-utils.module';


@NgModule({
  imports: [
    CommonModule,
    AppVDBUtilsModule
  ],
  providers: [
    AppPostNLUtilsModule,
  ],
  declarations: [
    LocalizeAxillaAppBasePipe,
    KeysPipe,
    SanitizeHtmlPipe,
  ],
  exports: [
    LocalizeAxillaAppBasePipe,
    AppVDBUtilsModule,
    KeysPipe,
    SanitizeHtmlPipe,
  ]
})
export class AppStoreUtilsModule {
}
