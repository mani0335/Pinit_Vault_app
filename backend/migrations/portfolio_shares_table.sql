-- Run this in your Supabase SQL Editor to enable portfolio sharing
-- Go to: Supabase Dashboard → SQL Editor → New Query → Paste → Run

CREATE TABLE IF NOT EXISTS portfolio_shares (
    token TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    share_link TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    view_only BOOLEAN DEFAULT TRUE,
    allowed_sections JSONB,
    view_limit INTEGER,
    views_used INTEGER DEFAULT 0,
    watermark BOOLEAN DEFAULT FALSE,
    watermark_text TEXT,
    screenshot_protection BOOLEAN DEFAULT FALSE,
    allowed_countries JSONB,
    allowed_cities JSONB,
    device_bound BOOLEAN DEFAULT FALSE,
    password TEXT,
    revoked_at TIMESTAMPTZ,
    -- Access control: public / link_only / invite_only / private
    access_mode TEXT DEFAULT 'link_only',
    -- Comma-separated or JSONB list of allowed email addresses (invite_only mode)
    allowed_emails JSONB,
    -- Comma-separated or JSONB list of allowed usernames (invite_only mode)
    allowed_usernames JSONB
);

-- Optional: index for faster lookups by portfolio/user
CREATE INDEX IF NOT EXISTS idx_portfolio_shares_portfolio_id ON portfolio_shares(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_shares_user_id ON portfolio_shares(user_id);
