import { NgModule } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { LoginPageRoutingModule } from './login-routing.module';

import { LoginPage } from './login.page';
import { SetupStepHeaderComponent } from '../../shared/components/setup-step-header/setup-step-header.component';
import { TextInputComponent } from '../../shared/components/text-input/text-input.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';

@NgModule({
  imports: [
    TranslocoPipe,
    CommonModule,
    FormsModule,
    LoginPageRoutingModule,
    SetupStepHeaderComponent,
    TextInputComponent,
    ErrorBannerComponent,
  ],
  declarations: [LoginPage],
})
export class LoginPageModule {}
