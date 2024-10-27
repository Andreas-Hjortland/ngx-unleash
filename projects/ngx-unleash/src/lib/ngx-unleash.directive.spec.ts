import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxUnleashService } from './ngx-unleash.service';
import { NgxUnleashFeatureDisabledDirective, NgxUnleashFeatureEnabledDirective } from './ngx-unleash.directive';
import { Component, computed, Directive, signal } from '@angular/core';
import { JsonPipe } from '@angular/common';

@Component({
  template: `
    <div *feature="existingFeature" id="enabled">Enabled</div>
    <div *featureDisabled="existingFeature" id="disabled">Disabled</div>

    <div *feature="existingFeature; variant 'A'" id="enabled-variant">Enabled variant</div>
    <div *featureDisabled="existingFeature variant 'A'" id="disabled-variant">Disabled variant</div>

    <div *feature="existingFeature; let context; let variant = variant; let enabled = enabled; let feature = feature" id="with-context">
      Enabled with context
      <ul>
        <li>Variant: <span id="with-context-variant">{{ variant() }}</span></li>
        <li>Feature: <span id="with-context-feature">{{ feature() }}</span></li>
        <li>Enabled: <span id="with-context-enabled">{{ enabled() }}</span></li>
        <li>Context: <pre id="with-context-full"><code>{{ context() | json }}</code></pre></li>
      </ul>
    </div>
    <div *featureDisabled="existingFeature; let context; let variant = variant; let enabled = enabled; let feature = feature" id="disabled-with-context">
      Disabled with context
      <ul>
        <li>Variant: <span id="disabled-with-context-variant">{{ variant() }}</span></li>
        <li>Feature: <span id="disabled-with-context-feature">{{ feature() }}</span></li>
        <li>Enabled: <span id="disabled-with-context-enabled">{{ enabled() }}</span></li>
        <li>Context: <pre id="disabled-with-context-full"><code>{{ context() | json }}</code></pre></li>
      </ul>
    </div>

    <div *feature="existingFeature; else theOtherOne" id="enabled-else">Feature enabled (with else block)</div>
    <ng-template #theOtherOne>
      <div id="enabled-the-other-one">The other one (else block of enabled test)</div>
    </ng-template>

    <div *featureDisabled="existingFeature; else theOtherOneDisabled" id="disabled-else">Feature disabled (with else block)</div>
    <ng-template #theOtherOneDisabled>
      <div id="disabled-the-other-one">The other one (else block of disabled test)</div>
    </ng-template>

    <div *feature="missingFeature" id="undefined-feature">Undefined feature enabled</div>
    <div *featureDisabled="missingFeature" id="undefined-feature-disabled">Undefined feature disabled</div>
  `,
  imports: [
    NgxUnleashFeatureEnabledDirective,
    NgxUnleashFeatureDisabledDirective,
    JsonPipe,
  ],
  standalone: true
})
export class TestComponent {
  missingFeature: string = undefined!;
  existingFeature = 'feature';
}

