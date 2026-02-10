import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MentionAutocompleteComponent } from './mention-autocomplete-component';

describe('MentionAutocompleteComponent', () => {
  let component: MentionAutocompleteComponent;
  let fixture: ComponentFixture<MentionAutocompleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MentionAutocompleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MentionAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
