import { TestBed } from '@angular/core/testing';
import { IFeatureService, NgxUnleashService, StringUnleashService } from './ngx-unleash.service';
import { IMutableContext, UnleashClient } from 'unleash-proxy-client';
import { Injectable, signal } from '@angular/core';
import { Observable, Subscriber } from 'rxjs';
import { GET_CONTEXT, GetContextFn } from './ngx-unleash';

describe('NgxUnleashService', () => {
  let unleashSpy: jasmine.SpyObj<UnleashClient>;
  let service: NgxUnleashService;

  beforeEach(() => {
    unleashSpy = jasmine.createSpyObj<UnleashClient>('UnleashClient', ['on', 'off', 'stop', 'getVariant', 'isEnabled', 'emit', 'start']);
    let handlers: { [key: string]: Function[] } = {};
    unleashSpy.on.and.callFake((evt, cb) => {
      const handlerList = (handlers[evt] ??= []);
      handlerList.push(cb);
      return unleashSpy;
    });
    unleashSpy.emit.and.callFake((evt) => {
      if (evt in handlers) {
        for (const handler of handlers[evt]) {
          handler();
        }
      }
      return unleashSpy;
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: UnleashClient, useValue: unleashSpy },
        { provide: NgxUnleashService, useClass: StringUnleashService },
      ]
    });
    service = TestBed.inject(NgxUnleashService);
  });

  it('should get features', () => {
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(true);
    unleashSpy.isEnabled.withArgs('another-feature').and.returnValue(false);
    expect(service.isEnabled('feature')()).toBe(true);
    expect(service.isEnabled('another-feature')()).toBe(false);
  });

  it('should handle missing feature toggles', () => {
    expect(service.isEnabled('feature')()).toBe(false);
    expect(service.getVariant('feature')()).toBe(undefined);
  });

  it('should handle variant tests', () => {
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(true);
    unleashSpy.getVariant
      .withArgs('feature').and.returnValue({ enabled: true, name: 'A' })
      .and.returnValue(undefined!);
    unleashSpy.isEnabled.withArgs('another-feature').and.returnValue(true);
    expect(service.isEnabled('feature', 'A')()).toBe(true);
    expect(service.isEnabled('feature', 'B')()).toBe(false);
    expect(service.isEnabled('another-feature', 'A')()).toBe(false);
  });

  it('should get variants', () => {
    unleashSpy.getVariant.withArgs('feature').and.returnValue({ name: 'variant', enabled: true });
    unleashSpy.getVariant.withArgs('another-feature').and.returnValue(undefined!);
    expect(service.getVariant('feature')()).toBe('variant');
    expect(service.getVariant('another-feature')()).toBe(undefined);
  });

  it('should update enabled when toggle updates', () => {
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(true);
    const signal = service.isEnabled('feature');
    expect(signal()).toBe(true);
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(false);
    expect(signal()).toBe(true);
    unleashSpy.emit('update');
    expect(signal()).toBe(false);
  });

  it('should update enabled when variant updates', () => {
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(true);
    unleashSpy.getVariant.withArgs('feature').and.returnValue({ name: 'A', enabled: false });
    const signal = service.isEnabled('feature', 'A');
    expect(signal()).toBe(false);
    unleashSpy.getVariant.withArgs('feature',).and.returnValue({ name: 'A', enabled: true });
    expect(signal()).toBe(false);
    unleashSpy.emit('update');
    expect(signal()).toBe(true);
  });

  it('should initialize on start', async () => {
    await service.init();
    expect(unleashSpy.start).toHaveBeenCalled();
  });

  it('should not call underlying start method more than once', async () => {
    unleashSpy.start.and.returnValue(Promise.resolve());
    await Promise.all([
      service.init(),
      service.init(),
    ]);
    expect(unleashSpy.start).toHaveBeenCalledTimes(1);
  });
});

