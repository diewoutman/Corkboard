import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, familyGuard } from './core/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'board',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'family-setup',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/family-setup/family-setup.module').then((m) => m.FamilySetupPageModule),
  },
  {
    path: 'board',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/board/board.module').then((m) => m.BoardPageModule),
  },
  {
    path: 'add-members',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/add-members/add-members.module').then((m) => m.AddMembersPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
