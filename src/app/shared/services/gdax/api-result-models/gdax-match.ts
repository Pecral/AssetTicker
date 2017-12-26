interface GdaxMatch {
  type: string;
  trade_id: number;
  maker_order_id: string;
  taker_order_id: string;
  side: string;
  size: string;
  price: string;
  product_id: string;
  sequence: number;
  time: string;
}