import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FamilySetupPageRoutingModule } from './family-setup-routing.module';

import { FamilySetupPage } from './family-setup.page';
import { SetupStepHeaderComponent } from '../../shared/components/setup-step-header/setup-step-header.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ColorPickerFieldComponent } from '../../shared/components/color-picker-field/color-picker-field.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    FamilySetupPageRoutingModule,
    SetupStepHeaderComponent,
    TextInputComponent,
    ColorPickerFieldComponent,
    ErrorBannerComponent,
  ],
  declarations: [FamilySetupPage],
})
export class FamilySetupPageModule {}
