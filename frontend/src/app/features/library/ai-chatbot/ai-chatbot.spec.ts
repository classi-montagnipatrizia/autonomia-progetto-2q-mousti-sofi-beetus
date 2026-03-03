import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AiChatbot } from './ai-chatbot';

describe('AiChatbot', () => {
  let component: AiChatbot;
  let fixture: ComponentFixture<AiChatbot>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AiChatbot]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AiChatbot);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
