-- Removes legacy per-drop decay columns from drops.
-- New pricing model uses global constants and computed discounts at download time.

ALTER TABLE drops
  DROP COLUMN dailyPriceDecayPct,
  DROP COLUMN volumeDecayStep,
  DROP COLUMN volumeDecayPct;
