/* tslint:disable:no-unused-variable */
import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { DebugElement } from '@angular/core';

import { TechanLiveComponent } from './techan-live.component';

describe('TechanLiveComponent', () => {
  let component: TechanLiveComponent;
  let fixture: ComponentFixture<TechanLiveComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TechanLiveComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TechanLiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
