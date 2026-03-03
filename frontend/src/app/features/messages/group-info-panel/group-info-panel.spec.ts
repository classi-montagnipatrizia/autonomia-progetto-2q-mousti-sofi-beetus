import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupInfoPanel } from './group-info-panel';

describe('GroupInfoPanel', () => {
  let component: GroupInfoPanel;
  let fixture: ComponentFixture<GroupInfoPanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupInfoPanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GroupInfoPanel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
