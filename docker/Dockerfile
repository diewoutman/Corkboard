# Builds one image containing both the Angular frontend (served as static
# files) and the ASP.NET Core API. Postgres is NOT included — point the
# running container at a Postgres instance you host yourself.
#
# Build from the repository root so both backend/ and frontend/ are in the
# build context:
#   docker build -f docker/Dockerfile -t corkboard .

# ---- frontend build -------------------------------------------------------
FROM node:22-alpine AS frontend-build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# Output lands in frontend/www (angular.json outputPath), served as-is below.

# ---- backend build ----------------------------------------------------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend-build
WORKDIR /src
COPY backend/ ./backend/
RUN dotnet publish backend/src/Corkboard.Api/Corkboard.Api.csproj \
    -c Release -o /app/publish

# ---- runtime ----------------------------------------------------------
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=backend-build /app/publish .
COPY --from=frontend-build /src/frontend/www ./wwwroot

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Corkboard.Api.dll"]
