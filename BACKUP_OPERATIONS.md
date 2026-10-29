# Free encrypted backup plan

The scheduled workflow is disabled until the owner authorizes its new production read access. No paid plan is selected.

The proposed dedicated `bajihears_backup` login uses PostgreSQL's `pg_read_all_data` plus RLS bypass. It can read the entire database, including private posts, authentication/session information and other schemas. It has no table write, schema creation, administrative or privileged application RPC permissions. This remains a sensitive credential. Only this login—not the production administrator credential—may enter GitHub Actions Secrets.

Daily job: consistent read-only snapshot of public/auth/migration schemas; isolated restore checks for all table counts, foreign keys, owners, RLS flags, policies and RPC/table grants; encrypt with RSA-4096/OAEP-SHA256 plus AES-256-GCM; retain ciphertext artifacts for 30 days. No plaintext dump or private key is uploaded. A failed backup/restore fails the job. GitHub Actions limits and failure notifications must remain monitored; current small snapshots fit free allowances, but future growth is not guaranteed free. Public schedules may be disabled after prolonged repository inactivity.

The private key is protected by Windows DPAPI outside OneDrive. A separate, cryptographically random 256-bit recovery code unlocks the encrypted private-key capsule in `config/backup-key-recovery.enc`; it is unrelated to the database password. Keep the recovery code in a password manager or offline storage independent of this computer. Do not share it in chat or put it in GitHub. Losing both the Windows profile and this code makes backups unrecoverable.

Local recovery code: `C:/Users/mughe/AppData/Local/BajiHears/recovery/RECOVERY-CODE.txt`. Local current backups: `C:/Users/mughe/AppData/Local/BajiHears/backups/`. These are outside the synced project. Restore scratch data uses bounded, disposable OS temporary directories, never the repository or OneDrive. The portable recovery test uses the exported code and capsule instead of the Windows private-key store.

Historical backups were migrated outside OneDrive, with new encrypted archives and exact original files preserved privately for safety. A pre-existing plaintext original remains in the private `legacy/originals` directory; it is not claimed encrypted. Neither migration nor cleanup proves older OneDrive copies/version history were removed. No historical cloud copy was purged automatically.

This database backup excludes Cloudflare/Supabase project configuration, OAuth provider settings, external secrets and storage objects. The current app uses text/database data; provider configuration is documented separately. Any real production restore is a separate authorized incident action; the verifier can restore only to a fresh loopback instance. The code does not restore into production.

After owner approval: install the reviewed backup-only production login, verify its complete snapshot/restore, store only its URL in `BAJIHEARS_BACKUP_DATABASE_URL`, enable `BAJIHEARS_BACKUPS_ENABLED`, run the workflow, download its actual encrypted artifact and verify recovery with the separately held code. Confirm failure notifications and the first scheduled run before claiming unattended recovery complete.
