import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemMaintenanceComponent } from './system-maintenance-component';

describe('SystemMaintenanceComponent', () => {
  let component: SystemMaintenanceComponent;
  let fixture: ComponentFixture<SystemMaintenanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemMaintenanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemMaintenanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
