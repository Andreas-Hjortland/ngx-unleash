import { computed, effect, Inject, Injectable, isSignal, OnDestroy, Optional, signal, Signal, WritableSignal } from '@angular/core';
import { isObservable } from 'rxjs';
import { isPromise } from 'rxjs/internal/util/isPromise';
import { IMutableContext, UnleashClient } from 'unleash-proxy-client';
import { GET_CONTEXT, GetContextFn } from './ngx-unleash';

type SignalStore = {
  enabled: WritableSignal<boolean>;
  variant: WritableSignal<string | undefined>;
};

export type IFeatureService<T extends string> = {
  /**
   * Returns a signal that emits the current value of the feature flag.
   */
  [key in T]: Signal<boolean>;
} & {
  /**
   * Returns a signal that emits the current variant of the feature flag.
   */
  [key in `${T}_Variant`]: Signal<string | undefined>;
};

@Injectable()
export abstract class NgxUnleashService<T extends string = string> implements OnDestroy {
  private readonly signals = new Map<T, SignalStore>();
  private readonly unsubscribe?: () => void;
  protected abstract getAvailableFeatures(): readonly T[];

  constructor(
    private readonly unleashClient: UnleashClient,
    @Inject(GET_CONTEXT) @Optional() context?: GetContextFn,
  ) {
    if (context) {
      this.unsubscribe = handleContextValue(context, ctx => {
        this.unleashClient.updateContext(ctx ?? {});
      });
    }

    for (const featureName of this.getAvailableFeatures()) {
      Object.defineProperty(this, featureName, {
        get: () => this.isEnabled(featureName),
        enumerable: true,
        configurable: false,
      });
      Object.defineProperty(this, featureName + '_Variant', {
        get: () => this.getVariant(featureName),
        enumerable: true,
        configurable: false,
      });
    }
    this.unleashClient.on('update', this._updateValues);
  }

  private _initialized: Promise<void> | undefined;
  init(): Promise<void> {
    this._initialized ??= this.unleashClient.start()
    return this._initialized;
  }

  ngOnDestroy(): void {
    this.unleashClient.off('update', this._updateValues);
    this.unleashClient.stop();
    this.unsubscribe?.();
  }

  private readonly _updateValues = () => {
    for (const [featureName, { enabled, variant }] of this.signals) {
      const featureEnabled = this.unleashClient.isEnabled(featureName)
      if (featureEnabled !== enabled()) {
        enabled.set(featureEnabled);
      }

      const featureVariant = this._getUnleashVariant(featureName);
      if (featureVariant !== variant()) {
        variant.set(featureVariant);
      }
    }
  }

  private _getUnleashVariant(featureName: string): string | undefined {
    const featureVariant = this.unleashClient.getVariant(featureName);
    if (featureVariant && featureVariant.enabled) {
      return featureVariant.name;
    }
    return undefined;
  }

  private _getOrCreate(featureName: T): SignalStore {
    if (this.signals.has(featureName)) {
      return this.signals.get(featureName)!;
    }
    const result = {
      enabled: signal(this.unleashClient.isEnabled(featureName) ?? false),
      variant: signal(this._getUnleashVariant(featureName)),
    };
    this.signals.set(featureName, result);
    return result;
  }

  public getVariant(featureName: T): Signal<string | undefined> {
    return this._getOrCreate(featureName).variant.asReadonly();
  }

  public isEnabled(featureName: T, variantName?: string): Signal<boolean> {
    const { enabled, variant } = this._getOrCreate(featureName);
    if (variantName) {
      return computed(() => {
        const featureEnabled = enabled();
        const featureVariant = variant();
        return featureEnabled && featureVariant === variantName;
      });
    }
    return enabled.asReadonly();
  }
}

@Injectable()
export class StringUnleashService extends NgxUnleashService {
  protected override getAvailableFeatures(): readonly string[] {
    return [];
  }
}

function handleContextValue(value: GetContextFn | undefined, callback: (value: IMutableContext | undefined) => void): () => void {
  let result = value?.();
  if (isSignal(result)) {
    const effectRef = effect(() => callback(result()));
    return () => effectRef.destroy();
  } else if (isObservable(result)) {
    const subscription = result.subscribe(callback);
    return () => subscription.unsubscribe();
  } else if (isPromise(result)) {
    result.then(callback);
  } else {
    callback(result);
  }
  return () => { };
}