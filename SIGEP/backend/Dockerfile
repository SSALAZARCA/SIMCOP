# Build stage
FROM maven:3.9.6-eclipse-temurin-17-alpine AS build
WORKDIR /app
ENV MAVEN_OPTS="-Xmx512m -Xms128m"
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
ENV JAVA_OPTS="-Xms128m -Xmx512m"
EXPOSE 4000
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
