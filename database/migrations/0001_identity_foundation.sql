-- Base estrutural local. Sem usuários, credenciais ou dados comerciais.
-- Não oferece autenticação funcional; integração e autorização pertencem à Fase 1.
PRAGMA foreign_keys = ON;
CREATE TABLE organizations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  identity_subject TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE TABLE memberships (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK(role IN ('owner', 'operator')),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX memberships_user_id ON memberships(user_id);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL CHECK(expires_at > 0),
  FOREIGN KEY (organization_id, user_id) REFERENCES memberships(organization_id, user_id) ON DELETE CASCADE
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
