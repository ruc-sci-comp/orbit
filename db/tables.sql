CREATE TABLE students (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL UNIQUE,
    discord_id      TEXT NOT NULL UNIQUE,
    github_username TEXT NOT NULL UNIQUE
); 

CREATE TABLE assignments(
    id     SERIAL PRIMARY KEY,
    name   TEXT NOT NULL UNIQUE,
    type   TEXT NOT NULL,
    link   TEXT NOT NULL,
    points NUMERIC NOT NULL,
    due    TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE grades(
    id         SERIAL PRIMARY KEY,
    student    INT REFERENCES students(id),
    assignment INT REFERENCES assignments(id),
    points     NUMERIC NOT NULL,
    UNIQUE(student, assignment)
);
