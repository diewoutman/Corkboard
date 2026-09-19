import { ComponentFixture, TestBed } from '@angular/core/testing';
import { translocoTesting } from '../../testing/transloco-testing';
import { FamilySetupPage } from './family-setup.page';

describe('FamilySetupPage', () => {
  let component: FamilySetupPage;
  let fixture: ComponentFixture<FamilySetupPage>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [translocoTesting()] });
    fixture = TestBed.createComponent(FamilySetupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
