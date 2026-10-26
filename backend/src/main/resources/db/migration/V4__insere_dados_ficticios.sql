-- ============================================================
-- V4 - Dados fictícios para demonstração
-- ============================================================
-- Contas e estudos utilizados somente para facilitar a
-- demonstração das funcionalidades do ClinicalStudyPB.
--
-- Senha fictícia de todas as contas abaixo: Demo@123
-- ============================================================

-- <-------------------USUÁRIOS DE DEMONSTRAÇÃO------------------->

INSERT INTO usuarios (nome, email, senha_hash, perfil, ativo)
VALUES
    (
        'Administrador Demo',
        'admin@clinicalstudypb.test',
        '$2a$10$Pj71M91hrxAfihADRS91D.XSO9fz1TBonqZdPyB9tT0kL7QKvUKhm',
        'ADMINISTRADOR',
        TRUE
    ),
    (
        'Pesquisador Demo',
        'pesquisador@clinicalstudypb.test',
        '$2a$10$Pj71M91hrxAfihADRS91D.XSO9fz1TBonqZdPyB9tT0kL7QKvUKhm',
        'PESQUISADOR',
        TRUE
    ),
    (
        'Coordenador Demo',
        'coordenador@clinicalstudypb.test',
        '$2a$10$Pj71M91hrxAfihADRS91D.XSO9fz1TBonqZdPyB9tT0kL7QKvUKhm',
        'COORDENADOR',
        TRUE
    ),
    (
        'Participante Demo',
        'participante@clinicalstudypb.test',
        '$2a$10$Pj71M91hrxAfihADRS91D.XSO9fz1TBonqZdPyB9tT0kL7QKvUKhm',
        'PARTICIPANTE',
        TRUE
    )
ON CONFLICT DO NOTHING;


-- <-------------------ESTUDOS DE DEMONSTRAÇÃO------------------->

INSERT INTO estudos (
    titulo,
    objetivo,
    responsavel_id,
    coordenador_id,
    data_inicio,
    data_fim,
    limite_participantes,
    estado
)
SELECT
    'Estudo de Acompanhamento Cardiovascular',
    'Avaliar dados fictícios de acompanhamento cardiovascular para demonstração do sistema.',
    pesquisador.id,
    coordenador.id,
    DATE '2026-10-01',
    DATE '2027-03-31',
    30,
    'PLANEJAMENTO'
FROM usuarios pesquisador
JOIN usuarios coordenador
    ON coordenador.email = 'coordenador@clinicalstudypb.test'
WHERE pesquisador.email = 'pesquisador@clinicalstudypb.test'
  AND NOT EXISTS (
      SELECT 1
      FROM estudos
      WHERE titulo = 'Estudo de Acompanhamento Cardiovascular'
  );


INSERT INTO estudos (
    titulo,
    objetivo,
    responsavel_id,
    coordenador_id,
    data_inicio,
    data_fim,
    limite_participantes,
    estado
)
SELECT
    'Estudo de Monitoramento de Atividade Física',
    'Acompanhar informações fictícias sobre atividade física para demonstração das funcionalidades do sistema.',
    pesquisador.id,
    NULL,
    DATE '2026-11-01',
    DATE '2027-05-31',
    20,
    'PLANEJAMENTO'
FROM usuarios pesquisador
WHERE pesquisador.email = 'pesquisador@clinicalstudypb.test'
  AND NOT EXISTS (
      SELECT 1
      FROM estudos
      WHERE titulo = 'Estudo de Monitoramento de Atividade Física'
  );
