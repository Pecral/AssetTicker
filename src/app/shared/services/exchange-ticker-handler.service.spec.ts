/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ExchangeTickerHandlerService } from './exchange-ticker-handler.service';

describe('Service: ExchangeTickerHandler', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ExchangeTickerHandlerService]
    });
  });

  it('should ...', inject([ExchangeTickerHandlerService], (service: ExchangeTickerHandlerService) => {
    expect(service).toBeTruthy();
  }));
});