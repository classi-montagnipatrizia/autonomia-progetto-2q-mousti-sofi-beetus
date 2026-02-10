import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OnlineUsersDrawerComponent } from './online-users-drawer-component';

describe('OnlineUsersDrawerComponent', () => {
  let component: OnlineUsersDrawerComponent;
  let fixture: ComponentFixture<OnlineUsersDrawerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OnlineUsersDrawerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OnlineUsersDrawerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