describe('NgxUnleashDirective', () => {
  let featureService: jasmine.SpyObj<NgxUnleashService>;
  let component: ComponentFixture<TestComponent>;
  beforeEach(() => {
    featureService = jasmine.createSpyObj<NgxUnleashService>('NgxUnleashService', ['isEnabled', 'getVariant']);
    const fixture = TestBed.configureTestingModule({
      imports: [
        TestComponent
      ],
      providers: [
        { provide: NgxUnleashService, useValue: featureService },
      ]
    });
    component = fixture.createComponent(TestComponent);
  });

  it('should create enabled instance', () => {
    const mySignal = signal(true);
    featureService.isEnabled.and.returnValue(mySignal);
    featureService.getVariant.and.returnValue(signal(undefined));
    component.detectChanges();
    expect(component.nativeElement.querySelector('#enabled')).toBeTruthy();
    expect(component.nativeElement.querySelector('#disabled')).toBeFalsy();
  });

  it('should update with changes', () => {
    const mySignal = signal(true);
    featureService.isEnabled.and.returnValue(mySignal);
    featureService.getVariant.and.returnValue(signal(undefined));
    component.detectChanges();
    expect(component.nativeElement.querySelector('#enabled')).toBeTruthy();
    expect(component.nativeElement.querySelector('#disabled')).toBeFalsy();
    mySignal.set(false);
    component.detectChanges();
    expect(component.nativeElement.querySelector('#enabled')).toBeFalsy();
    expect(component.nativeElement.querySelector('#disabled')).toBeTruthy();
  });

  it('should handle variant changes', () => {
    const mySignal = signal(true);
    const myVariantSignal = signal('A')
    featureService.isEnabled.and.callFake((feature, variant) => {
      if (feature !== 'feature') {
        return signal(false);
      }
      if (variant) {
        return computed(() => {
          var val = mySignal();
          var varVal = myVariantSignal();
          return val && varVal === variant;
        });
      }
      return mySignal;
    });
    featureService.getVariant.withArgs('feature').and.returnValue(myVariantSignal);

    component.detectChanges();
    expect(component.nativeElement.querySelector('#enabled-variant')).toBeTruthy();
    expect(component.nativeElement.querySelector('#disabled-variant')).toBeFalsy();

    myVariantSignal.set('B');
    component.detectChanges();
    expect(component.nativeElement.querySelector('#enabled-variant')).toBeFalsy();
    expect(component.nativeElement.querySelector('#disabled-variant')).toBeTruthy();
  });

  it('should get context', async () => {
    const mySignal = signal(true);
    const myVariantSignal = signal('A')
    featureService.isEnabled.and.returnValue(mySignal);
    featureService.getVariant.withArgs('feature').and.returnValue(myVariantSignal)

    component.detectChanges();
    component.detectChanges(); // need to run twice to get the context - first time only the nodes are created
    expect(component.nativeElement.querySelector('#with-context')).toBeTruthy();
    expect(component.nativeElement.querySelector('#disabled-with-context')).toBeFalsy();
    expect(component.nativeElement.querySelector('#with-context-enabled').textContent).toBe('true');
    expect(component.nativeElement.querySelector('#with-context-variant').textContent).toBe('A');
    expect(component.nativeElement.querySelector('#with-context-feature').textContent).toBe('feature');

    mySignal.set(false);
    component.detectChanges();
    expect(component.nativeElement.querySelector('#with-context')).toBeFalsy();
    expect(component.nativeElement.querySelector('#disabled-with-context')).toBeTruthy();
    expect(component.nativeElement.querySelector('#disabled-with-context-enabled').textContent).toBe('false');
    expect(component.nativeElement.querySelector('#disabled-with-context-variant').textContent).toBe('A');
    expect(component.nativeElement.querySelector('#disabled-with-context-feature').textContent).toBe('feature');
  });

  it('should handle else blocks', async () => {
    const mySignal = signal(true);
    featureService.isEnabled.and.returnValue(mySignal);
    featureService.getVariant.and.returnValue(signal(undefined));
    component.detectChanges();
    expect(component.nativeElement.querySelector('#enabled-else')).toBeTruthy();
    expect(component.nativeElement.querySelector('#disabled-the-other-one')).toBeTruthy();
    expect(component.nativeElement.querySelector('#disabled-else')).toBeFalsy();
    expect(component.nativeElement.querySelector('#enabled-the-other-one')).toBeFalsy();

    mySignal.set(false);
    component.detectChanges();
    expect(component.nativeElement.querySelector('#enabled-else')).toBeFalsy();
    expect(component.nativeElement.querySelector('#disabled-the-other-one')).toBeFalsy();
    expect(component.nativeElement.querySelector('#disabled-else')).toBeTruthy();
    expect(component.nativeElement.querySelector('#enabled-the-other-one')).toBeTruthy();
  });

  it('should handle missing feature', async () => {
    const mySignal = signal(true);
    featureService.isEnabled.withArgs('feature', undefined).and.returnValue(mySignal);
    featureService.isEnabled.withArgs('feature', jasmine.anything()).and.returnValue(signal(false));
    featureService.isEnabled.and.returnValue(signal(false));
    featureService.getVariant.and.returnValue(signal(undefined));
    component.detectChanges();
    component.detectChanges();
    component.detectChanges();
    expect(component.nativeElement.querySelector('#undefined-feature')).toBeFalsy();
    expect(component.nativeElement.querySelector('#undefined-feature-disabled')).toBeTruthy();
  });
});