-- Роль DOCTOR удалена: она нигде не использовалась и не давала отдельных прав.
-- Если такая учётная запись всё же есть, она становится отключённым MANAGER — доступ
-- администратор возвращает вручную, а сужение enum не падает на «Data truncated».
UPDATE `users` SET `role` = 'MANAGER', `isEnabled` = false WHERE `role` = 'DOCTOR';

ALTER TABLE `users` MODIFY `role` ENUM('ADMIN', 'MANAGER') NOT NULL DEFAULT 'MANAGER';
