import { ManageApp } from "./manage-app-permissions";
import {CustomLinks} from "./apps/custom-links/custom-links-permissions";
import {VDB} from "./apps/vdb/vdb-permissions";

export class AppStorePermissions{

  static readonly _ = 'Pages.App';

  static get ManageAppPermission() : typeof ManageApp {
    return ManageApp;
  }

  static get CustomLinksPermission() : typeof CustomLinks {
    return CustomLinks;
  }

  static get VDBPermission() : typeof VDB {
    return VDB;
  }
}
