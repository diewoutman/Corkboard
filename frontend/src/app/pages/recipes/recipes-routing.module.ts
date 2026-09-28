import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { RecipesPage } from './recipes.page';

const routes: Routes = [
  // ':folderId' also has to carry the root level (it holds recipes too, not just folders) — 'root' is its sentinel,
  // parallel to how /tasks/:id treats 'inbox'/'all' as sentinels alongside a real list id.
  { path: '', pathMatch: 'full', redirectTo: 'root' },
  {
    path: ':folderId',
    component: RecipesPage,
    // The selected recipe (or "new") renders in the shell's right-hand pane, same split as Tasks/TaskList.
    children: [
      {
        path: ':recipeId',
        loadChildren: () => import('../recipe-detail/recipe-detail.module').then((m) => m.RecipeDetailPageModule),
      },
    ],
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RecipesPageRoutingModule {}
