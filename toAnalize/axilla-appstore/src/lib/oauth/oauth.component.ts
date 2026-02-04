import {Component, OnInit} from "@angular/core";
import {ActivatedRoute, Router} from "@angular/router";
import {take, catchError, finalize} from "rxjs/operators";
import {
    AppServiceBaseServiceProxy,
    IChannelDefinitionDto,
    ICreateNewChannelInput
} from "../shared/service-proxies/service-proxies";

import {throwError} from "rxjs";
import {NgxSpinnerService} from "ngx-spinner";

@Component({
    templateUrl: './oauth.component.html',
    styleUrls: ['./oauth.component.less'],
    selector: 'oauth'
})
export class OauthComponent implements OnInit {

    constructor(private route: ActivatedRoute,
                private readonly _appServiceBase: AppServiceBaseServiceProxy,
                private router: Router,
                private spinner: NgxSpinnerService
    ) {

    }

    ngOnInit(): void {
        this.route.queryParams
            .pipe(take(1))
            .subscribe(params => {
                const token = params['code'];
                const appId = params['state'];
                if (!token) {
                    throw new Error("token was not received");
                }

                const createChannel = {
                    code: token,
                    installedAppGuid: appId,
                    password: undefined,
                    username: undefined,
                    oauthArguments: undefined,
                    domain: undefined
                } as ICreateNewChannelInput;

                this._appServiceBase.createChannel(createChannel)
                    .pipe(
                        take(1),
                        catchError((err) => {
                            return throwError(err);
                        }),
                        finalize(() => {
                            this.spinner.hide();
                        })
                    )
                    .subscribe((channelDefinition: IChannelDefinitionDto) => {
                        this.spinner.hide();
                        this.router.navigate(['app/appstore/app-detail/detail/' + appId]);
                    });
            });

        setTimeout(() => {
            this.spinner.show();
        });
    }
}
