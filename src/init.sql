CREATE TABLE browser_compat_data_hashes (
    commit_hash TEXT PRIMARY KEY NOT NULL,
    commit_date TEXT NOT NULL
);

CREATE TABLE browser_compat_data_latest (
    commit_hash TEXT PRIMARY KEY NOT NULL,
    FOREIGN KEY (commit_hash) REFERENCES browser_compat_data_hashes(commit_hash),
);

CREATE TABLE browser_compat_data_keys (
    key TEXT PRIMARY KEY,
    hash TEXT NOT NULL,
    FOREIGN KEY (hash) REFERENCES browser_compat_data_hashes(hash)
    UNIQUE (key, hash)
);
