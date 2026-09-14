import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FamilySetupPage } from './family-setup.page';

describe('FamilySetupPage', () => {
  let component: FamilySetupPage;
  let fixture: ComponentFixture<FamilySetupPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FamilySetupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
