CREATE TABLE students (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    discord_id      TEXT NOT NULL UNIQUE,
    github_username TEXT NOT NULL UNIQUE
); 
