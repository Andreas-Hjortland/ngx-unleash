import { computed, Directive, effect, EffectRef, inject, input, Input, signal, Signal, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { NgxUnleashService } from './ngx-unleash.service';

type Context<T extends string> = {
  feature: T;
  enabled: boolean;
  variant: string | undefined;
}

@Directive()
abstract class NgxUnleashDirective<T extends string> {
  protected readonly abstract variant: Signal<string | undefined>;
  protected readonly abstract else: Signal<TemplateRef<any>>;
  protected readonly abstract featureSignal: Signal<T>;

  private readonly featureService = inject(NgxUnleashService);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly templateRef = inject(TemplateRef);

  private effectRef: EffectRef;
  private readonly context: Signal<Context<T> | undefined> = computed(() => {
    const feature = this.featureSignal();
    if (!feature) {
      return undefined;
    }
    const enabled = this.featureService.isEnabled(feature, this.variant());
    const variant = this.featureService.getVariant(feature);
    return {
      feature,
      enabled: enabled(),
      variant: variant(),
    }
  });

  private thenViewRef?: ViewRef;
  private elseViewRef?: ViewRef;

  constructor() {
    this.effectRef = effect(() => this.updateView());
  }
  ngOnDestroy(): void {
    this.effectRef?.destroy();
  }

  protected abstract shouldRenderThenView(context?: Context<T>): boolean;

  private updateView() {
    const context = this.context();
    const viewContext = {
      $implicit: this.context,
      enabled: computed(() => this.context()?.enabled),
      feature: computed(() => this.context()?.feature),
      variant: computed(() => this.context()?.variant),
    };
    if (this.shouldRenderThenView(context)) {
      delete this.elseViewRef;
      if (!this.thenViewRef) {
        this.viewContainer.clear();
        this.thenViewRef = this.viewContainer.createEmbeddedView(this.templateRef, viewContext);
      }
    } else {
      const elseTemplate = this.else();
      delete this.thenViewRef;
      if (!this.elseViewRef) {
        this.viewContainer.clear();
        if (elseTemplate) {
          this.elseViewRef = this.viewContainer.createEmbeddedView(elseTemplate, viewContext);
        }
      }
    }
  }
}

@Directive({
  standalone: true,
  selector: '[feature]',
})
export class NgxUnleashFeatureEnabledDirective<T extends string> extends NgxUnleashDirective<T> {
  public override featureSignal = input.required<T>({ alias: 'feature' });
  public override variant = input<string>(undefined!, { alias: 'featureVariant' });
  public override else = input<TemplateRef<any>>(undefined!, { alias: 'featureElse' });

  protected override shouldRenderThenView(context?: Context<T>) {
    return !!context?.enabled;
  }
}

@Directive({
  standalone: true,
  selector: '[featureDisabled]',
})
export class NgxUnleashFeatureDisabledDirective<T extends string> extends NgxUnleashDirective<T> {
  public override featureSignal = input.required<T>({ alias: 'featureDisabled' });
  public override variant = input<string>(undefined!, { alias: 'featureDisabledVariant' });
  public override else = input<TemplateRef<any>>(undefined!, { alias: 'featureDisabledElse' });

  protected override shouldRenderThenView(context?: Context<T>) {
    return !context?.enabled;
  }
}