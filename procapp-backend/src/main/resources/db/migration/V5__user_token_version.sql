-- Session revocation. JWTs are stateless, so before this a disabled or
-- demoted user's token kept working until it expired (up to 10 hours), and
-- "logout" only discarded the browser's copy.
--
-- Every token now carries the user's token_version at issue time, and the
-- JWT filter rejects any token whose version no longer matches this column.
-- Bumping it therefore invalidates every outstanding token for the user at
-- once. It is bumped on deactivation, role change, password change and
-- logout. Existing tokens carry no version and are rejected, so everyone
-- signs in once after this deploys.

ALTER TABLE users ADD COLUMN token_version INT NOT NULL DEFAULT 0;
