import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, familyGuard } from './core/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'tasks',
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
    path: 'add-members',
    canActivate: [authGuard],
    loadChildren: () => import('./pages/add-members/add-members.module').then((m) => m.AddMembersPageModule),
  },
  {
    path: 'tasks',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/tasks/tasks.module').then((m) => m.TasksPageModule),
  },
  {
    path: 'tasks/:id',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/task-list/task-list.module').then((m) => m.TaskListPageModule),
  },
  {
    path: 'notes',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/notes/notes.module').then((m) => m.NotesPageModule),
  },
  {
    path: 'calendar',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/calendar/calendar.module').then((m) => m.CalendarPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
