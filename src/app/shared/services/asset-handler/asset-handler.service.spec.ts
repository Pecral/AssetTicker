/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { AssetHandlerService } from './asset-handler.service';

describe('Service: AssetHandler', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AssetHandlerService]
    });
  });

  it('should ...', inject([AssetHandlerService], (service: AssetHandlerService) => {
    expect(service).toBeTruthy();
  }));
});