import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorDashboardPage } from './tutor-dashboard.page';

describe('TutorDashboardPage', () => {
  let component: TutorDashboardPage;
  let fixture: ComponentFixture<TutorDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
