import { NgModule } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FamilyPageRoutingModule } from './family-routing.module';

import { FamilyPage } from './family.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { FamilyMemberCardComponent } from '../../shared/components/family-member-card/family-member-card.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ColorPickerFieldComponent } from '../../shared/components/color-picker-field/color-picker-field.component';

@NgModule({
  imports: [
    TranslocoPipe,
    CommonModule,
    FormsModule,
    FamilyPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    FamilyMemberCardComponent,
    EmptyStateComponent,
    ColorPickerFieldComponent,
  ],
  declarations: [FamilyPage],
})
export class FamilyPageModule {}
