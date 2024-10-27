import { Component, effect, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FeatureDisabledDirective, FeatureEnabledDirective, FEATURES, FeatureService } from './app.features';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterLink, RouterOutlet, FeatureEnabledDirective, FeatureDisabledDirective],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  title = 'demoapp';
  features = inject(FeatureService);

  availableFeatures = FEATURES;

  enabled: boolean = false;
  constructor() {
    effect(() => {
      this.enabled = this.features[FEATURES[0]]();
      console.log(`Feature '${FEATURES[0]}' is ${this.enabled ? 'enabled' : 'disabled'}`);
    });
  }
}
