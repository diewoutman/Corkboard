import { Service } from '@angular/core';
import { Subject } from 'rxjs';

/** Lets the open recipe tell the folder sidebar that the recipe list is stale (saved, deleted, or its photos changed), so it can reload. */
@Service()
export class RecipeEvents {
  readonly changed = new Subject<void>();
}
