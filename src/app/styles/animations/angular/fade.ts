// fade.animation.ts

import { trigger, animate, transition, style, query } from '@angular/animations';

export const fadeAnimation =
   trigger('fadeAnimation', [

      transition(':leave', [
         style({ opacity: 1 }),
         animate(400, style({ opacity: 0 }))
      ]),

      transition(':enter', [
         style({ opacity: 0 }),
         animate(400, style({ opacity: 1 }))
      ])
   ]);
