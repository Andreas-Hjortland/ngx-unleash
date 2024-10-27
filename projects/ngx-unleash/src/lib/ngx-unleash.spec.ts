import { TestBed } from "@angular/core/testing";
import { GetContextFn, provideFeatureService } from "./ngx-unleash";
import { NgxUnleashService, StringUnleashService } from "./ngx-unleash.service";
import { inject, Injectable, InjectionToken, Provider } from "@angular/core";
import { UnleashClient } from "unleash-proxy-client";
import { map, Observable, of } from "rxjs";

describe('NgxUnleashProvider', () => {
    let spyUnleashClient: jasmine.SpyObj<UnleashClient>;
    let unleashProvider: Provider;

    beforeEach(() => {
        spyUnleashClient = jasmine.createSpyObj<UnleashClient>('UnleashClient', ['on', 'off', 'start', 'stop', 'updateContext']);
        unleashProvider = { provide: UnleashClient, useValue: spyUnleashClient }
    });

    it('should provide services', () => {
        const fixture = TestBed.configureTestingModule({
            providers: [
                provideFeatureService({
                    appName: 'test',
                    clientKey: 'test',
                    url: 'http://localhost:4242/api',
                }),
                unleashProvider,
            ]
        });
        expect(fixture.inject(NgxUnleashService)).toBeTruthy();
    });

    it('should use custom service implementation', () => {
        @Injectable({ providedIn: 'root' })
        class MyService extends StringUnleashService { }
        const fixture = TestBed.configureTestingModule({
            providers: [
                provideFeatureService(MyService, {
                    appName: 'test',
                    clientKey: 'test',
                    url: 'http://localhost:4242/api',
                }),
                unleashProvider,
            ]
        });

        expect(fixture.inject(NgxUnleashService)).toBeInstanceOf(MyService);
    });

    it('handle injection token for custom service implementation', () => {
        @Injectable()
        class MyService extends StringUnleashService { }
        const token = new InjectionToken('TEST');
        const fixture = TestBed.configureTestingModule({
            providers: [
                { provide: token, useClass: MyService },
                provideFeatureService(token, {
                    appName: 'test',
                    clientKey: 'test',
                    url: 'http://localhost:4242/api',
                }),
                unleashProvider,
            ]
        });

        expect(fixture.inject(NgxUnleashService)).toBeInstanceOf(MyService);
    });

    it('should handle context factory', async () => {
        const spy = jasmine.createSpy('contextFactory');
        const fixture = TestBed.configureTestingModule({
            providers: [
                provideFeatureService({
                    appName: 'test',
                    clientKey: 'test',
                    url: 'http://localhost:4242/api',
                    contextFactory: spy,
                }),
                unleashProvider,
            ]
        });

        const service = fixture.inject(NgxUnleashService);
        await service.init();
        expect(spy).toHaveBeenCalled();
    });

    it('can inject in context factory', async () => {
        @Injectable({ providedIn: 'root' })
        class Foo {
            getUser(): Observable<string> {
                return of('next');
            }
        }
        const spy = jasmine.createSpy<GetContextFn>('contextFactory').and.callFake(() => {
            return inject(Foo).getUser().pipe(
                map(userId => ({ userId, sessionId: 'test' }))
            );
        });
        const fixture = TestBed.configureTestingModule({
            providers: [
                provideFeatureService({
                    appName: 'test',
                    clientKey: 'test',
                    url: 'http://localhost:4242/api',
                    contextFactory: spy,
                }),
                unleashProvider,
            ]
        });

        const service = fixture.inject(NgxUnleashService);
        await service.init();
        expect(spy).toHaveBeenCalled();
    });
});