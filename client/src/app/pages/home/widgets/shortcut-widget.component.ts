import { Component, Input } from '@angular/core';
import { TileDef, tileByKey } from '../tile-defs';

@Component({
  selector: 'app-shortcut-widget',
  templateUrl: './shortcut-widget.component.html',
  standalone: false,
})
export class ShortcutWidgetComponent {
  @Input() tileKey: string | null = null;

  get tile(): TileDef {
    return tileByKey(this.tileKey);
  }
}
