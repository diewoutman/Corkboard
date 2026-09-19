import { Service } from '@angular/core';
import { Subject } from 'rxjs';

/** Lets the tasks sidebar tell the open list that tasks were moved by drag & drop, so it can reload. */
@Service()
export class TaskEvents {
  readonly moved = new Subject<void>();
}
