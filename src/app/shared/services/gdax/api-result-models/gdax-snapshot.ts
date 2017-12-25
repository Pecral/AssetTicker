interface GdaxOrderBookSnapshot {
   asks: Array<Array<string>>;
   bids: Array<Array<string>>;
   product_id: string;
   type: string;
}