import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SafeMentionTextComponent } from './safe-mention-text.component';

describe('SafeMentionTextComponent', () => {
  let component: SafeMentionTextComponent;
  let fixture: ComponentFixture<SafeMentionTextComponent>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [SafeMentionTextComponent],
      providers: [{ provide: Router, useValue: routerSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(SafeMentionTextComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render plain text without mentions', () => {
    fixture.componentRef.setInput('content', 'Hello world');
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.safe-mention-text');
    expect(container?.textContent).toBe('Hello world');
  });

  it('should render mentions as clickable links', () => {
    fixture.componentRef.setInput('content', 'Hello @john how are you?');
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.mention-link');
    expect(links.length).toBe(1);
    expect(links[0].textContent).toBe('@john');
  });

  it('should render multiple mentions', () => {
    fixture.componentRef.setInput('content', 'Hey @alice and @bob!');
    fixture.detectChanges();

    const links = fixture.nativeElement.querySelectorAll('.mention-link');
    expect(links.length).toBe(2);
    expect(links[0].textContent).toBe('@alice');
    expect(links[1].textContent).toBe('@bob');
  });

  it('should navigate to search when mention is clicked', () => {
    fixture.componentRef.setInput('content', 'Hello @john');
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.mention-link');
    link?.click();

    expect(router.navigate).toHaveBeenCalledWith(['/search'], {
      queryParams: { q: 'john', tab: 'users' },
    });
  });

  it('should handle empty content', () => {
    fixture.componentRef.setInput('content', '');
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.safe-mention-text');
    expect(container?.textContent).toBe('');
  });

  it('should handle null content', () => {
    fixture.componentRef.setInput('content', null);
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.safe-mention-text');
    expect(container?.textContent).toBe('');
  });

  it('should prevent XSS attacks', () => {
    fixture.componentRef.setInput(
      'content',
      'Test @<script>alert("xss")</script>user'
    );
    fixture.detectChanges();

    const container = fixture.nativeElement.querySelector('.safe-mention-text');
    const scripts = container?.querySelectorAll('script');
    expect(scripts?.length).toBe(0);
  });
});
