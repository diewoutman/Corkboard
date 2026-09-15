import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard, familyGuard } from './core/auth-guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadChildren: () => import('./pages/login/login.module').then((m) => m.LoginPageModule),
  },
  {
    path: 'home',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/home/home.module').then((m) => m.HomePageModule),
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
    path: 'today',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/today/today.module').then((m) => m.TodayPageModule),
  },
  {
    path: 'upcoming',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/upcoming/upcoming.module').then((m) => m.UpcomingPageModule),
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
    path: 'contacts',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/contacts/contacts.module').then((m) => m.ContactsPageModule),
  },
  {
    path: 'calendar',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/calendar/calendar.module').then((m) => m.CalendarPageModule),
  },
  {
    path: 'calendar/schedules/:id',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/schedule-editor/schedule-editor.module').then((m) => m.ScheduleEditorPageModule),
  },
  {
    path: 'family',
    canActivate: [familyGuard],
    loadChildren: () => import('./pages/family/family.module').then((m) => m.FamilyPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
