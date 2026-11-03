import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApplyTutorPage } from './apply-tutor.page';

describe('ApplyTutorPage', () => {
  let component: ApplyTutorPage;
  let fixture: ComponentFixture<ApplyTutorPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ApplyTutorPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
