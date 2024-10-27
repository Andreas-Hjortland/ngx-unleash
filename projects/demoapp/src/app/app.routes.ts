import { Route, Routes } from '@angular/router';
import { FeatureComponent as FeatureComponent } from './feature/feature.component';
import { featureGuard, FEATURES } from './app.features';

export const routes: Routes = [
    ...FEATURES.map<Route>((feature, idx) => ({
        path: `feature${idx}`,
        component: FeatureComponent,
        canActivate: [featureGuard(feature)],
        data: { feature },
     })),
];
