#!/usr/bin/env bash
# ==============================================================================
# Orqiva ERP - Ubuntu 24.04 LTS (Noble Numbat) Production Provisioning Script
# Domain: Infrastructure, Production Hardening & Container Runtime
# Security: Strict Least-Privilege, Non-Root Defaults, UFW, Fail2ban
# ==============================================================================

set -euo pipefail

# ------------------------------------------------------------------------------
# Colorized Output Formatting
# ------------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
AMBER='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
  echo -e "${AMBER}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1" >&2
}

# ------------------------------------------------------------------------------
# 1. Preflight Validation
# ------------------------------------------------------------------------------
echo -e "${CYAN}"
cat << "EOF"
  ___  ____   ___  _____     ___      _____ ____  ____  
 / _ \|  _ \ / _ \|_   _|   / \ \    / /   |  _ \|  _ \ 
| | | | |_) | | | | | |    / _ \ \  / /| | | |_) | |_) |
| |_| |  _ <| |_| | | |   / ___ \ \/ / | | |  _ <|  __/ 
 \___/|_| \_\\__\_\ |_|  /_/   \_\__/  |_| |_| \_\_|    
   Enterprise Modular Monolith - Production Hardening
EOF
echo -e "${NC}"

if [[ "${EUID}" -ne 0 ]]; then
  log_error "This provisioning script must be run as root or with sudo privileges."
  exit 1
fi

log_info "Verifying Operating System distribution..."
if [[ -f /etc/os-release ]]; then
  . /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]]; then
    log_warn "Target OS is ${NAME:-Unknown}. Optimized specifically for Ubuntu 24.04 LTS."
  else
    log_info "Detected ${PRETTY_NAME} (${VERSION_CODENAME})."
  fi
else
  log_warn "Could not read /etc/os-release. Proceeding with caution..."
fi

PROJECT_DIR="/opt/orqiva-erp"
APP_USER="orqiva"
APP_GROUP="orqiva"
BACKUP_DIR="${PROJECT_DIR}/backups"
LOG_DIR="/var/log/orqiva-erp"

# ------------------------------------------------------------------------------
# 2. Base System Upgrades & Essential Security Utilities
# ------------------------------------------------------------------------------
log_info "Step 1/6: Updating package repositories and essential utilities..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y

log_info "Installing security, networking, and system dependencies..."
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  ufw \
  fail2ban \
  jq \
  htop \
  unzip \
  tar \
  gzip \
  cron \
  rsyslog \
  procps

log_success "Base system packages updated and security tools installed."

# ------------------------------------------------------------------------------
# 3. Docker Engine & Docker Compose Plugin Installation (Official Repo)
# ------------------------------------------------------------------------------
log_info "Step 2/6: Installing official Docker Engine and Docker Compose plugin..."

install -m 0755 -d /etc/apt/keyrings
if [[ ! -f /etc/apt/keyrings/docker.asc ]]; then
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
fi

UBUNTU_CODENAME_VAL="${UBUNTU_CODENAME:-${VERSION_CODENAME:-noble}}"
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${UBUNTU_CODENAME_VAL} stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y --no-install-recommends \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

systemctl enable --now docker
log_success "Docker Engine $(docker --version | awk '{print $3}') installed and running."

# ------------------------------------------------------------------------------
# 4. Service Account & Directory Permissions (Least Privilege)
# ------------------------------------------------------------------------------
log_info "Step 3/6: Establishing dedicated unprivileged system account..."

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd -r -s /usr/sbin/nologin -d "${PROJECT_DIR}" -m -c "Orqiva ERP System Service" "${APP_USER}"
  log_info "Created system user '${APP_USER}'."
else
  log_info "System user '${APP_USER}' already exists."
fi

usermod -aG docker "${APP_USER}"

# If script executed via sudo, grant the invoking user access to docker
if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  usermod -aG docker "${SUDO_USER}"
  log_info "Added sudo operator '${SUDO_USER}' to 'docker' group."
