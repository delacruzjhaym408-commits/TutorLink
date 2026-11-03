import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BookingRequestPage } from './booking-request.page';

describe('BookingRequestPage', () => {
  let component: BookingRequestPage;
  let fixture: ComponentFixture<BookingRequestPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(BookingRequestPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
