-- Executado automaticamente pelo Postgres no primeiro start do container
-- (docker-entrypoint-initdb.d). O schema real é versionado via Alembic
-- (backend/alembic/), não aqui — este arquivo só existe para o hook de
-- inicialização do container ter algo a rodar.
SELECT 1;
