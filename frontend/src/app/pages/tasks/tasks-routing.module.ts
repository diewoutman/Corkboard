import { NgModule } from '@angular/core';
import { inject } from '@angular/core';
import { Router, Routes, RouterModule } from '@angular/router';

import { TasksPage } from './tasks.page';

const routes: Routes = [
  {
    path: '',
    component: TasksPage,
    // The selected list renders in the shell's right-hand pane.
    children: [
      {
        // Wide screens always show a list next to the sidebar, so a bare /tasks opens "All tasks";
        // on phones it stays the plain list of lists.
        path: '',
        pathMatch: 'full',
        children: [],
        canActivate: [() => (window.matchMedia('(min-width: 768px)').matches ? inject(Router).createUrlTree(['/tasks/all']) : true)],
      },
      {
        path: ':id',
        loadChildren: () => import('../task-list/task-list.module').then((m) => m.TaskListPageModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TasksPageRoutingModule {}
