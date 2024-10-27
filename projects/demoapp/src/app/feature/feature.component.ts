import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-feature1',
  standalone: true,
  imports: [AsyncPipe],
  templateUrl: './feature.component.html',
  styleUrl: './feature.component.scss'
})
export class FeatureComponent {
  private readonly route = inject(ActivatedRoute);
  public readonly feature = this.route.data.pipe(
    map(data => data['feature'])
  );
}
