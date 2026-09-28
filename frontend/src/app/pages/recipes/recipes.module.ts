import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { RecipesPageRoutingModule } from './recipes-routing.module';

import { RecipesPage } from './recipes.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { ColorPickerFieldComponent } from '../../shared/components/color-picker-field/color-picker-field.component';
import { ModalSheetComponent } from '../../shared/components/modal-sheet/modal-sheet.component';
import { AuthImageComponent } from '../../shared/components/auth-image/auth-image.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    RecipesPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    ColorPickerFieldComponent,
    ModalSheetComponent,
    AuthImageComponent,
  ],
  declarations: [RecipesPage],
})
export class RecipesPageModule {}
