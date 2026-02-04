
import {VDBView} from "./vdb-view-permissions";

export class VDB {

  static readonly _ = 'Pages.App.VDB';
  static readonly Create = 'Pages.App.VDB.Create';

  static get VDBViewPermission() : typeof VDBView {
    return VDBView;
  }
}


