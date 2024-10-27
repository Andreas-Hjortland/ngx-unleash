import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { FEATURES, FeatureService } from './app.features';
import { NgxUnleashService } from 'ngx-unleash';
import { provideRouter } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';

describe('AppComponent', () => {
  let mySignal: WritableSignal<boolean>;
  beforeEach(async () => {
    mySignal = signal(true);
    const spy = jasmine.createSpyObj<FeatureService>('FeatureService', ['isEnabled', 'getVariant'], {
      [FEATURES[0]]: mySignal,
    });
    spy.isEnabled.withArgs(FEATURES[0], undefined).and.returnValue(mySignal);
    spy.getVariant.and.returnValue(signal(undefined));

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: FeatureService, useValue: spy },
        { provide: NgxUnleashService, useExisting: FeatureService },
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should update enabled flag', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    expect(app.enabled).toBeTrue();
    mySignal.set(false);
    fixture.detectChanges();
    expect(app.enabled).toBeFalse();
  });

  it(`should have the 'demoapp' title`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('demoapp');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Angular Demo App');
  });
});
