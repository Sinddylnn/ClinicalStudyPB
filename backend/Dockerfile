# syntax=docker/dockerfile:1

# <-------------------COMPILAÇÃO E TESTES COM JAVA 21------------------->
FROM eclipse-temurin:21.0.12.1_1-jdk-jammy AS compilacao
WORKDIR /app

COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
# Mantém o Wrapper executável também em checkouts feitos no Windows
RUN sed -i 's/\r$//' mvnw && chmod +x mvnw
COPY src/ src/
# O Wrapper mantém a versão do Maven definida pelo projeto
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -ntp verify

# <-------------------EXECUÇÃO DA API------------------->
FROM eclipse-temurin:21.0.12.1_1-jre-jammy AS execucao
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 clinical \
    && useradd --uid 10001 --gid clinical --no-create-home clinical
WORKDIR /app
COPY --from=compilacao --chown=clinical:clinical /app/target/clinicalstudypb-*.jar app.jar
USER clinical
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
