import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ContactsPageRoutingModule } from './contacts-routing.module';

import { ContactsPage } from './contacts.page';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingIndicatorComponent } from '../../shared/components/loading-indicator/loading-indicator.component';
import { ContactListRowComponent } from '../../shared/components/contact-list-row/contact-list-row.component';
import { EntityDetailHeaderComponent } from '../../shared/components/entity-detail-header/entity-detail-header.component';
import { FabButtonComponent } from '../../shared/components/fab-button/fab-button.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ContactsPageRoutingModule,
    ErrorBannerComponent,
    LoadingIndicatorComponent,
    ContactListRowComponent,
    EntityDetailHeaderComponent,
    FabButtonComponent,
  ],
  declarations: [ContactsPage],
})
export class ContactsPageModule {}
