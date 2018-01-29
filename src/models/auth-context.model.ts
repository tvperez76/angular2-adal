import AuthenticationContext from 'adal-angular/index';
import { AuthenticationContextOptions } from 'adal-angular';

export interface AuthContext extends AuthenticationContext  {
    REQUEST_TYPE: {
        LOGIN: string,
        RENEW_TOKEN: string,
        UNKNOWN: string
    };

    callback : any;

    _getItem : any;

    _renewFailed : any;

    CONSTANTS: any;

    config: AuthenticationContextOptions;
}

declare module 'adal-angular' {
    export function inject(config: AuthenticationContextOptions): AuthContext;
}
