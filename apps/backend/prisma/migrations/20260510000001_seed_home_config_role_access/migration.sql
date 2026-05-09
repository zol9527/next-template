-- 为 admin 角色添加首页 Banner 配置的访问权限
-- 使用 ON DUPLICATE KEY UPDATE 实现幂等，可安全重复执行

INSERT INTO `role_access` (`id`, `role_id`, `action`, `scope`)
SELECT
  CONCAT('home-config-read-', r.id),
  r.id,
  'read',
  'miniprogram.home-config'
FROM `roles` r
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE `scope` = `scope`;

INSERT INTO `role_access` (`id`, `role_id`, `action`, `scope`)
SELECT
  CONCAT('home-config-write-', r.id),
  r.id,
  'write',
  'miniprogram.home-config'
FROM `roles` r
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE `scope` = `scope`;

INSERT INTO `role_access` (`id`, `role_id`, `action`, `scope`)
SELECT
  CONCAT('home-config-execute-', r.id),
  r.id,
  'execute',
  'miniprogram.home-config'
FROM `roles` r
WHERE r.name = 'admin'
ON DUPLICATE KEY UPDATE `scope` = `scope`;