describe('NgxUnleashService context', () => {
  let unleashSpy: jasmine.SpyObj<UnleashClient>;
  const context1: IMutableContext = { userId: '1' };
  const context2: IMutableContext = { userId: '2' };
  function waitMicroqueue() {
    return new Promise<void>(resolve => queueMicrotask(resolve));
  }

  function configure(contextProvider: GetContextFn) {
    TestBed.configureTestingModule({
      providers: [
        { provide: UnleashClient, useValue: unleashSpy },
        { provide: GET_CONTEXT, useValue: contextProvider },
        { provide: NgxUnleashService, useClass: StringUnleashService },
      ]
    });
    return TestBed.inject(NgxUnleashService);
  }

  beforeEach(() => {
    unleashSpy = jasmine.createSpyObj<UnleashClient>('UnleashClient', ['on', 'off', 'stop', 'getVariant', 'isEnabled', 'emit', 'updateContext']);
  });

  it('should update context based on signal changes', async () => {
    const contextSignal = signal(context1);
    configure(() => contextSignal);
    await waitMicroqueue();
    expect(unleashSpy.updateContext).toHaveBeenCalledWith(context1);
    contextSignal.set(context2);
    await waitMicroqueue();
    expect(unleashSpy.updateContext).toHaveBeenCalledWith(context2);
  });

  it('should update context based on observable changes', async () => {
    let subscriber: Subscriber<IMutableContext>;
    const contextObservable = new Observable<IMutableContext>(sub => {
      sub.next(context1);
      subscriber = sub;
    });
    configure(() => contextObservable);
    expect(unleashSpy.updateContext).toHaveBeenCalledWith(context1);
    subscriber!.next(context2);
    expect(unleashSpy.updateContext).toHaveBeenCalledWith(context2);
  });

  it('should set context if supplied', async () => {
    configure(() => context1)
    expect(unleashSpy.updateContext).toHaveBeenCalledWith(context1);
  });

  it('should set context from promise', async () => {
    const context = new Promise<IMutableContext>(resolve => {
      setTimeout(resolve, 10, context1);
    });
    configure(() => context);
    await context;
    expect(unleashSpy.updateContext).toHaveBeenCalledWith(context1);
  });

  it('should handle undefined contexts', async () => {
    const context = new Promise<IMutableContext>(resolve => {
      setTimeout(resolve, 10, undefined);
    });
    configure(() => undefined);
    expect(unleashSpy.updateContext).toHaveBeenCalledWith({});
  });
});

describe('NgxUnleashService custom classes', () => {
  interface CustomService extends IFeatureService<'feature' | 'anotherFeature'> {}
  @Injectable()
  class CustomService extends NgxUnleashService {
    protected getAvailableFeatures() {
      return ['feature', 'anotherFeature'];
    }
  }

  let unleashSpy: jasmine.SpyObj<UnleashClient>;
  let service: CustomService;

  beforeEach(() => {
    unleashSpy = jasmine.createSpyObj<UnleashClient>('UnleashClient', ['on', 'off', 'stop', 'getVariant', 'isEnabled', 'emit', 'start']);
    let handlers: { [key: string]: Function[] } = {};
    unleashSpy.on.and.callFake((evt, cb) => {
      const handlerList = (handlers[evt] ??= []);
      handlerList.push(cb);
      return unleashSpy;
    });
    unleashSpy.emit.and.callFake((evt) => {
      if (evt in handlers) {
        for (const handler of handlers[evt]) {
          handler();
        }
      }
      return unleashSpy;
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: UnleashClient, useValue: unleashSpy },
        { provide: NgxUnleashService, useExisting: CustomService },
        CustomService,
      ]
    });
    service = TestBed.inject(CustomService);
  });

  it('should handle predefined features', () => {
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(true);
    expect(service.feature()).toBe(true);
  });

  it('should handle predefined variants', () => {
    unleashSpy.getVariant.withArgs('feature').and.returnValue({ name: 'A', enabled: true });
    expect(service.feature_Variant()).toBe('A');
  });

  it('should update predefined features', () => {
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(true);
    expect(service.feature()).toBe(true);
    unleashSpy.isEnabled.withArgs('feature').and.returnValue(false);
    expect(service.feature()).toBe(true);
    unleashSpy.emit('update');
    expect(service.feature()).toBe(false);
  });
});
