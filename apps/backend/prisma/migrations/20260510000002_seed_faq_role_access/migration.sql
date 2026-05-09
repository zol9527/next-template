-- 为 admin 角色添加常见问题管理的访问权限
-- 使用 ON DUPLICATE KEY UPDATE 实现幂等，可安全重复执行

INSERT INTO `role_access` (`id`, `role_id`, `action`, `scope`)
SELECT
  CONCAT('faq-read-', r.id),
  r.id,
  'read',
  'miniprogram.faq'
FROM `roles` r
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE `scope` = `scope`;

INSERT INTO `role_access` (`id`, `role_id`, `action`, `scope`)
SELECT
  CONCAT('faq-write-', r.id),
  r.id,
  'write',
  'miniprogram.faq'
FROM `roles` r
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE `scope` = `scope`;

INSERT INTO `role_access` (`id`, `role_id`, `action`, `scope`)
SELECT
  CONCAT('faq-execute-', r.id),
  r.id,
  'execute',
  'miniprogram.faq'
FROM `roles` r
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE `scope` = `scope`;
