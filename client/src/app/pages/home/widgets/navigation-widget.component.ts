import { Component, Input } from '@angular/core';
import { TileDef, tilesInOrder } from '../tile-defs';

const TILE_COLORS = ['bg-coral', 'bg-wouter', 'bg-finn', 'bg-lotte', 'bg-person-extra'];

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

  tileColor(index: number): string {
    return TILE_COLORS[index % TILE_COLORS.length];
  }
}
