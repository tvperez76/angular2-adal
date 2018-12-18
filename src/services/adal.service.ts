import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import 'rxjs/add/observable/bindCallback';
import { UserInfo, AuthenticationContextOptions } from 'adal-angular/index';

import { OAuthData } from '../models/oauthdata.model';
import * as adalLib from 'adal-angular';
import { AuthContext } from '../models/auth-context.model';

@Injectable()
export class AdalService {
    private adalContext: AuthContext;
    private oauthData: OAuthData = {
        isAuthenticated: false,
        userName: '',
        loginError: '',
        profile: {}
    };

    public init(configOptions: AuthenticationContextOptions) {
        if (!configOptions) {
            throw new Error('You must set config, when calling init.');
        }

        // redirect and logout_redirect are set to current location by default
        let existingHash = window.location.hash;
        let pathDefault = window.location.href;
        if (existingHash) {
            pathDefault = pathDefault.replace(existingHash, '');
        }

        configOptions.redirectUri = configOptions.redirectUri || pathDefault;
        configOptions.postLogoutRedirectUri = configOptions.postLogoutRedirectUri || pathDefault;

        // create instance with given config
        this.adalContext = adalLib.inject(configOptions);

        // loginresource is used to set authenticated status
        this.updateDataFromCache(this.adalContext.config.loginResource);
    }

    public get config(): AuthenticationContextOptions {
        return this.adalContext.config;
    }

    public get userInfo(): OAuthData {
        return this.oauthData;
    }

    public login(): void {
        this.adalContext.login();
    }

    public loginInProgress(): boolean {
        return this.adalContext.loginInProgress();
    }

    public logOut(): void {
        this.adalContext.logOut();
    }

    public handleWindowCallback(): void {
        let hash = window.location.hash;
        let adalContext = this.adalContext as any;
        if (this.adalContext.isCallback(hash)) {
            let requestInfo = this.adalContext.getRequestInfo(hash);
            this.adalContext.saveTokenFromHash(requestInfo);
            if (requestInfo.requestType === adalContext.REQUEST_TYPE.LOGIN) {
                this.updateDataFromCache(adalContext.config.loginResource);

            } else if (requestInfo.requestType === adalContext.REQUEST_TYPE.RENEW_TOKEN) {
                adalContext.callback = window.parent.callBackMappedToRenewStates[requestInfo.stateResponse];
            }

            if (requestInfo.stateMatch) {
                if (typeof adalContext.callback === 'function') {
                    if (requestInfo.requestType === adalContext.REQUEST_TYPE.RENEW_TOKEN) {
                        // Idtoken or Accestoken can be renewed
                        if (requestInfo.parameters['access_token']) {
                            adalContext.callback(adalContext._getItem(adalContext.CONSTANTS.STORAGE.ERROR_DESCRIPTION)
                                , requestInfo.parameters['access_token']);
                        } else if (requestInfo.parameters['id_token']) {
                            adalContext.callback(adalContext._getItem(adalContext.CONSTANTS.STORAGE.ERROR_DESCRIPTION)
                                , requestInfo.parameters['id_token']);
                        }
                        else if (requestInfo.parameters['error']) {
                            adalContext.callback(adalContext._getItem(adalContext.CONSTANTS.STORAGE.ERROR_DESCRIPTION), null);
                            adalContext._renewFailed = true;
                        }
                    }
                }
            }
        }
    }

    public getCachedToken(resource: string): string {
        return this.adalContext.getCachedToken(resource);
    }

    public acquireToken(resource: string) {
        let _this = this;   // save outer this for inner function

        let errorMessage: string;
        return Observable.bindCallback(acquireTokenInternal, function (token: string) {
            if (!token && errorMessage) {
                throw (errorMessage);
            }
            return token;
        })();

        function acquireTokenInternal(cb: any): string {
            let s: string = '';

            _this.adalContext.acquireToken(resource, (error: string, tokenOut: string) => {
                if (error) {
                    _this.adalContext.error('Error when acquiring token for resource: ' + resource, error);
                    errorMessage = error;
                    cb(<string>null);
                } else {
                    cb(tokenOut);
                    s = tokenOut;
                }
            });
            return s;
        }
    }

    public getUser(): Observable<UserInfo> {
        return Observable.bindCallback<UserInfo>((cb: (u: UserInfo) => UserInfo) => {
            this.adalContext.getUser(function (error: string, user: UserInfo) {
                if (error) {
                    this.adalContext.error('Error when getting user', error);
                    cb(null);
                } else {
                    cb(user);
                }
            });
        })();
    }

    public clearCache(): void {
        this.adalContext.clearCache();
    }

    public clearCacheForResource(resource: string): void {
        this.adalContext.clearCacheForResource(resource);
    }

    public info(message: string): void {
        this.adalContext.info(message);
    }

    public verbose(message: string): void {
        this.adalContext.verbose(message);
    }

    public GetResourceForEndpoint(url: string): string {
        return this.adalContext.getResourceForEndpoint(url);
    }

    public refreshDataFromCache() {
        this.updateDataFromCache(this.adalContext.config.loginResource);
    }

    private updateDataFromCache(resource: string): void {
        let token = this.adalContext.getCachedToken(resource);
        this.oauthData.isAuthenticated = token !== null && token.length > 0;
        let user = this.adalContext.getCachedUser() || { userName: '', profile: undefined };
        this.oauthData.userName = user.userName;
        this.oauthData.profile = user.profile;
        this.oauthData.loginError = this.adalContext.getLoginError();

    };
}
