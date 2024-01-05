CREATE TABLE Browser_Compat_Data_Latest (
    hash TEXT PRIMARY KEY NOT NULL,
    FOREIGN KEY (hash) REFERENCES Browser_Compat_Data_Hashes(hash)
);

CREATE TABLE Browser_Compat_Data_Hashes (
    hash TEXT PRIMARY KEY,
    date TEXT NOT NULL
);

CREATE TABLE Browser_Compat_Data_Keys (
    key TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    FOREIGN KEY (hash) REFERENCES Browser_Compat_Data_Hashes(hash)
    UNIQUE (key, hash)
);
