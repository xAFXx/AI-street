import {AppComponentBase} from "@axilla/axilla-shared";
import {AppStorePermissions} from "../permissions/shared-permissions";

export class AppAppComponentBase extends AppComponentBase {
  appPermission() : AppStorePermissions{
    return AppStorePermissions;
  }
}
