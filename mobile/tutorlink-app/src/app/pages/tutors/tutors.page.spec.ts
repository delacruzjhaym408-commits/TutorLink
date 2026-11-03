import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorsPage } from './tutors.page';

describe('TutorsPage', () => {
  let component: TutorsPage;
  let fixture: ComponentFixture<TutorsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TutorsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
