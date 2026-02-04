import {IAppAssignmentListDto} from "../../../shared";

export interface InstalledApp extends IAppAssignmentListDto {
  gateway: boolean;
}
