import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AddMembersPageRoutingModule } from './add-members-routing.module';

import { AddMembersPage } from './add-members.page';
import { SetupStepHeaderComponent } from '../../shared/components/setup-step-header/setup-step-header.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ColorPickerFieldComponent } from '../../shared/components/color-picker-field/color-picker-field.component';
import { MemberAvatarComponent } from '../../shared/components/member-avatar/member-avatar.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AddMembersPageRoutingModule,
    SetupStepHeaderComponent,
    TextInputComponent,
    ColorPickerFieldComponent,
    MemberAvatarComponent,
    ErrorBannerComponent,
  ],
  declarations: [AddMembersPage],
})
export class AddMembersPageModule {}
