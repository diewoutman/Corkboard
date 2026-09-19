import { Component, Input } from '@angular/core';
import { TileDef, tilesInOrder } from '../tile-defs';

@Component({
  selector: 'app-navigation-widget',
  templateUrl: './navigation-widget.component.html',
  standalone: false,
})
export class NavigationWidgetComponent {
  @Input() tileOrder: string[] | null = null;

  get tiles(): TileDef[] {
    return tilesInOrder(this.tileOrder);
  }
}
