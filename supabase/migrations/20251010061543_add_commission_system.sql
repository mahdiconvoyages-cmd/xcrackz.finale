/*
  # Add Commission System to Missions

  1. New Columns
    - Add `driver_commission` (numeric) to missions - Commission for the driver
    - Add `company_commission` (numeric) to missions - Commission for the company (our revenue)
    - Add `bonus_amount` (numeric) to missions - Bonus awarded for assignment

  2. Changes
    - These columns allow tracking of:
      - Driver earnings
      - Company revenue (commissions)
      - Assignment bonuses
    - All default to 0 if not specified

  3. Notes
    - `company_commission` represents our actual revenue per mission
    - `bonus_amount` is awarded when a driver accepts/is assigned a mission
    - Total mission cost = price
    - Driver gets: price - company_commission + bonus_amount
    - Company gets: company_commission
*/

-- Add commission and bonus columns to missions
ALTER TABLE missions
ADD COLUMN IF NOT EXISTS driver_commission numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS company_commission numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS bonus_amount numeric DEFAULT 0;

-- Add helpful comment
COMMENT ON COLUMN missions.company_commission IS 'Commission revenue for the company';
COMMENT ON COLUMN missions.driver_commission IS 'Commission for the driver (typically price - company_commission)';
COMMENT ON COLUMN missions.bonus_amount IS 'Bonus awarded to driver upon assignment';
