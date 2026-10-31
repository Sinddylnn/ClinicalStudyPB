-- <-------------------MOTIVO DO ENCERRAMENTO DO ESTUDO------------------->
-- Preserva estudos existentes. A obrigatoriedade no encerramento antecipado
-- depende do estado de origem e é validada pelo domínio antes da alteração.
ALTER TABLE estudos
    ADD COLUMN justificativa_encerramento VARCHAR(500);

ALTER TABLE estudos
    ADD CONSTRAINT ck_estudos_justificativa_encerramento
    CHECK (justificativa_encerramento IS NULL
        OR CHAR_LENGTH(BTRIM(justificativa_encerramento)) BETWEEN 1 AND 500);
