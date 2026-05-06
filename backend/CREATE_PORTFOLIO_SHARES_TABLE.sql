-- ============================================================================
-- CREATE PORTFOLIO_SHARES TABLE FOR SECURE PORTFOLIO SHARING
-- ============================================================================

-- Drop table if exists (for fresh setup)
DROP TABLE IF EXISTS portfolio_shares CASCADE;

-- Create portfolio_shares table
CREATE TABLE portfolio_shares (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token           TEXT NOT NULL UNIQUE,              -- Secure UUID token
    portfolio_id    UUID NOT NULL,                     -- Portfolio being shared
    user_id         TEXT NOT NULL,                      -- Owner of the share
    share_title     TEXT,                               -- Custom share title
    share_description TEXT,                             -- Custom share description
    access_type     TEXT NOT NULL DEFAULT 'public',    -- public, private, one-time, temporary, fingerprint
    expires_at      TIMESTAMP,                          -- Expiry timestamp
    password_hash   TEXT,                               -- Hashed password (bcrypt)
    otp_enabled     BOOLEAN DEFAULT FALSE,              -- OTP verification required
    otp_code        TEXT,                               -- Current OTP code
    otp_expires_at  TIMESTAMP,                          -- OTP expiry
    watermark_enabled BOOLEAN DEFAULT FALSE,            -- Add watermark protection
    allow_download  BOOLEAN DEFAULT TRUE,              -- Allow downloads
    is_active       BOOLEAN DEFAULT TRUE,               -- Active status
    created_at      TIMESTAMP DEFAULT NOW(),            -- Creation timestamp
    created_by      TEXT,                               -- Creator email/ID
    last_accessed   TIMESTAMP,                          -- Last access time
    view_count      INTEGER DEFAULT 0,                  -- Total views
    download_count  INTEGER DEFAULT 0,                  -- Total downloads
    
    -- Analytics fields
    last_ip         TEXT,                               -- Last viewer IP
    last_user_agent TEXT,                               -- Last viewer user agent
    last_device     TEXT,                               -- Last device type
    last_browser    TEXT,                               -- Last browser
    
    -- Security fields
    access_log      JSONB DEFAULT '[]'::jsonb,          -- Detailed access log
    security_flags  JSONB DEFAULT '{}'::jsonb           -- Security flags and metadata
);

-- Create indexes for faster queries
CREATE INDEX idx_portfolio_shares_token ON portfolio_shares(token);
CREATE INDEX idx_portfolio_shares_portfolio_id ON portfolio_shares(portfolio_id);
CREATE INDEX idx_portfolio_shares_user_id ON portfolio_shares(user_id);
CREATE INDEX idx_portfolio_shares_is_active ON portfolio_shares(is_active);
CREATE INDEX idx_portfolio_shares_expires_at ON portfolio_shares(expires_at);
CREATE INDEX idx_portfolio_shares_created_at ON portfolio_shares(created_at);

-- Enable RLS (Row-Level Security)
ALTER TABLE portfolio_shares ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Policy 1: Users can view their own shares and active public shares
CREATE POLICY "users_can_view_own_and_active_shares"
ON portfolio_shares
FOR SELECT
USING (auth.uid()::text = user_id OR is_active = TRUE);

-- Policy 2: Users can create shares
CREATE POLICY "users_can_create_shares"
ON portfolio_shares
FOR INSERT
WITH CHECK (auth.uid()::text = user_id);

-- Policy 3: Users can update their own shares
CREATE POLICY "users_can_update_own_shares"
ON portfolio_shares
FOR UPDATE
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);

-- Policy 4: Users can delete their own shares
CREATE POLICY "users_can_delete_own_shares"
ON portfolio_shares
FOR DELETE
USING (auth.uid()::text = user_id);

-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to check and update expiry status
CREATE OR REPLACE FUNCTION check_portfolio_share_expiry()
RETURNS TRIGGER AS $$
BEGIN
    -- Check expiry date
    IF NEW.expires_at IS NOT NULL THEN
        IF NOW() > NEW.expires_at THEN
            NEW.is_active := FALSE;
        END IF;
    END IF;
    
    -- Check one-time access
    IF NEW.access_type = 'one-time' AND NEW.view_count > 0 THEN
        NEW.is_active := FALSE;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check expiry before insert/update
CREATE TRIGGER portfolio_share_expiry_check
BEFORE INSERT OR UPDATE ON portfolio_shares
FOR EACH ROW
EXECUTE FUNCTION check_portfolio_share_expiry();

-- Function to log access attempts
CREATE OR REPLACE FUNCTION log_portfolio_share_access()
RETURNS TRIGGER AS $$
BEGIN
    -- Update access analytics
    NEW.last_accessed = NOW();
    NEW.view_count = OLD.view_count + 1;
    
    -- Log to access log
    NEW.access_log = OLD.access_log || jsonb_build_object(
        'timestamp', NOW(),
        'ip', NEW.last_ip,
        'user_agent', NEW.last_user_agent,
        'device', NEW.last_device,
        'browser', NEW.last_browser,
        'action', 'view'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to generate OTP code
CREATE OR REPLACE FUNCTION generate_portfolio_otp()
RETURNS TEXT AS $$
DECLARE
    otp_code TEXT;
BEGIN
    -- Generate 6-digit OTP
    otp_code := LPAD(floor(random() * 1000000)::TEXT, 6, '0');
    RETURN otp_code;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View for active shares with portfolio info
CREATE VIEW active_portfolio_shares AS
SELECT 
    ps.*,
    p.title as portfolio_title,
    p.type as portfolio_type,
    p.created_at as portfolio_created_at
FROM portfolio_shares ps
LEFT JOIN portfolios p ON ps.portfolio_id = p.id
WHERE ps.is_active = TRUE;

-- ============================================================================
-- SAMPLE INSERT (for testing)
-- ============================================================================

-- INSERT INTO portfolio_shares (
--     token, portfolio_id, user_id, share_title, access_type, created_by
-- ) VALUES (
--     gen_random_uuid()::TEXT,
--     'portfolio-uuid-here',
--     'user-id-here',
--     'My Portfolio Share',
--     'public',
--     'user@example.com'
-- );

COMMENT ON TABLE portfolio_shares IS 'Stores secure share links for portfolios with advanced security features';
COMMENT ON COLUMN portfolio_shares.token IS 'Secure UUID token for share access';
COMMENT ON COLUMN portfolio_shares.access_type IS 'Access type: public, private, one-time, temporary, fingerprint';
COMMENT ON COLUMN portfolio_shares.password_hash IS 'Bcrypt hash for password protection';
COMMENT ON COLUMN portfolio_shares.otp_code IS 'Current OTP code for verification';
COMMENT ON COLUMN portfolio_shares.access_log IS 'JSON array of access attempts with metadata';
