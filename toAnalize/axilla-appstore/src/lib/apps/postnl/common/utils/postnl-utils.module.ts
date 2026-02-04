import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {LocalizeAxillaAppPostNLPipe} from '../pipes/localizeAxillaAppPostNL.pipe';

@NgModule({
  imports: [
    CommonModule
  ],
  providers: [],
  declarations: [
    LocalizeAxillaAppPostNLPipe,
  ],
  exports: [
    LocalizeAxillaAppPostNLPipe,
  ]
})
export class AppPostNLUtilsModule {
}
