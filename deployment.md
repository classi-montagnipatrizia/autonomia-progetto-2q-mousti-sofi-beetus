# Deploy BeetUs — Guida VM

> **Prerequisiti già completati**: dominio `beetus.me` su Cloudflare, `environment.ts` con `api.beetus.me`, frontend su Vercel, CORS configurato.
> Questa guida parte dal momento in cui sei connesso alla VM via SSH.

---

## 1. Accesso SSH

```bash
ssh utente@IP_DELLA_VM
```

Rimuovi la sorgente CDROM (residuo dell'installazione) e aggiorna il sistema:
```bash
sudo sed -i '/cdrom/d' /etc/apt/sources.list
sudo apt update && sudo apt upgrade -y
```

---

## 2. Installa Docker

```bash
sudo apt remove -y docker docker-engine docker.io containerd runc docker-buildx docker-compose 2>/dev/null
sudo apt install -y ca-certificates curl gnupg lsb-release git

sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

> Se `VERSION_CODENAME` fallisce (Debian 13), sostituiscilo con `bookworm`.

Aggiungi il tuo utente al gruppo Docker, poi **disconnettiti e riconnettiti**:
```bash
sudo usermod -aG docker $USER
exit
# riconnettiti via SSH
```

Verifica:
```bash
docker run hello-world
# Deve stampare: Hello from Docker!
```

---

## 3. Installa cloudflared

```bash
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb \
  -o cloudflared.deb
sudo dpkg -i cloudflared.deb
cloudflared --version
```

---

## 4. Clona il repository

```bash
sudo mkdir -p /opt/beetus
sudo chown $USER:$USER /opt/beetus
cd /opt/beetus
git clone https://github.com/classi-montagnipatrizia/autonomia-progetto-2q-mousti-sofi-beetus.git .
```

> Se il repo è privato: usa username + Personal Access Token GitHub (non la password).

---


## 6. Primo avvio dei container

```bash
cd /opt/beetus
docker compose --env-file ./backend/.env up -d --build
```

La prima compilazione del backend richiede **5–10 minuti**. Monitora:
```bash
docker compose logs -f backend
```

Aspetta la riga: `Started BackendApplication in X.XXX seconds`

Verifica che tutti e tre i container siano su:
```bash
docker compose ps
```

Output atteso:
```
NAME                STATUS
beetus_postgres     Up (healthy)
beetus_backend      Up (healthy)
beetus_nginx        Up
```

Test locale:
```bash
curl http://localhost/actuator/health
# {"status":"UP"}
```

---

## 7. Cloudflare Tunnel permanente

```bash
cloudflared tunnel login
```

Si apre un link nel terminale — aprilo nel browser, seleziona `beetus.me` e autorizza.

```bash
cloudflared tunnel create beetus
```

L'output mostra: `Created tunnel beetus with id XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`  
Copia il `TUNNEL-UUID`.

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Contenuto (sostituisci `TUNNEL-UUID` e `TUO-UTENTE`):
```yaml
tunnel: TUNNEL-UUID
credentials-file: /home/TUO-UTENTE/.cloudflared/TUNNEL-UUID.json

ingress:
  - hostname: api.beetus.me
    service: http://localhost:80
  - service: http_status:404
```

> Verifica il percorso home con `echo $HOME`.

Aggiungi il record DNS su Cloudflare:
```bash
cloudflared tunnel route dns beetus api.beetus.me
```

Installa come servizio di sistema (si avvia automaticamente dopo reboot):
```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Verifica:
```bash
sudo systemctl status cloudflared
curl https://api.beetus.me/actuator/health
# {"status":"UP"}
```

---

## 8. Backup automatico (settimanale)

```bash
mkdir -p /opt/beetus/scripts /opt/beetus/backups

tee /opt/beetus/scripts/backup.sh << 'EOF'
#!/bin/bash
set -eo pipefail
cd /opt/beetus

DB_USERNAME=$(grep '^DB_USERNAME=' backend/.env | cut -d '=' -f2)

mkdir -p backups
FILE="backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz"

docker compose --env-file ./backend/.env exec -T postgres \
  pg_dump -U "$DB_USERNAME" beetUs_db | gzip > "$FILE"

ls -t backups/backup_*.sql.gz | tail -n +8 | xargs -r rm
echo "$(date): backup OK → $FILE"
EOF

chmod +x /opt/beetus/scripts/backup.sh

# Ogni domenica alle 3:00
(crontab -l 2>/dev/null; echo "0 3 * * 0 /opt/beetus/scripts/backup.sh >> /var/log/beetus-backup.log 2>&1") | crontab -
```

---

## 9. Verifica finale

```bash
curl https://api.beetus.me/actuator/health   # {"status":"UP"}
curl https://api.beetus.me/api/users/me      # 401 Unauthorized (backend risponde)
```

Apri `https://beetus.me` nel browser e verifica:
- Login funziona
- Feed carica i post
- Messaggi real-time funzionano (WebSocket)

---

## Comandi utili

```bash
# Aggiornamento app (dopo git push)
cd /opt/beetus && git pull
docker compose --env-file ./backend/.env up -d --build backend

# Stato e log
docker compose ps
docker compose logs -f backend

# Riavvio backend
docker compose --env-file ./backend/.env restart backend

# Tunnel
sudo systemctl status cloudflared
sudo systemctl restart cloudflared

# Backup manuale
/opt/beetus/scripts/backup.sh

# Shell nel container
docker compose exec backend sh
docker compose exec postgres psql -U postgres beetUs_db
```

---

## Troubleshooting

| Sintomo | Causa | Fix |
|---|---|---|
| Backend non parte | Variabile env mancante | `docker compose logs backend --tail=50` |
| nginx 502 Bad Gateway | Backend ancora in avvio (~90s) | Aspetta e riprova |
| Tunnel non si connette | nginx non risponde | `docker compose ps` → `docker compose logs nginx` |
| Errori CORS nel browser | CORS_ALLOWED_ORIGINS errato | Controlla `.env`, riavvia backend |
| WebSocket non si connette | `wsUrl` sbagliato | Verifica `environment.ts`: `https://api.beetus.me/ws` |
