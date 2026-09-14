import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Families } from '../../core/families';

interface HomeTile {
  title: string;
  description: string;
  route: string;
  icon: string;
}

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  familyName: string | null = null;

  readonly tiles: HomeTile[] = [
    {
      title: 'Tasks',
      description: 'Lists and to-dos for the whole family.',
      route: '/tasks',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    },
    {
      title: 'Notes',
      description: 'Quick notes and reminders worth keeping.',
      route: '/notes',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    },
    {
      title: 'Calendar',
      description: 'Events, calendars and weekly schedules.',
      route: '/calendar',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    },
  ];

  constructor(
    private readonly familiesApi: Families,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.familiesApi.mine().subscribe({
      next: (family) => {
        this.familyName = family.name;
        this.cdr.markForCheck();
      },
      error: () => {},
    });
  }
}
