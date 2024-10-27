import { APP_INITIALIZER, EnvironmentProviders, InjectionToken, makeEnvironmentProviders, Provider, ProviderToken, Signal, Type } from '@angular/core';
import { NgxUnleashService, StringUnleashService } from './ngx-unleash.service';
import { IConfig, IMutableContext, UnleashClient } from 'unleash-proxy-client';
import { Observable } from 'rxjs';

export type MaybeProduceValue<T> = T | Signal<T> | Observable<T> | Promise<T>
export type GetContextFn = () => MaybeProduceValue<IMutableContext | undefined>;
export const GET_CONTEXT = new InjectionToken<GetContextFn>('NGX_UNLEASH:GET_CONTEXT');

export type Config = IConfig & {
    contextFactory?: GetContextFn;
};

function isConfig(input: unknown): input is Config {
    if (typeof input !== 'object' || input === null) {
        return false;
    }
    const requiredKeys = ['appName', 'clientKey', 'url'] as const;
    return requiredKeys.every(key => typeof (input as Config)[key] === 'string');
}

export function provideFeatureService(settings: Config): EnvironmentProviders;
export function provideFeatureService<T extends NgxUnleashService<U>, U extends string>(implementation: ProviderToken<T>, config?: Config): EnvironmentProviders;
export function provideFeatureService(val: ProviderToken<NgxUnleashService> | Config, config?: Config): EnvironmentProviders {
    const providers: Provider[] = [
        {
            provide: APP_INITIALIZER,
            useFactory: (service: NgxUnleashService) => () => service.init(),
            deps: [NgxUnleashService],
            multi: true,
        }
    ];
    if (isConfig(val)) {
        config = val;
        providers.push({
            provide: NgxUnleashService,
            useClass: StringUnleashService,
        });
    } else {
        providers.push({
            provide: NgxUnleashService,
            useExisting: val,
        });
    }
    if (config) {
        providers.push({
            provide: UnleashClient,
            useFactory: () => new UnleashClient(config),
        });

        if (typeof config.contextFactory === 'function') {
            providers.push({
                provide: GET_CONTEXT,
                useValue: config.contextFactory,
            });
        }
    }
    return makeEnvironmentProviders(providers);
}