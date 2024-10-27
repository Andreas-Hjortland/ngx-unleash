import { Directive, Injectable } from '@angular/core';
import { IFeatureService, NgxUnleashFeatureDisabledDirective, NgxUnleashFeatureEnabledDirective, NgxUnleashService, ngxUnleashGuard} from 'ngx-unleash';

export const FEATURES = [
    'str',
    'Dark_mode',
    'pdp-templates',
] as const;

export type Features = typeof FEATURES[number];

@Injectable({ providedIn: 'root' })
export class FeatureService extends NgxUnleashService<Features> {
    protected override getAvailableFeatures(): readonly Features[] {
        return FEATURES;
    }
}
export interface FeatureService extends IFeatureService<Features> {}

@Directive({ standalone: true, selector: '[feature]' })
export class FeatureEnabledDirective extends NgxUnleashFeatureEnabledDirective<Features> { }

@Directive({ standalone: true, selector: '[featureDisabled]' })
export class FeatureDisabledDirective extends NgxUnleashFeatureDisabledDirective<Features> { }

export const featureGuard = ngxUnleashGuard<Features>;