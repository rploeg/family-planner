-- Family Planner - Sample Data
-- Run this on the Windows Server to populate initial family members

-- Insert family members
INSERT INTO family_members (id, name, role, email, status, avatar, isAdmin, createdAt, updatedAt) VALUES
('remco-id', 'Remco', 'Vader', 'remco@example.com', 'home', '👨', 1, datetime('now'), datetime('now')),
('josefien-id', 'Josefien', 'Moeder', 'josefien@example.com', 'home', '👩', 1, datetime('now'), datetime('now')),
('laurens-id', 'Laurens', 'Zoon', 'laurens@example.com', 'home', '👦', 0, datetime('now'), datetime('now'));

-- Verify the data
SELECT * FROM family_members;
