-- =================================================================
-- ABC Invest — Schema do banco
-- Criar este banco no painel da Hostinger antes do deploy.
-- Charset utf8mb4 garante suporte a emoji e acentos.
-- =================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------
-- Tabela: leads
-- Captura cada submissão do formulário.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `leads` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `nome` VARCHAR(120) NOT NULL,
    `whatsapp` VARCHAR(20) NOT NULL,
    `cidade` VARCHAR(80) NOT NULL,
    `faixa_renda` VARCHAR(20) NOT NULL,
    -- Campos extras do quiz (v3.4) — todos NULL pois bancos antigos não tinham
    `objetivo` VARCHAR(40) NULL,
    `spc` VARCHAR(40) NULL,
    `entrada` VARCHAR(40) NULL,
    `parcela` VARCHAR(40) NULL,
    `proprietario` VARCHAR(40) NULL,
    `urgencia` VARCHAR(40) NULL,
    `origem` VARCHAR(50) NOT NULL DEFAULT 'site',
    `ip` VARCHAR(45) DEFAULT NULL,
    `user_agent` VARCHAR(500) DEFAULT NULL,
    `enviado_whatsapp` TINYINT(1) NOT NULL DEFAULT 0,
    `enviado_crm` TINYINT(1) NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_created` (`created_at`),
    KEY `idx_cidade` (`cidade`),
    KEY `idx_renda` (`faixa_renda`),
    KEY `idx_urgencia` (`urgencia`),
    KEY `idx_objetivo` (`objetivo`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- -----------------------------------------------------------------
-- Tabela: rate_limits
-- Janela móvel de tentativas por IP / ação. Limpa entradas expiradas
-- automaticamente em cada chamada do limiter.
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `rate_limits` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `ip` VARCHAR(45) NOT NULL,
    `action` VARCHAR(50) NOT NULL DEFAULT 'lead_submit',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `expires_at` TIMESTAMP NOT NULL,
    KEY `idx_ip_action` (`ip`, `action`),
    KEY `idx_expires` (`expires_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
