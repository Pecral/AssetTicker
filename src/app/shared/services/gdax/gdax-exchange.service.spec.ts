/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { GdaxExchangeService } from './gdax-exchange.service';

describe('Service: GdaxExchange', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GdaxExchangeService]
    });
  });

  it('should ...', inject([GdaxExchangeService], (service: GdaxExchangeService) => {
    expect(service).toBeTruthy();
  }));
});