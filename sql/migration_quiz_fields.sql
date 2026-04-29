-- =================================================================
-- Migration: adicionar campos do quiz à tabela leads
-- Roda em produção uma vez. database.sql já contém o schema completo
-- pra instalações novas; isso aqui é só pra bancos que já existiam.
-- =================================================================

ALTER TABLE leads
  ADD COLUMN objetivo     VARCHAR(40) NULL AFTER faixa_renda,
  ADD COLUMN spc          VARCHAR(40) NULL AFTER objetivo,
  ADD COLUMN entrada      VARCHAR(40) NULL AFTER spc,
  ADD COLUMN parcela      VARCHAR(40) NULL AFTER entrada,
  ADD COLUMN proprietario VARCHAR(40) NULL AFTER parcela,
  ADD COLUMN urgencia     VARCHAR(40) NULL AFTER proprietario,
  ADD INDEX idx_urgencia (urgencia),
  ADD INDEX idx_objetivo (objetivo);
