-- office_days: NULL means the posting doesn't say, 0 means it says fully remote.
-- Earlier imports wrote 0 as a default, so a 0 without any remote wording in
-- remote_note was never a choice. Only a 0 whose note actually says "remote"
-- keeps its meaning. Real day counts are untouched.
UPDATE `vacancies`
SET `office_days` = NULL
WHERE `office_days` = 0
  AND (`remote_note` IS NULL OR lower(`remote_note`) NOT LIKE '%remote%');
