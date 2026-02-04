import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {LocalizeAxillaAppVDBPipe} from '../pipes/localizeAxillaAppVDB.pipe';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [],
  declarations: [
    LocalizeAxillaAppVDBPipe
  ],
  exports: [
    LocalizeAxillaAppVDBPipe
  ]
})
export class AppVDBUtilsModule {
}
