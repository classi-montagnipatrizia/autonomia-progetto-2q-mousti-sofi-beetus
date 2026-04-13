import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../../header/header-component/header-component';
import { OnlineUsersDrawerComponent } from '../../../features/home/components/online-users-drawer/online-users-drawer-component/online-users-drawer-component';

@Component({
  selector: 'app-main-layout',
  imports: [RouterOutlet, HeaderComponent, OnlineUsersDrawerComponent],
  templateUrl: './main-layout-component.html',
  styleUrl: './main-layout-component.scss',
})
export class MainLayoutComponent {}
