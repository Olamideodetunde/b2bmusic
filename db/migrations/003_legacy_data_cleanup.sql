-- One-off cleanup of the pre-launch demo/test data in the original Neon database
-- (approved 2026-09-29; full backup in db/backups/ taken beforehand).
-- Every statement is guarded by id AND title, so on any other database it matches nothing.

-- 1. Move legacy genres onto the Google Sheet dropdown list. Slugs (live URLs) are unchanged.
UPDATE tracks SET genre = 'Corporate / Tech', updated_at = now() WHERE genre IN ('Tech Ambient', 'Tech Lo-Fi');
UPDATE tracks SET genre = 'Electronic',       updated_at = now() WHERE genre = 'Commercial Pop';
UPDATE tracks SET genre = 'Folk & Acoustic',  updated_at = now() WHERE genre = 'Acoustic Folk';
UPDATE tracks SET genre = 'Cinematic',        updated_at = now() WHERE genre = 'Cinematic Hybrid';
UPDATE tracks SET genre = 'Ambient',          updated_at = now() WHERE genre = 'Minimalist Modern';

-- 2. Remove the two test rows. "Apex Solar Horizon Test" occupies the slug the sheet's
--    "Apex Solar Pulse" row needs; "Quantum Frontier" has a non-dropdown genre and
--    inverted prices (Commercial < Standard).
DELETE FROM tracks WHERE id = 8  AND title = 'Apex Solar Horizon Test';
DELETE FROM tracks WHERE id = 10 AND title = 'Quantum Frontier';
