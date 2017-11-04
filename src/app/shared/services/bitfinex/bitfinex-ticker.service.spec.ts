/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { BitfinexTickerService } from './bitfinex-ticker.service';

describe('Service: BitfinexTicker', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BitfinexTickerService]
    });
  });

  it('should ...', inject([BitfinexTickerService], (service: BitfinexTickerService) => {
    expect(service).toBeTruthy();
  }));
});