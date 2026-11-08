-- Fotos privadas; não altera nomes ou imagens dos estabelecimentos.
CREATE TABLE profile_photos (
 organization_id TEXT NOT NULL,
 id TEXT NOT NULL,
 photo BLOB CHECK(photo IS NULL OR length(photo)<=40960),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
 mutation_id TEXT NOT NULL,
 PRIMARY KEY(organization_id,id),
 FOREIGN KEY(organization_id,id) REFERENCES memberships(organization_id,user_id)
);
