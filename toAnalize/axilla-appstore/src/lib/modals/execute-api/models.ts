import {IApiCallHeaderesDto} from "../../shared";

export interface DataLookup {
    id: string;
    value: string;
    name: string;
}

export interface IExtendedApiCallHeadersDto extends IApiCallHeaderesDto {
    headerResolvedValue?: string;
}

export type StringifiedHeadersDictionary = Record<string, string>;
