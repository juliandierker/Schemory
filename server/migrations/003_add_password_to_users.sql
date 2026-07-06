-- Migration: 003_add_password_to_users
-- Add password_hash column to users table for password-based authentication

-- Add password_hash column
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);

-- Add index for password-based login queries
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Comment: password_hash stores bcrypt hashed passwords with salt
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password with salt for secure authentication';
