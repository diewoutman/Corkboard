import { NgModule } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ContactsPageRoutingModule } from './contacts-routing.module';

import { ContactsPage } from './contacts.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { ContactListRowComponent } from '../../shared/components/contact-list-row/contact-list-row.component';
import { EntityDetailHeaderComponent } from '../../shared/components/entity-detail-header/entity-detail-header.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';
import { HouseholdRowComponent } from '../../shared/components/household-row/household-row.component';

@NgModule({
  imports: [
    TranslocoPipe,
    CommonModule,
    FormsModule,
    ContactsPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    ContactListRowComponent,
    EntityDetailHeaderComponent,
    FabButtonComponent,
    HouseholdRowComponent,
  ],
  declarations: [ContactsPage],
})
export class ContactsPageModule {}
