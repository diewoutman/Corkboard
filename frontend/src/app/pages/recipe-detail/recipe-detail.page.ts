import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { SubmitGuard } from '../../core/submit-guard';
import { RecipeEvents } from '../../core/recipe-events';
import { NULL_CONTACT_FIELDS, NULL_MEAL_FIELDS, NULL_NOTE_FIELDS, NULL_SHOPPING_FIELDS, Nodes, toUpdateRequest } from '../../core/nodes';
import { RecipePhotos } from '../../core/recipe-photos';
import { extractErrorMessage } from '../../core/http-error';
import { INGREDIENT_UNITS, IngredientUnit, NodeResponse, RecipeIngredient, RecipeStep } from '../../core/models';

interface RecipeFormIngredient {
  name: string;
  quantity: number | null;
  unit: IngredientUnit | null;
}

/**
 * The recipe pane, loaded into the shell's right-hand outlet (see RecipesPage) — same
 * router-outlet split as Tasks/TaskList, so a phone shows the folder+recipe list first
 * and this pane replaces it once a recipe (or "new") is picked. Its own folderId comes
 * from the parent route's :folderId param, not this route's own paramMap.
 */
@Component({
  selector: 'app-recipe-detail',
  templateUrl: './recipe-detail.page.html',
  styleUrls: ['./recipe-detail.page.scss'],
  standalone: false,
})
export class RecipeDetailPage implements OnInit, OnDestroy {
  readonly units = INGREDIENT_UNITS;
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));

  folderId!: string;
  recipeId!: string;
  isNewRecipe = false;

  recipe: NodeResponse | null = null;
  loading = true;
  errorMessage: string | null = null;

  /** True while the pane shows the editable form instead of the read-only view. */
  editing = false;
  confirmingDeleteRecipe = false;

  /** Editable-form fields, populated from `recipe` (or blank for a new one) when editing starts. */
  recipeTitle = '';
  recipeDescription = '';
  recipeServings = 4;
  recipeSourceUrl = '';
  ingredients: RecipeFormIngredient[] = [];
  steps: string[] = [];

  /** View-mode-only scaler — doesn't persist, doesn't affect the stored recipe. */
  viewServings = 4;

  uploadingPhoto = false;
  /** A photo picked before a brand-new recipe has an id yet — uploaded right after saveRecipe() creates it. */
  pendingPhotoFile: File | null = null;
  pendingPhotoPreviewUrl: string | null = null;

  constructor(
    private readonly nodesApi: Nodes,
    private readonly recipePhotosApi: RecipePhotos,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
    private readonly events: RecipeEvents,
  ) {}

  /** null at the root level — folderId itself stays the raw URL segment ('root' or a folder id), since that's what navigation needs. */
  private get targetCollectionId(): string | null {
    return this.folderId === 'root' ? null : this.folderId;
  }

  ngOnInit() {
    this.folderId = this.route.parent!.snapshot.paramMap.get('folderId')!;
    // The shell reuses this component when another recipe is picked in the sidebar, so follow the param.
    this.route.paramMap.subscribe((params) => {
      this.recipeId = params.get('recipeId')!;
      this.isNewRecipe = this.recipeId === 'new';
      this.confirmingDeleteRecipe = false;
      // saveRecipe() already has the freshly-created recipe in hand before it replaces the URL — no need to refetch it.
      if (this.recipe?.id === this.recipeId) return;
      if (this.isNewRecipe) this.startNewRecipe();
      else this.loadRecipe(this.recipeId);
    });
  }

  ngOnDestroy() {
    this.revokePendingPreview();
  }

  /** Stable identity for a primitive array entry — without it, editing one row's text destroys and recreates every row's element (losing focus mid-keystroke), since NgFor's default trackBy is the value itself. */
  trackByIndex(index: number) {
    return index;
  }

  private loadRecipe(id: string) {
    this.loading = true;
    this.errorMessage = null;
    this.recipe = null;
    this.editing = false;
    this.revokePendingPreview();

    this.nodesApi.get(id).subscribe({
      next: (recipe) => {
        this.recipe = recipe;
        this.viewServings = recipe.servings ?? 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('recipes.errors.loadRecipe'));
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private startNewRecipe() {
    this.recipe = null;
    this.loading = false;
    this.revokePendingPreview();
    this.editing = true;
    this.recipeTitle = '';
    this.recipeDescription = '';
    this.recipeServings = 4;
    this.recipeSourceUrl = '';
    this.ingredients = [{ name: '', quantity: null, unit: null }];
    this.steps = [''];
    this.cdr.markForCheck();
  }

  startEditRecipe() {
    const recipe = this.recipe;
    if (!recipe) return;
    this.editing = true;
    this.recipeTitle = recipe.title;
    this.recipeDescription = recipe.description ?? '';
    this.recipeServings = recipe.servings ?? 1;
    this.recipeSourceUrl = recipe.sourceUrl ?? '';
    this.ingredients = recipe.ingredients.length ? recipe.ingredients.map((i) => ({ ...i })) : [{ name: '', quantity: null, unit: null }];
    this.steps = recipe.steps.length ? recipe.steps.map((s) => s.instruction) : [''];
  }

  cancelEdit() {
    if (this.isNewRecipe) {
      this.router.navigate(['/recipes', this.folderId]);
      return;
    }
    this.editing = false;
  }

  addIngredientRow() {
    this.ingredients = [...this.ingredients, { name: '', quantity: null, unit: null }];
  }

  removeIngredientRow(index: number) {
    this.ingredients = this.ingredients.filter((_, i) => i !== index);
  }

  addStepRow() {
    this.steps = [...this.steps, ''];
  }

  removeStepRow(index: number) {
    this.steps = this.steps.filter((_, i) => i !== index);
  }

  saveRecipe() {
    if (!this.recipeTitle || this.submit.busy) return;

    const ingredients: RecipeIngredient[] = this.ingredients
      .filter((i) => i.name.trim())
      .map((i) => ({ name: i.name.trim(), quantity: i.quantity, unit: i.unit }));
    const steps: RecipeStep[] = this.steps.filter((s) => s.trim()).map((s) => ({ instruction: s.trim() }));

    const editingExisting = this.recipe;
    const request$ = editingExisting
      ? this.nodesApi.update(
          editingExisting.id,
          toUpdateRequest(editingExisting, {
            title: this.recipeTitle,
            description: this.recipeDescription || null,
            servings: this.recipeServings,
            ingredients,
            steps,
            sourceUrl: this.recipeSourceUrl.trim() || null,
          }),
        )
      : this.nodesApi.create({
          type: 'Recipe',
          title: this.recipeTitle,
          description: this.recipeDescription || null,
          from: null,
          until: null,
          assignedFamilyMemberIds: [],
          collectionId: this.targetCollectionId,
          priority: null,
          sectionId: null,
          location: null,
          allDay: null,
          recurrenceRule: null,
          servings: this.recipeServings,
          ingredients,
          steps,
          sourceUrl: this.recipeSourceUrl.trim() || null,
          ...NULL_NOTE_FIELDS,
          ...NULL_CONTACT_FIELDS,
          ...NULL_MEAL_FIELDS,
          ...NULL_SHOPPING_FIELDS,
        });

    const wasNew = !editingExisting;
    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.recipe = saved;
        this.viewServings = saved.servings ?? 1;
        this.editing = false;
        this.events.changed.next();
        if (wasNew) this.finishCreating(saved.id);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(wasNew ? 'recipes.errors.createRecipe' : 'recipes.errors.saveRecipe'));
        this.cdr.markForCheck();
      },
    });
  }

  /** After creating a new recipe: upload its staged photo (if any picked before save) before moving to its own URL. */
  private finishCreating(newId: string) {
    const pendingFile = this.pendingPhotoFile;
    this.revokePendingPreview();
    if (!pendingFile) {
      this.router.navigate(['/recipes', this.folderId, newId], { replaceUrl: true });
      return;
    }

    this.recipePhotosApi.upload(newId, pendingFile).subscribe({
      next: (photo) => {
        if (this.recipe) this.recipe = { ...this.recipe, photoId: photo.id };
        this.events.changed.next();
        this.router.navigate(['/recipes', this.folderId, newId], { replaceUrl: true });
        this.cdr.markForCheck();
      },
      error: (err) => {
        // The recipe itself was created fine — surface the photo failure but still move to its own URL.
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('recipes.errors.uploadPhoto'));
        this.router.navigate(['/recipes', this.folderId, newId], { replaceUrl: true });
        this.cdr.markForCheck();
      },
    });
  }

  deleteRecipe() {
    const recipe = this.recipe;
    if (!recipe) return;

    this.removing.run(this.nodesApi.delete(recipe.id), recipe.id).subscribe({
      next: () => {
        this.events.changed.next();
        this.router.navigate(['/recipes', this.folderId]);
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('recipes.errors.deleteRecipe'));
        this.confirmingDeleteRecipe = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** Client-side only — doesn't persist. A Meal's own PlannedServings drives the shopping-list scaling. */
  scaledQuantity(ingredient: RecipeIngredient): number | null {
    const recipe = this.recipe;
    if (ingredient.quantity == null || !recipe?.servings) return ingredient.quantity;
    return Math.round(((ingredient.quantity * this.viewServings) / recipe.servings) * 100) / 100;
  }

  /** Host for a source URL's badge, without the "www." noise — falls back to the raw string if it doesn't parse. */
  sourceHost(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  }

  // --- Header photo — its own immediate action, not staged with the edit form; edit-mode only. ---

  headerPhotoUrl(): string | null {
    if (!this.recipe?.photoId) return null;
    return this.recipePhotosApi.url(this.recipe.id, this.recipe.photoId);
  }

  onPhotoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!this.recipe) {
      // Not saved yet — stage it locally; finishCreating() uploads it once saveRecipe() has an id to attach it to.
      this.revokePendingPreview();
      this.pendingPhotoFile = file;
      this.pendingPhotoPreviewUrl = URL.createObjectURL(file);
      this.cdr.markForCheck();
      return;
    }

    const recipeId = this.recipe.id;
    this.uploadingPhoto = true;
    this.recipePhotosApi.upload(recipeId, file).subscribe({
      next: (photo) => {
        if (this.recipe) this.recipe = { ...this.recipe, photoId: photo.id };
        this.uploadingPhoto = false;
        this.events.changed.next();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('recipes.errors.uploadPhoto'));
        this.uploadingPhoto = false;
        this.cdr.markForCheck();
      },
    });
  }

  deletePhoto() {
    if (this.pendingPhotoFile) {
      this.revokePendingPreview();
      this.cdr.markForCheck();
      return;
    }
    if (!this.recipe) return;
    const recipeId = this.recipe.id;

    this.removing.run(this.recipePhotosApi.delete(recipeId), recipeId).subscribe({
      next: () => {
        if (this.recipe) this.recipe = { ...this.recipe, photoId: null };
        this.events.changed.next();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('recipes.errors.deletePhoto'));
        this.cdr.markForCheck();
      },
    });
  }

  private revokePendingPreview() {
    if (this.pendingPhotoPreviewUrl) URL.revokeObjectURL(this.pendingPhotoPreviewUrl);
    this.pendingPhotoFile = null;
    this.pendingPhotoPreviewUrl = null;
  }
}
