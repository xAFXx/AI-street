import { Component, Injector, ViewChild } from '@angular/core';
import { ProfileServiceProxy } from '@shared/service-proxies/service-proxies';
import { AppComponentBase, accountModuleAnimation } from '@axilla/axilla-shared';
import { LoginService } from './login.service';
import { ReCaptcha2Component } from 'ngx-captcha';
import { AppConsts } from '@shared/AppConsts';

@Component({
  selector: 'app-session-lock-screen',
  templateUrl: './session-lock-screen.component.html',
  animations: [accountModuleAnimation()]
})
export class SessionLockScreenComponent extends AppComponentBase {
  @ViewChild('recaptchaRef') recaptchaRef: ReCaptcha2Component;

  recaptchaSiteKey: string = AppConsts.recaptchaSiteKey;

  userInfo: any;
  captchaResponse?: string;
  submitting = false;

  constructor(
    injector: Injector,
    private _profileService: ProfileServiceProxy,
    public loginService: LoginService) {
    super(injector);
    this.getLastUserInfo();
  }

  getLastUserInfo(): void {
    let cookie = abp.utils.getCookieValue('userInfo');
    if (!cookie) {
      location.href = '';
    }

    let userInfo = JSON.parse(cookie);
    if (!userInfo) {
      location.href = '';
    }
    this.loginService.authenticateModel.userNameOrEmailAddress = userInfo.userName;
    this.userInfo = {
      userName: userInfo.userName,
      tenant: userInfo.tenant,
      profilePicture: ''
    };

    if (userInfo.profilePictureId) {
      this._profileService.getProfilePictureById(userInfo.profilePictureId)
        .subscribe(
          (data) => {
            if (data.profilePicture) {
              this.userInfo.profilePicture = 'data:image/jpeg;base64,' + data.profilePicture;
            } else {
              this.userInfo.profilePicture = AppConsts.appBaseUrl + '/assets/common/images/default-profile-picture.png';
            }
          },
          () => {
            this.userInfo.profilePicture = AppConsts.appBaseUrl + '/assets/common/images/default-profile-picture.png';
          });
    } else {
      this.userInfo.profilePicture = AppConsts.appBaseUrl + '/assets/common/images/default-profile-picture.png';
    }
  }

  login(): void {
    if (this.useCaptcha && !this.captchaResponse) {
      this.message.warn(this.l('CaptchaCanNotBeEmpty'));
      return;
    }

    this.showMainSpinner();

    this.submitting = true;
    this.loginService.authenticate(
      () => {
        this.submitting = false;
        this.hideMainSpinner();

        if (this.recaptchaRef) {
          this.recaptchaRef.resetCaptcha();
        }
      },
      null,
      this.captchaResponse
    );
  }

  get useCaptcha(): boolean {
    return this.setting.getBoolean('App.UserManagement.UseCaptchaOnLogin');
  }
}
