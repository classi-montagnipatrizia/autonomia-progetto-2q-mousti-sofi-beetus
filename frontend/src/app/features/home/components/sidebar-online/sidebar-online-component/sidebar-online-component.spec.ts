import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SidebarOnlineComponent } from './sidebar-online-component';

describe('SidebarOnlineComponent', () => {
  let component: SidebarOnlineComponent;
  let fixture: ComponentFixture<SidebarOnlineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SidebarOnlineComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SidebarOnlineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
