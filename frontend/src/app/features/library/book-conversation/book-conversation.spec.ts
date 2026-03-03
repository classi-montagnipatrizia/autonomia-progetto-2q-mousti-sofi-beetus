import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookConversation } from './book-conversation';

describe('BookConversation', () => {
  let component: BookConversation;
  let fixture: ComponentFixture<BookConversation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookConversation]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookConversation);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
