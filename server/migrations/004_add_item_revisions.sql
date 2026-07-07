-- Schemory item revisions table
-- Migration: 004_add_item_revisions
-- Up migration

-- Create item_revisions table to store historical versions of items
CREATE TABLE item_revisions (
  id SERIAL PRIMARY KEY,
  item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('schema', 'type')),
  content TEXT NOT NULL,
  version INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (item_id, version)
);

-- Indexes for query performance
CREATE INDEX idx_item_revisions_item_id ON item_revisions(item_id);
CREATE INDEX idx_item_revisions_team_id ON item_revisions(team_id);
CREATE INDEX idx_item_revisions_version ON item_revisions(version);
CREATE INDEX idx_item_revisions_item_version ON item_revisions(item_id, version);

-- Trigger function to create revision on item update
CREATE OR REPLACE FUNCTION create_item_revision()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create a revision if this is an UPDATE (not INSERT)
  -- and if the content or kind has changed
  IF TG_OP = 'UPDATE' THEN
    IF NEW.content IS DISTINCT FROM OLD.content OR NEW.kind IS DISTINCT FROM OLD.kind THEN
      INSERT INTO item_revisions (item_id, team_id, name, kind, content, version, created_at)
      VALUES (OLD.id, OLD.team_id, OLD.name, OLD.kind, OLD.content, OLD.version, NOW());
    END IF;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create trigger for items table
DROP TRIGGER IF EXISTS create_item_revision_trigger ON items;
CREATE TRIGGER create_item_revision_trigger
  AFTER UPDATE ON items
  FOR EACH ROW
  EXECUTE FUNCTION create_item_revision();
