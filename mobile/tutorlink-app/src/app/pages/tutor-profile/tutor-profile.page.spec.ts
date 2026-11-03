import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorProfilePage } from './tutor-profile.page';

describe('TutorProfilePage', () => {
  let component: TutorProfilePage;
  let fixture: ComponentFixture<TutorProfilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorProfilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
