import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { NgxUnleashService } from './ngx-unleash.service';

export function ngxUnleashGuard<T extends string = string>(featureName: T): CanActivateFn {
  return async (route, state) => {
    const service = inject(NgxUnleashService);
    await service.init();
    return service.isEnabled(featureName)();
  };
};
