-- <-------------------COORDENADOR POR ESTUDO------------------->
-- Estudos existentes continuam sem coordenador até a atribuição pelo responsável
-- Uma coluna permite um coordenador por estudo e vários estudos por coordenador

ALTER TABLE estudos
    ADD COLUMN coordenador_id BIGINT,
    ADD CONSTRAINT fk_estudos_coordenador
        FOREIGN KEY (coordenador_id) REFERENCES usuarios (id);

CREATE INDEX idx_estudos_coordenador ON estudos (coordenador_id);
