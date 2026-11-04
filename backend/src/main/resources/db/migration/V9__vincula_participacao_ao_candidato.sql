-- <-------------------VÍNCULO HISTÓRICO DA INCLUSÃO------------------->
-- Preserva registros anteriores e permite proteger a avaliação pelo ID do candidato
ALTER TABLE participacoes
    ADD COLUMN candidato_id BIGINT REFERENCES candidatos(id),
    ADD CONSTRAINT uk_participacoes_candidato UNIQUE (candidato_id);

-- Quando já existe um candidato correspondente, recupera o vínculo sem trocar IDs
UPDATE participacoes p
SET candidato_id = c.id
FROM candidatos c, usuarios u
WHERE p.participante_id = u.id
  AND c.estudo_id = p.estudo_id
  AND LOWER(c.email) = LOWER(u.email);
