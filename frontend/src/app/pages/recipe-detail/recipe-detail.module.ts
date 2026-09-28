import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@jsverse/transloco';

import { RecipeDetailPageRoutingModule } from './recipe-detail-routing.module';

import { RecipeDetailPage } from './recipe-detail.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { AuthImageComponent } from '../../shared/components/auth-image/auth-image.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    TranslocoPipe,
    RecipeDetailPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    AuthImageComponent,
  ],
  declarations: [RecipeDetailPage],
})
export class RecipeDetailPageModule {}
