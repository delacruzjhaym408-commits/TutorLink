import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorApplicationPage } from './tutor-application.page';

describe('TutorApplicationPage', () => {
  let component: TutorApplicationPage;
  let fixture: ComponentFixture<TutorApplicationPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorApplicationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
