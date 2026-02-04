import {
  Component,
  Injector,
  OnInit,
  Input
} from '@angular/core';

import {AppComponentBase} from '@axilla/axilla-shared';

import {BsModalRef} from 'ngx-bootstrap/modal';
import {Subject} from 'rxjs';
import {
  FormGroup,
  FormControl,
  Validators,

  AbstractControl
} from '@angular/forms';

import {AbpSessionService} from 'abp-ng2-module';
import {AuthenticationMethod, ICreateApiConnectionSettingDto} from "../../../shared";

@Component({
  selector: 'create-api-connection-setting-modal',
  templateUrl: './create-api-connection-setting-modal.component.html',
  styleUrls: ['create-api-connection-setting-modal.component.less']
})
export class CreateApiConnectionSettingModalComponent extends AppComponentBase implements OnInit {
  apiConnectionSettingModalForm: FormGroup;

  oauth2ModalForm: FormGroup;
  bearerModalForm: FormGroup;
  smtpModalForm: FormGroup;
  pureHttpModalForm: FormGroup;
  nTLMModalForm: FormGroup;
  iMAPModalForm: FormGroup;

  create = new Subject<ICreateApiConnectionSettingDto>();
  @Input() apiDefinitionId: string;
  @Input() authentication: AuthenticationMethod;

  fieldTextType: boolean;
  fieldTextTypeSecondaryPassword: boolean;

  constructor(
    injector: Injector,
    private _modal: BsModalRef,
    private _session: AbpSessionService
  ) {
    super(injector);
  }

  ngOnInit(): void {
    this.initForm();
  }

  get isBearer(): boolean {
    return this.authentication === AuthenticationMethod.Bearer;
  }

  get isCustomAuth(): boolean {
    return this.authentication === AuthenticationMethod.CustomAuth;
  }

  get isOauth2(): boolean {
    return this.authentication === AuthenticationMethod.Oauth2;
  }

  get isSmtp(): boolean {
    return this.authentication === AuthenticationMethod.Smtp;
  }

  get isPureHttp(): boolean {
    return this.authentication === AuthenticationMethod.PureHttp;
  }

  get isNTLM(): boolean {
    return this.authentication === AuthenticationMethod.NTLM;
  }

  get isIMAP(): boolean {
    return this.authentication === AuthenticationMethod.IMAP;
  }

  get activeFormValue(): FormGroup {
    switch (this.authentication) {
      case AuthenticationMethod.Bearer: {
        return this.bearerModalForm;
      }
      case AuthenticationMethod.CustomAuth: {
        return this.bearerModalForm;
      }
      case AuthenticationMethod.Smtp: {
        return this.smtpModalForm;
      }
      case AuthenticationMethod.Oauth2: {
        return this.oauth2ModalForm;
      }
      case AuthenticationMethod.PureHttp: {
        return this.pureHttpModalForm;
      }
      case AuthenticationMethod.NTLM: {
        return this.nTLMModalForm;
      }
      case AuthenticationMethod.IMAP: {
        return this.iMAPModalForm;
      }
      default:
        throw new Error("unknown authorization type");
    }
  }

  get activeFormInvalid(): boolean {
    return this.activeFormValue.invalid;
  }

  // We initialize the form depending on the AuthenticationMethod
  private initForm() {
    switch (this.authentication) {
      case AuthenticationMethod.PureHttp: {
        this.pureHttpModalForm = new FormGroup({
          connectionString: new FormControl(null, Validators.required),
        });
        break;
      }
      case AuthenticationMethod.Bearer: {
        this.bearerModalForm = new FormGroup({
          connectionString: new FormControl(null, Validators.required),
          token: new FormControl(null, Validators.required),
        });
        break;
      }
      case AuthenticationMethod.CustomAuth: {
        this.bearerModalForm = new FormGroup({
          connectionString: new FormControl(null, Validators.required),
          headername: new FormControl(null, Validators.required),
          prefix: new FormControl(null),
          value: new FormControl(null, Validators.required),
        });
        break;
      }
      case AuthenticationMethod.Smtp: {
        this.smtpModalForm = new FormGroup({
          connectionString: new FormControl(null, Validators.required),
          userName: new FormControl(null, Validators.required),
          password: new FormControl("", Validators.required),
          confirmpassword: new FormControl("", Validators.required),
          port: new FormControl(null, Validators.required),
          islEnabled: new FormControl(false, null),

        }, {
          validators: this.passwordConfirming
        });
        break;
      }
      case AuthenticationMethod.Oauth2: {
        this.oauth2ModalForm = new FormGroup({
          connectionString: new FormControl(null, Validators.required),
          userName: new FormControl(null, Validators.required),
          password: new FormControl("", Validators.required),
          confirmpassword: new FormControl("", Validators.required)
        }, {
          validators: this.passwordConfirming
        });
        break;
      }
      case AuthenticationMethod.NTLM: {
        this.nTLMModalForm = new FormGroup({
          connectionString: new FormControl(null, Validators.required),
          userName: new FormControl(null, Validators.required),
          password: new FormControl("", Validators.required),
          confirmpassword: new FormControl("")
        }, {
          validators: this.passwordConfirming
        });
        break;
      }
      case AuthenticationMethod.IMAP: {
        this.iMAPModalForm = new FormGroup({
          connectionString: new FormControl(null, Validators.required),
          userName: new FormControl(null, Validators.required),
          password: new FormControl("", Validators.required),
          confirmpassword: new FormControl("")
        }, {
          validators: this.passwordConfirming
        });
        break;
      }
      default:
        throw new Error("unknown authorization type");
    }
  }

  passwordConfirming(c: AbstractControl): { invalid: boolean } {
    if (c.get('password').value !== c.get('confirmpassword').value) {
      return {invalid: true};
    }
  }

  //Master Password Switching Method
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  //Secondary password switching method
  toggleFieldTextTypeSecondaryPassword() {
    this.fieldTextTypeSecondaryPassword = !this.fieldTextTypeSecondaryPassword;
  }

  onSubmit() {
    const formValue = this.activeFormValue.value;
    const apiConnectionSettingDto = formValue as ICreateApiConnectionSettingDto;
    this.create.next(apiConnectionSettingDto);

    this.close();
  }

  close(): void {
    this._modal.hide();
    this.activeFormValue.reset();
  }
}
