import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ContactsPageRoutingModule } from './contacts-routing.module';

import { ContactsPage } from './contacts.page';

@NgModule({
  imports: [CommonModule, FormsModule, ContactsPageRoutingModule],
  declarations: [ContactsPage],
})
export class ContactsPageModule {}
