CREATE TABLE browser_compat_data_hashes (
    commit_hash TEXT PRIMARY KEY NOT NULL,
    commit_date TEXT NOT NULL
);

CREATE TABLE browser_compat_data_latest (
    commit_hash TEXT PRIMARY KEY NOT NULL,
    FOREIGN KEY (commit_hash) REFERENCES browser_compat_data_hashes(commit_hash),
);

CREATE TABLE browser_compat_data_keys (
    feature_key TEXT PRIMARY KEY NOT NULL,
    commit_hash TEXT NOT NULL,
    FOREIGN KEY (commit_hash) REFERENCES browser_compat_data_hashes(commit_hash)
    UNIQUE (feature_key, commit_hash)
);
