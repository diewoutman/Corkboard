import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AddMembersPageRoutingModule } from './add-members-routing.module';

import { AddMembersPage } from './add-members.page';

@NgModule({
  imports: [CommonModule, FormsModule, AddMembersPageRoutingModule],
  declarations: [AddMembersPage],
})
export class AddMembersPageModule {}
