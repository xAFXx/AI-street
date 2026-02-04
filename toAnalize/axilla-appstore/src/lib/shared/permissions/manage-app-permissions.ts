import {App} from "./manage-app/app-permissions";
import {ApiCall} from "./manage-app/api-call-permissions";
import {ProcessorExecution} from "./manage-app/processor-execution-permissions";
import {ManageSettings} from "./manage-app/manage-settings-permissions";

export class ManageApp {
  static readonly _ = 'Pages.App.ManageApp';

  static get AppPermission() : typeof App {
    return App;
  }

  static get ApiCallPermission() : typeof ApiCall {
    return ApiCall;
  }

  static get ProcessorExecutionPermission() : typeof ProcessorExecution {
    return ProcessorExecution;
  }
  static get ManageSettingsPermission() : typeof ManageSettings {
    return ManageSettings;
  }
}

