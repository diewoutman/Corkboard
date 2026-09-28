import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { environment } from '../../environments/environment';

export interface RecipePhotoResponse {
  id: string;
}

@Service()
export class RecipePhotos {
  private readonly http = inject(HttpClient);

  /**
   * For an <app-auth-image [src]="...">, not a plain <img> — this endpoint requires the same login
   * as the rest of the API. photoId is only a cache-buster (the route itself has no id — a Recipe has
   * at most one header photo): without it, replacing the photo wouldn't change this URL string, and
   * AuthImageComponent skips refetching a src it's already fetched.
   */
  url(recipeId: string, photoId: string) {
    return `${environment.apiUrl}/recipes/${recipeId}/photo?v=${photoId}`;
  }

  upload(recipeId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<RecipePhotoResponse>(`${environment.apiUrl}/recipes/${recipeId}/photo`, form);
  }

  delete(recipeId: string) {
    return this.http.delete<void>(`${environment.apiUrl}/recipes/${recipeId}/photo`);
  }
}
