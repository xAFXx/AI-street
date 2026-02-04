export type FieldType = {
    id: string,
    type: string,
    placeholder?: string,
    label?: string,
    value: [] | string | boolean | number | null | undefined,
    required?: boolean
}

export interface GrantTypeOption {
    label: string; // translation key
    value: string; // actual grant_type value
}

export interface IAuthVariable {
  authVariables?: any;
}

export interface IAdditionalProperty extends IAuthVariable {
  gateway?: any;
}

export interface IChannelModel extends IAdditionalProperty {
  username: string;
  password: string;
}

export interface IBearerModel extends IAdditionalProperty {
  password: string;
}

export interface IApiKeyModel extends IAdditionalProperty {
  password: string;
}

export interface ICustomAuthModel extends IAdditionalProperty {
  headername: string;
  prefix: string;
  value: string;
}

export interface IAuthVars {
  name: string;
  value: string;
}

export interface ITokenSecretModel extends IAdditionalProperty {
  token: string;
  secret: string;
}

export interface IGoogleOauthModel extends IAdditionalProperty {
  email: string;
  certificate: string;
}

export interface IOauth2Model extends IAdditionalProperty {
    /** OAuth2 grant type identifier (e.g. authorization_code, client_credentials, etc.) */
    grantType?: string | null;

    /** Common client configuration */
    clientId?: string | null;
    clientSecret?: string | null;
    redirectUri?: string | null;
    scope?: string | null;
    audience?: string | null;

    /** PKCE extension */
    codeVerifier?: string | null;
    codeChallenge?: string | null;
    codeChallengeMethod?: string | null;

    /** Authorization Code grant fields */
    code?: string | null;

    /** Password grant fields */
    username?: string | null;
    password?: string | null;

    /** Refresh Token grant fields */
    refreshToken?: string | null;

    /** Device Code grant fields */
    deviceCode?: string | null;

    /** JWT / SAML assertion grant fields */
    assertion?: string | null;
    assertionType?: string | null;

    /** Token Exchange grant fields */
    subjectToken?: string | null;
    subjectTokenType?: string | null;
    actorToken?: string | null;
    actorTokenType?: string | null;

    /** Optional CIBA (backchannel auth) fields */
    authReqId?: string | null;
}

export interface INtlmModel extends IAdditionalProperty {
  username: string;
  password: string;
  domain: string;
}

export interface IIMAPModel extends IAdditionalProperty {
  username: string;
  password: string;
  domain: string;
}
