import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminApplicationsPage } from './admin-applications.page';

describe('AdminApplicationsPage', () => {
  let component: AdminApplicationsPage;
  let fixture: ComponentFixture<AdminApplicationsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AdminApplicationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
