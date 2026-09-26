import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ShoppingListPageRoutingModule } from './shopping-list-routing.module';

import { ShoppingListPage } from './shopping-list.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';

@NgModule({
  imports: [CommonModule, ShoppingListPageRoutingModule, ErrorBannerComponent, LoadingIndicatorComponent],
  declarations: [ShoppingListPage],
})
export class ShoppingListPageModule {}
