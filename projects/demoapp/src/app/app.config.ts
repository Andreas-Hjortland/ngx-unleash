import { APP_INITIALIZER, ApplicationConfig, inject, Injectable, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideFeatureService } from 'ngx-unleash';
import { FeatureService } from './app.features';
import { BehaviorSubject, filter, map, Observable } from 'rxjs';
import { IMutableContext } from 'unleash-proxy-client';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly userSubject = new BehaviorSubject<string | undefined>(undefined);

  get user(): Observable<string | undefined> {
    return this.userSubject.asObservable();
  }
  setUser(value: string | undefined) {
    this.userSubject.next(value);
  }
}
@Injectable({ providedIn: 'root' })
export class MyContextFactory {
  constructor(private readonly userService: UserService) { }

  getContext(): Observable<IMutableContext> {
    return this.userService.user.pipe(
      filter(user => typeof user === 'string'),
      map(user => ({
        userId: user,
        sessionId: '1234',
        properties: {
          tenant: 'default'
        },
      }))
    );
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFeatureService(FeatureService, {
      url: 'https://eu.app.unleash-hosted.com/demo/api/frontend/',
      appName: 'demoapp',
      clientKey: 'default:development.d8164d99edc7f06bb71b851be7feb1522402fa1ca2224f94be3d8229',
      refreshInterval: 30,
      contextFactory: () => inject(MyContextFactory).getContext()
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (userService: UserService) => () => setTimeout(() => userService.setUser('user1'), 10_000),
      deps: [UserService],
      multi: true
    }
  ]
};
