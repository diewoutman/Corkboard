import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { AddToShoppingListResponse, NodeResponse } from './models';

@Service()
export class MealPlanApi {
  private readonly http = inject(HttpClient);

  /** The Meal Nodes for the 7 days starting weekStart (yyyy-MM-dd), each with its Recipe's title. */
  week(weekStart: string) {
    return this.http.get<NodeResponse[]>(`${environment.apiUrl}/meal-plan`, { params: { weekStart } });
  }

  addToShoppingList(mealId: string) {
    return this.http.post<AddToShoppingListResponse>(`${environment.apiUrl}/meal-plan/${mealId}/add-to-shopping-list`, {});
  }
}
