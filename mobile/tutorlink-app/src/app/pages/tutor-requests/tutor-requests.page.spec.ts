import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorRequestsPage } from './tutor-requests.page';

describe('TutorRequestsPage', () => {
  let component: TutorRequestsPage;
  let fixture: ComponentFixture<TutorRequestsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorRequestsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
