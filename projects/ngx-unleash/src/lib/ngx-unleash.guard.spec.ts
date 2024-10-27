import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { ngxUnleashGuard } from './ngx-unleash.guard';
import { signal } from '@angular/core';
import { NgxUnleashService } from './ngx-unleash.service';

describe('ngxUnleashGuard', () => {
  let executeGuard: CanActivateFn
  let serviceSpy: jasmine.SpyObj<NgxUnleashService>;

  beforeEach(() => {
    serviceSpy = jasmine.createSpyObj<NgxUnleashService>('NgxUnleashService', ['init', 'isEnabled']);
    const bed = TestBed.configureTestingModule({
      providers: [
        {
          provide: NgxUnleashService,
          useValue: serviceSpy,
        }
      ]
    });
    const guard = ngxUnleashGuard('feature');
    executeGuard = (...guardParameters) =>
      bed.runInInjectionContext(() => guard(...guardParameters));
  });

  it('should respect feature toggles', async () => {
    const featureToggle = signal(true);
    serviceSpy.init.and.returnValue(Promise.resolve());
    serviceSpy.isEnabled.withArgs('feature').and.returnValue(featureToggle);
    expect(await executeGuard(null!, null!)).toBeTrue();
    featureToggle.set(false);
    expect(await executeGuard(null!, null!)).toBeFalse();
  });
});
