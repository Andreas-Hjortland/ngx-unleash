import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeatureComponent } from './feature.component';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';

describe('FeatureComponent', () => {
  const featureName = 'asdf';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeatureComponent],
      providers: [
        provideRouter([
          {
            path: `feature`,
            component: FeatureComponent,
            data: { feature: featureName },
         }
        ]),
      ]
    })
    .compileComponents();
  });

  it('should contain feature name', async () => {
    const harness = await RouterTestingHarness.create();
    const activatedComponent = await harness.navigateByUrl('/feature', FeatureComponent);
    expect(activatedComponent).toBeInstanceOf(FeatureComponent);
    const feature = await firstValueFrom(activatedComponent.feature);
    expect(feature).toBe(featureName);
  });
});
