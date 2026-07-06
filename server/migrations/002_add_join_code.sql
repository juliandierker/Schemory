-- Schemory migration: Add join_code to teams and remove name uniqueness
-- Migration: 002_add_join_code
-- Up migration

-- Remove UNIQUE constraint from name column to allow duplicate team names
-- The constraint name is typically teams_name_key for the UNIQUE constraint on name
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_name_key;

-- Add join_code column to teams table with UNIQUE constraint
ALTER TABLE teams ADD COLUMN join_code VARCHAR(64) UNIQUE;

-- Add index for join_code lookups
CREATE INDEX idx_teams_join_code ON teams(join_code);

-- Function to generate a random join code (16 alphanumeric characters)
CREATE OR REPLACE FUNCTION generate_join_code() RETURNS VARCHAR(64) AS $$
DECLARE
  code VARCHAR(64);
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  i INTEGER;
  char_length INTEGER;
  random_pos INTEGER;
BEGIN
  code := '';
  char_length := LENGTH(chars);
  FOR i IN 1..16 LOOP
    random_pos := FLOOR(RANDOM() * char_length) + 1;
    code := code || SUBSTRING(chars, random_pos, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Update existing teams to have join codes
UPDATE teams SET join_code = generate_join_code() WHERE join_code IS NULL;

-- Add trigger to auto-generate join_code on insert if not provided
CREATE OR REPLACE FUNCTION set_join_code_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.join_code IS NULL THEN
    NEW.join_code := generate_join_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

CREATE TRIGGER trg_teams_join_code
  BEFORE INSERT ON teams
  FOR EACH ROW
  EXECUTE FUNCTION set_join_code_on_insert();
