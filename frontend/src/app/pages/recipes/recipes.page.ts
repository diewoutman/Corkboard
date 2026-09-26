import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { Subscription, forkJoin } from 'rxjs';
import { SubmitGuard } from '../../core/submit-guard';
import { Collections } from '../../core/collections';
import { Nodes } from '../../core/nodes';
import { RecipePhotos } from '../../core/recipe-photos';
import { RecipeEvents } from '../../core/recipe-events';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, NodeResponse } from '../../core/models';
import { PALETTE } from '../../core/colors';

interface FolderRow {
  folder: CollectionResponse;
  depth: number;
}

@Component({
  selector: 'app-recipes',
  templateUrl: './recipes.page.html',
  styleUrls: ['./recipes.page.scss'],
  standalone: false,
})
export class RecipesPage implements OnInit, OnDestroy {
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));

  folderId: string | null = null;
  breadcrumb: CollectionResponse[] = [];
  /** Every RecipeBook folder in the Family, any depth — the tree is built from this client-side (see visibleFolderRows). */
  allFolders: CollectionResponse[] = [];
  recipes: NodeResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  /** Folders whose children are shown in the tree. The active folder's own ancestors are added automatically on load. */
  readonly expandedIds = new Set<string>();

  showFolderForm = false;
  editingFolder: CollectionResponse | null = null;
  folderName = '';
  folderColor = PALETTE[0];
  confirmingDeleteFolder = false;

  /** A recipe (or "new") is open in the right-hand pane; on phones the pane then replaces the sidebar. */
  hasSelection = false;

  private changedSub?: Subscription;

  constructor(
    private readonly collectionsApi: Collections,
    private readonly nodesApi: Nodes,
    private readonly recipePhotosApi: RecipePhotos,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
    private readonly events: RecipeEvents,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => {
      // 'root' is the URL sentinel for "no folder" — see recipes-routing.module.ts.
      const raw = params.get('folderId');
      this.folderId = raw === 'root' ? null : raw;
      this.reload();
    });
    this.changedSub = this.events.changed.subscribe(() => this.reload(true));
  }

  /** folderId for building a routerLink — the root level's own URL segment is the 'root' sentinel, not null. */
  get urlFolderId(): string {
    return this.folderId ?? 'root';
  }

  ngOnDestroy() {
    this.changedSub?.unsubscribe();
  }

  onSelectionChange(active: boolean) {
    this.hasSelection = active;
    // The list's titles/thumbnail go stale as a recipe is edited in the pane; refresh quietly on each navigation.
    if (active) this.reload(true);
    this.cdr.markForCheck();
  }

  reload(quiet = false) {
    this.loading = !quiet;
    this.errorMessage = null;

    // Every folder comes back in one call (allLevels) — the breadcrumb and the tree are both built from it client-side, no per-ancestor round trip.
    const folders$ = this.collectionsApi.list({ type: 'RecipeBook', allLevels: true });
    // The root level holds recipes too, not just folders — `unfiled` (rather than omitting collectionId) keeps this scoped to the root instead of every folder at once.
    const recipes$ = this.nodesApi.list({ type: 'Recipe', collectionId: this.folderId ?? undefined, unfiled: this.folderId ? undefined : true });

    forkJoin({ folders: folders$, recipes: recipes$ }).subscribe({
      next: ({ folders, recipes }) => {
        this.allFolders = folders;
        this.breadcrumb = this.folderId ? this.ancestorsOf(this.folderId) : [];
        this.breadcrumb.forEach((f) => this.expandedIds.add(f.id));
        this.recipes = recipes;
        this.folderColor = PALETTE[this.siblingFolders().length % PALETTE.length];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('recipes.errors.load'));
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  /** id's own chain of parents, root-first, id itself last. */
  private ancestorsOf(id: string): CollectionResponse[] {
    const chain: CollectionResponse[] = [];
    let current = this.allFolders.find((f) => f.id === id);
    while (current) {
      chain.unshift(current);
      current = current.parentCollectionId ? this.allFolders.find((f) => f.id === current!.parentCollectionId) : undefined;
    }
    return chain;
  }

  /** The folders at the same level as the currently open one (or the top level, at root) — only used to vary a new folder's suggested color. */
  private siblingFolders(): CollectionResponse[] {
    return this.allFolders.filter((f) => f.parentCollectionId === this.folderId);
  }

  // --- The folder tree — a flat, depth-first walk of the expanded subset of allFolders, indented by `depth` in the template. ---

  childrenOf(parentId: string | null): CollectionResponse[] {
    return this.allFolders.filter((f) => f.parentCollectionId === parentId).sort((a, b) => a.name.localeCompare(b.name));
  }

  hasChildren(folder: CollectionResponse): boolean {
    return this.allFolders.some((f) => f.parentCollectionId === folder.id);
  }

  get visibleFolderRows(): FolderRow[] {
    const rows: FolderRow[] = [];
    const walk = (parentId: string | null, depth: number) => {
      for (const folder of this.childrenOf(parentId)) {
        rows.push({ folder, depth });
        if (this.expandedIds.has(folder.id)) walk(folder.id, depth + 1);
      }
    };
    walk(null, 0);
    return rows;
  }

  toggleExpand(folder: CollectionResponse) {
    if (this.expandedIds.has(folder.id)) this.expandedIds.delete(folder.id);
    else this.expandedIds.add(folder.id);
  }

  openFolder(folder: CollectionResponse) {
    this.router.navigate(['/recipes', folder.id]);
  }

  goToRoot() {
    this.router.navigate(['/recipes', 'root']);
  }

  goToBreadcrumb(folder: CollectionResponse) {
    this.router.navigate(['/recipes', folder.id]);
  }

  startNewRecipe() {
    this.router.navigate(['/recipes', this.urlFolderId, 'new']);
  }

  /** For the sidebar's own thumbnail — the pane's app-auth-image src comes from RecipeDetailPage instead. */
  photoUrl(recipeId: string, photoId: string): string {
    return this.recipePhotosApi.url(recipeId, photoId);
  }

  // --- Folders (still a small modal form — it's a two-field structural action, not the thing that was clunky) ---

  openAddFolderForm() {
    this.editingFolder = null;
    this.folderName = '';
    this.folderColor = PALETTE[this.siblingFolders().length % PALETTE.length];
    this.showFolderForm = true;
  }

  openEditFolderForm(folder: CollectionResponse) {
    this.editingFolder = folder;
    this.folderName = folder.name;
    this.folderColor = folder.color;
    this.showFolderForm = true;
  }

  closeFolderForm() {
    this.showFolderForm = false;
    this.editingFolder = null;
    this.confirmingDeleteFolder = false;
  }

  submitFolderForm() {
    if (!this.folderName || this.submit.busy) return;

    const request$ = this.editingFolder
      ? this.collectionsApi.update(this.editingFolder.id, {
          name: this.folderName,
          color: this.folderColor,
          street: null,
          city: null,
          postalCode: null,
          country: null,
        })
      : this.collectionsApi.create({
          name: this.folderName,
          type: 'RecipeBook',
          color: this.folderColor,
          parentCollectionId: this.folderId,
          street: null,
          city: null,
          postalCode: null,
          country: null,
        });

    const wasEditing = !!this.editingFolder;
    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.allFolders = wasEditing ? this.allFolders.map((f) => (f.id === saved.id ? saved : f)) : [...this.allFolders, saved];
        this.closeFolderForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate(wasEditing ? 'recipes.errors.saveFolder' : 'recipes.errors.createFolder'));
        this.cdr.markForCheck();
      },
    });
  }

  deleteFolder() {
    const folder = this.editingFolder;
    if (!folder) return;

    this.removing.run(this.collectionsApi.delete(folder.id), folder.id).subscribe({
      next: () => {
        this.allFolders = this.allFolders.filter((f) => f.id !== folder.id);
        this.expandedIds.delete(folder.id);
        this.closeFolderForm();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('recipes.errors.deleteFolder'));
        this.closeFolderForm();
        this.cdr.markForCheck();
      },
    });
  }
}
