# todo.md Phase 33.2 - multi-stage build: compile with Maven, run with a slim Java 21 JRE.
# pom.xml is copied and dependencies resolved before the rest of the source, so this layer
# stays cached across rebuilds that only touch src/.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
