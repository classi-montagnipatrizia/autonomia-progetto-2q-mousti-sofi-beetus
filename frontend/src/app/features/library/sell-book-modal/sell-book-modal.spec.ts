import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SellBookModal } from './sell-book-modal';

describe('SellBookModal', () => {
  let component: SellBookModal;
  let fixture: ComponentFixture<SellBookModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SellBookModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SellBookModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
