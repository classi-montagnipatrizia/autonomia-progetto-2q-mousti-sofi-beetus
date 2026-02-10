# Dockerfile per Spring Boot Backend
# Build stage
FROM maven:3.9-eclipse-temurin-25 AS build

WORKDIR /app

# Copia i file di configurazione Maven
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Copia il codice sorgente
COPY src ./src

# Build dell'applicazione
RUN mvn clean package -DskipTests

# Runtime stage
FROM eclipse-temurin:25-jre-alpine

RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

WORKDIR /app

# Installa curl per health checks
RUN apk add --no-cache curl

# Copia il JAR dal build stage
COPY --from=build /app/target/*.jar app.jar

# Crea directory per upload immagini
RUN mkdir -p /app/uploads && \
    chown -R appuser:appuser /app

USER appuser

# Esponi la porta
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/actuator/health || exit 1

# Configurazioni JVM ottimizzate per container
ENTRYPOINT ["java", \
    "-XX:+UseContainerSupport", \
    "-XX:MaxRAMPercentage=75.0", \
    "-XX:InitialRAMPercentage=50.0", \
    "-Djava.security.egd=file:/dev/./urandom", \
    "-Dspring.profiles.active=${SPRING_PROFILE:docker}", \
    "-jar", \
    "app.jar"]