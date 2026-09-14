import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular/lazy';

import { FamilySetupPageRoutingModule } from './family-setup-routing.module';

import { FamilySetupPage } from './family-setup.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    FamilySetupPageRoutingModule
  ],
  declarations: [FamilySetupPage]
})
export class FamilySetupPageModule {}
