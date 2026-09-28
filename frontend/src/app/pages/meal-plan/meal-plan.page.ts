import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { addDays, addWeeks, format, startOfWeek } from 'date-fns';
import { SubmitGuard } from '../../core/submit-guard';
import { Collections } from '../../core/collections';
import { MealPlanApi } from '../../core/meal-plan';
import { NULL_CONTACT_FIELDS, NULL_NOTE_FIELDS, NULL_RECIPE_FIELDS, NULL_SHOPPING_FIELDS, Nodes, toUpdateRequest } from '../../core/nodes';
import { extractErrorMessage } from '../../core/http-error';
import { NodeResponse } from '../../core/models';

/** `labelKey` is a translation key. */
const WEEKDAYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];

@Component({
  selector: 'app-meal-plan',
  templateUrl: './meal-plan.page.html',
  styleUrls: ['./meal-plan.page.scss'],
  standalone: false,
})
export class MealPlanPage implements OnInit {
  readonly weekdayKeys = WEEKDAYS;
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  readonly addingToList = new SubmitGuard(inject(ChangeDetectorRef));

  weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  meals: NodeResponse[] = [];
  allRecipes: NodeResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  private mealPlanCollectionId: string | null = null;

  showMealForm = false;
  editingMeal: NodeResponse | null = null;
  mealDay = new Date();
  recipeSearch = '';
  selectedRecipeId: string | null = null;
  plannedServings = 1;
  confirmingDeleteMeal = false;

  shoppingListFeedback: { mealId: string; message: string } | null = null;

  constructor(
    private readonly collectionsApi: Collections,
    private readonly mealPlanApi: MealPlanApi,
    private readonly nodesApi: Nodes,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit() {
    this.nodesApi.list({ type: 'Recipe' }).subscribe((recipes) => {
      this.allRecipes = recipes;
      this.cdr.markForCheck();
    });
    this.collectionsApi.mealPlanCollection().subscribe((collection) => {
      this.mealPlanCollectionId = collection.id;
      this.cdr.markForCheck();
    });
    this.reload();
  }

  get days(): Date[] {
    return WEEKDAYS.map((_, i) => addDays(this.weekStart, i));
  }

  get weekRangeLabel(): string {
    return `${format(this.weekStart, 'd MMM')} – ${format(addDays(this.weekStart, 6), 'd MMM yyyy')}`;
  }

  mealsFor(day: Date): NodeResponse[] {
    const key = format(day, 'yyyy-MM-dd');
    return this.meals.filter((m) => m.from && format(new Date(m.from), 'yyyy-MM-dd') === key);
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    this.mealPlanApi.week(format(this.weekStart, 'yyyy-MM-dd')).subscribe({
      next: (meals) => {
        this.meals = meals;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('meal_plan.errors.load'));
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  prevWeek() {
    this.weekStart = addWeeks(this.weekStart, -1);
    this.reload();
  }

  nextWeek() {
    this.weekStart = addWeeks(this.weekStart, 1);
    this.reload();
  }

  thisWeek() {
    this.weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    this.reload();
  }

  filteredRecipes(): NodeResponse[] {
    const term = this.recipeSearch.trim().toLowerCase();
    return term ? this.allRecipes.filter((r) => r.title.toLowerCase().includes(term)) : this.allRecipes;
  }

  openAddMealForm(day: Date) {
    this.editingMeal = null;
    this.mealDay = day;
    this.recipeSearch = '';
    this.selectedRecipeId = null;
    this.plannedServings = 1;
    this.showMealForm = true;
  }

  openEditMeal(meal: NodeResponse) {
    this.editingMeal = meal;
    this.mealDay = meal.from ? new Date(meal.from) : new Date();
    this.recipeSearch = '';
    this.selectedRecipeId = meal.recipeId;
    this.plannedServings = meal.plannedServings ?? 1;
    this.showMealForm = true;
  }

  closeMealForm() {
    this.showMealForm = false;
    this.editingMeal = null;
    this.confirmingDeleteMeal = false;
  }

  selectRecipe(recipe: NodeResponse) {
    this.selectedRecipeId = recipe.id;
    if (!this.editingMeal) this.plannedServings = recipe.servings ?? 1;
  }

  submitMealForm() {
    if (!this.selectedRecipeId || !this.mealPlanCollectionId || this.submit.busy) return;

    const recipe = this.allRecipes.find((r) => r.id === this.selectedRecipeId);
    const dayIso = new Date(Date.UTC(this.mealDay.getFullYear(), this.mealDay.getMonth(), this.mealDay.getDate())).toISOString();

    const editing = this.editingMeal;
    const request$ = editing
      ? this.nodesApi.update(
          editing.id,
          toUpdateRequest(editing, { title: recipe?.title ?? editing.title, recipeId: this.selectedRecipeId, plannedServings: this.plannedServings }),
        )
      : this.nodesApi.create({
          type: 'Meal',
          title: recipe?.title ?? '',
          description: null,
          from: dayIso,
          until: null,
          assignedFamilyMemberIds: [],
          collectionId: this.mealPlanCollectionId,
          priority: null,
          sectionId: null,
          location: null,
          allDay: null,
          recurrenceRule: null,
          recipeId: this.selectedRecipeId,
          plannedServings: this.plannedServings,
          ...NULL_NOTE_FIELDS,
          ...NULL_CONTACT_FIELDS,
          ...NULL_RECIPE_FIELDS,
          ...NULL_SHOPPING_FIELDS,
        });

    const wasEditing = !!editing;
    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.meals = wasEditing ? this.meals.map((m) => (m.id === saved.id ? saved : m)) : [...this.meals, saved];
        this.closeMealForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(wasEditing ? 'meal_plan.errors.save' : 'meal_plan.errors.create'));
        this.cdr.markForCheck();
      },
    });
  }

  deleteMeal() {
    const meal = this.editingMeal;
    if (!meal) return;

    this.removing.run(this.nodesApi.delete(meal.id), meal.id).subscribe({
      next: () => {
        this.meals = this.meals.filter((m) => m.id !== meal.id);
        this.closeMealForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('meal_plan.errors.delete'));
        this.closeMealForm();
        this.cdr.markForCheck();
      },
    });
  }

  addToShoppingList(meal: NodeResponse) {
    this.shoppingListFeedback = null;
    this.addingToList.run(this.mealPlanApi.addToShoppingList(meal.id), meal.id).subscribe({
      next: (result) => {
        this.shoppingListFeedback = {
          mealId: meal.id,
          message: this.transloco.translate('meal_plan.addedToShoppingList', { added: result.itemsAdded, merged: result.itemsMerged }),
        };
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('meal_plan.errors.addToShoppingList'));
        this.cdr.markForCheck();
      },
    });
  }
}
