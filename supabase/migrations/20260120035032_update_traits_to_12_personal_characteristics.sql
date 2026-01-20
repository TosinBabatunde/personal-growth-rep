/*
  # Update Traits to 12 Personal Characteristics
  
  1. Changes
    - Replaces existing 7 traits with 12 new personal characteristics
    - Each trait includes a clear, non-judgmental explanation
    - Traits are designed to be growth-oriented and reflective
    - Display order set for consistent presentation
  
  2. New Traits
    1. Personal Hygiene - Cleanliness and grooming
    2. Approachability - Openness and warmth in interactions
    3. Trustworthiness - Reliability and honesty
    4. Friendliness - Warmth in social engagement
    5. Kindness - Empathy and compassion
    6. Thoughtfulness - Intentional consideration
    7. Gentleness - Softness in speech and behavior
    8. Patience - Tolerance and calmness
    9. Helpfulness - Willingness to assist
    10. Listening Ability - Giving full attention
    11. Teachability - Receptiveness to feedback
    12. Selflessness - Considering others' needs
  
  3. Security
    - No changes to RLS policies
*/

-- Delete existing traits (this won't affect existing submissions due to foreign key relationships)
DELETE FROM traits;

-- Insert the 12 new personal characteristics
INSERT INTO traits (name, description, display_order, is_active) VALUES
  (
    'Personal Hygiene',
    'Maintaining cleanliness, grooming, and care for one''s body and environment.',
    1,
    true
  ),
  (
    'Approachability',
    'How open, warm, and safe others feel when interacting with them, including body language, tone, and responsiveness.',
    2,
    true
  ),
  (
    'Trustworthiness',
    'Being reliable, honest, and consistent in words and actions, especially in following through on commitments.',
    3,
    true
  ),
  (
    'Friendliness',
    'Demonstrating warmth, openness, and positive social engagement in everyday interactions.',
    4,
    true
  ),
  (
    'Kindness',
    'Acting with empathy, compassion, and consideration toward others, particularly in difficult or inconvenient moments.',
    5,
    true
  ),
  (
    'Thoughtfulness',
    'Being intentional and considerate, anticipating how actions or words may affect others.',
    6,
    true
  ),
  (
    'Gentleness',
    'Using softness in speech, behaviour, and correction, especially when dealing with sensitive situations or people.',
    7,
    true
  ),
  (
    'Patience',
    'The ability to tolerate delays, mistakes, or differences in pace without irritation or frustration.',
    8,
    true
  ),
  (
    'Helpfulness',
    'Willingness to offer assistance and support without needing recognition or reward.',
    9,
    true
  ),
  (
    'Listening Ability',
    'Giving full attention to others, seeking to understand rather than respond, and avoiding interruption or dismissal.',
    10,
    true
  ),
  (
    'Teachability',
    'Remaining receptive to new ideas, feedback, and perspectives that differ from one''s own.',
    11,
    true
  ),
  (
    'Selflessness',
    'Considering others'' needs and well-being alongside one''s own, without neglecting healthy boundaries.',
    12,
    true
  );