fi

log_info "Provisioning production directory structure at ${PROJECT_DIR}..."
mkdir -p "${PROJECT_DIR}/deploy/nginx"
mkdir -p "${PROJECT_DIR}/deploy/ssl"
mkdir -p "${BACKUP_DIR}"
mkdir -p "${LOG_DIR}"

chown -R "${APP_USER}:${APP_GROUP}" "${PROJECT_DIR}" "${LOG_DIR}"
chmod 750 "${PROJECT_DIR}"
chmod 700 "${BACKUP_DIR}"
chmod 750 "${LOG_DIR}"
log_success "Directory layout and permissions secured."

# ------------------------------------------------------------------------------
# 5. UFW Firewall Configuration (Strict Ports: 22, 80, 443)
# ------------------------------------------------------------------------------
log_info "Step 4/6: Configuring Uncomplicated Firewall (UFW) with strict ingress policies..."

ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Strictly allow SSH, HTTP, and HTTPS
ufw allow 22/tcp comment 'SSH Secure Administration'
ufw allow 80/tcp comment 'HTTP ACME Challenge & SSL Redirect'
ufw allow 443/tcp comment 'HTTPS Secure ERP Web Application'

# Enable firewall non-interactively
ufw --force enable
log_success "UFW firewall activated with strict allowlist (Ports 22, 80, 443 only)."

# ------------------------------------------------------------------------------
# 6. Fail2ban Brute-Force Protection
# ------------------------------------------------------------------------------
log_info "Step 5/6: Configuring Fail2ban intrusion prevention..."

cat << 'EOF' > /etc/fail2ban/jail.local
[DEFAULT]
bantime  = 1h
findtime = 10m
maxretry = 5
banaction = ufw
backend  = systemd

[sshd]
enabled  = true
port     = 22
mode     = aggressive
maxretry = 3
bantime  = 24h

[nginx-http-auth]
enabled = true
port    = http,https
logpath = %(nginx_error_log)s

[nginx-botsearch]
enabled = true
port    = http,https
logpath = %(nginx_error_log)s
maxretry = 2
EOF

systemctl enable --now fail2ban
systemctl restart fail2ban
log_success "Fail2ban configured with aggressive SSH and HTTP jail policies."

# ------------------------------------------------------------------------------
# 7. Automated Database Backup Cron Registration
# ------------------------------------------------------------------------------
log_info "Step 6/6: Registering automated backup cron schedule (02:00 AM Daily)..."

cat << EOF > /etc/cron.d/orqiva-backup
# Orqiva ERP Production Daily Database Backup
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
0 2 * * * root /opt/orqiva-erp/deploy/backup-db.sh >> /var/log/orqiva-backup.log 2>&1
EOF

chmod 0644 /etc/cron.d/orqiva-backup
log_success "Cron job registered at /etc/cron.d/orqiva-backup."

# ------------------------------------------------------------------------------
# Verification & Completion Summary
# ------------------------------------------------------------------------------
echo ""
echo -e "${GREEN}================================================================${NC}"
echo -e "${GREEN}  ORQIVA ERP - UBUNTU 24.04 PROVISIONING COMPLETE!             ${NC}"
echo -e "${GREEN}================================================================${NC}"
echo -e " • Docker Version:      $(docker --version 2>/dev/null || echo 'Installed')"
echo -e " • Docker Compose:      $(docker compose version 2>/dev/null || echo 'Installed')"
echo -e " • UFW Status:          Active (Ports 22, 80, 443 allowed)"
echo -e " • Fail2ban Status:     Active ($(systemctl is-active fail2ban))"
echo -e " • Project Directory:   ${PROJECT_DIR} (Owner: ${APP_USER}:${APP_GROUP})"
echo -e " • Backup Directory:    ${BACKUP_DIR} (14-day rotation)"
echo -e " • Log Directory:       ${LOG_DIR}"
echo -e "${GREEN}================================================================${NC}"
echo ""
