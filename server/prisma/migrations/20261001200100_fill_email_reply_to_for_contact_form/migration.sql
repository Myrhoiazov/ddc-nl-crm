-- One-time data fix for emails synced before `reply_to_address` existed.
-- Website contact-form emails are sent as the site (wordpress@...) and start with a line such as
-- "От: <name> <visitor email>". Verified against the mailbox: for every such message that address
-- equals the real Reply-To header. WordPress system notices have no such line and stay untouched.
UPDATE `email_messages`
SET `reply_to_address` = LOWER(REGEXP_SUBSTR(SUBSTRING_INDEX(`body_text`, CHAR(10), 1), '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+[.][A-Za-z]{2,}'))
WHERE `is_outgoing` = 0
  AND `reply_to_address` IS NULL
  AND `from_address` LIKE 'wordpress@%'
  AND SUBSTRING_INDEX(`body_text`, CHAR(10), 1) REGEXP '^[^:]{1,20}: .*@';
