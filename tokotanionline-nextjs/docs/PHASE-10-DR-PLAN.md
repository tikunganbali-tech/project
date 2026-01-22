# PHASE 10 - Disaster Recovery (DR) Plan

**Last Updated:** 2026-01-XX  
**Status:** Production Ready

---

## Overview

This document outlines the Disaster Recovery (DR) plan for the TokoTani Online system. It provides procedures for recovering from various disaster scenarios.

---

## 1. Backup Strategy

### 1.1 Database Backups

**Frequency:** Daily (automated)  
**Retention:** 14 days  
**Location:** `./backups/` directory

**Manual Backup:**
```bash
npm run phase10:backup
```

**Restore from Backup:**
```bash
npm run phase10:restore <backup-file> --confirm
```

### 1.2 Application Backups

**Frequency:** Before each deployment  
**Location:** `.deploy-backups/` directory

**Create Backup:**
- Automated before deployment
- Manual: Use deployment process backup feature

---

## 2. Recovery Scenarios

### 2.1 Database Corruption/Loss

**Symptoms:**
- Database connection errors
- Data inconsistencies
- Application errors

**Recovery Steps:**

1. **Stop Application:**
   ```bash
   # Stop Next.js
   pm2 stop tokotani-nextjs
   
   # Stop Engine Hub
   pm2 stop tokotani-engine-hub
   ```

2. **Identify Latest Backup:**
   ```bash
   ls -lh backups/ | tail -5
   ```

3. **Restore Database:**
   ```bash
   npm run phase10:restore backup_YYYY-MM-DD_HH-mm-ss.sql.gz --confirm
   ```

4. **Verify Restore:**
   ```bash
   # Check database connection
   npm run prisma:studio
   ```

5. **Restart Application:**
   ```bash
   pm2 restart tokotani-nextjs
   pm2 restart tokotani-engine-hub
   ```

6. **Verify System:**
   ```bash
   curl https://your-domain.com/api/health
   ```

**Recovery Time Objective (RTO):** 30 minutes  
**Recovery Point Objective (RPO):** 24 hours (last daily backup)

---

### 2.2 Application Deployment Failure

**Symptoms:**
- Application crashes after deployment
- Errors in logs
- Service unavailable

**Recovery Steps:**

1. **Immediate Rollback:**
   ```bash
   npm run phase10:rollback --version=<previous-version> --confirm
   ```

2. **Verify Rollback:**
   ```bash
   curl https://your-domain.com/api/health
   ```

3. **Investigate Issue:**
   - Check logs: `pm2 logs tokotani-nextjs`
   - Review deployment changes
   - Fix issue in development

4. **Redeploy After Fix:**
   - Test in staging
   - Deploy to production

**RTO:** 15 minutes  
**RPO:** 0 (no data loss)

---

### 2.3 Server/Infrastructure Failure

**Symptoms:**
- Server unreachable
- Complete service outage
- Infrastructure alerts

**Recovery Steps:**

1. **Assess Situation:**
   - Check server status
   - Verify network connectivity
   - Review infrastructure alerts

2. **Activate Backup Server (if available):**
   - Provision new server
   - Restore from latest backup
   - Update DNS records

3. **Or Restore on New Infrastructure:**
   ```bash
   # On new server
   git clone <repository>
   npm install
   npm run phase10:restore <latest-backup> --confirm
   npm run build
   pm2 start ecosystem.config.js
   ```

4. **Update DNS:**
   - Point domain to new server IP
   - Wait for DNS propagation

5. **Verify System:**
   ```bash
   npm run phase10:load-test --url=https://your-domain.com
   ```

**RTO:** 2-4 hours  
**RPO:** 24 hours (last backup)

---

### 2.4 Security Breach

**Symptoms:**
- Unauthorized access detected
- Suspicious activity in logs
- Data exfiltration alerts

**Recovery Steps:**

1. **Immediate Actions:**
   - Isolate affected systems
   - Change all secrets (see Secret Rotation)
   - Revoke compromised credentials

2. **Assess Damage:**
   - Review audit logs
   - Identify compromised data
   - Determine attack vector

3. **Rotate Secrets:**
   ```bash
   # Via admin API
   POST /api/admin/secrets/rotate
   {
     "secretType": "NEXTAUTH_SECRET"
   }
   ```

4. **Restore from Clean Backup:**
   - Use backup from before breach
   - Verify backup integrity
   - Restore database

5. **Harden Security:**
   - Review security headers
   - Update dependencies
   - Implement additional monitoring

6. **Notify Stakeholders:**
   - Document incident
   - Notify affected users (if required)
   - Report to authorities (if required)

**RTO:** 4-8 hours  
**RPO:** Variable (depends on breach timeline)

---

## 3. Emergency Contacts

### 3.1 Technical Team

- **Lead Developer:** [Contact]
- **DevOps Engineer:** [Contact]
- **Database Administrator:** [Contact]

### 3.2 Infrastructure Provider

- **Hosting Provider:** [Contact]
- **DNS Provider:** [Contact]
- **CDN Provider:** [Contact]

### 3.3 Escalation Path

1. **Level 1:** Technical Team (0-2 hours)
2. **Level 2:** Management (2-4 hours)
3. **Level 3:** External Support (4+ hours)

---

## 4. Testing & Validation

### 4.1 DR Plan Testing

**Frequency:** Quarterly

**Test Scenarios:**
1. Database restore test
2. Application rollback test
3. Full system recovery test

**Test Procedure:**
```bash
# 1. Create test environment
# 2. Simulate disaster scenario
# 3. Execute recovery steps
# 4. Verify system functionality
# 5. Document results
```

### 4.2 Backup Verification

**Frequency:** Weekly

**Procedure:**
```bash
# Verify backup integrity
npm run phase10:backup --restore-test
```

---

## 5. Maintenance

### 5.1 Regular Tasks

- **Daily:** Automated backups
- **Weekly:** Backup verification
- **Monthly:** Review DR plan
- **Quarterly:** DR plan testing

### 5.2 Documentation Updates

- Update contacts quarterly
- Review procedures after incidents
- Update RTO/RPO based on business needs

---

## 6. Post-Recovery

### 6.1 Verification Checklist

- [ ] All services running
- [ ] Database integrity verified
- [ ] Application functionality tested
- [ ] Monitoring alerts cleared
- [ ] Users notified (if applicable)

### 6.2 Incident Report

Document:
- Incident timeline
- Root cause
- Recovery steps taken
- Lessons learned
- Improvements needed

---

## 7. Appendices

### 7.1 Backup Locations

- **Database:** `./backups/`
- **Application:** `.deploy-backups/`
- **Configuration:** Version controlled (Git)

### 7.2 Recovery Scripts

- `scripts/backup-database.ts` - Database backup
- `scripts/restore-database.ts` - Database restore
- `scripts/rollback-deploy.ts` - Application rollback

### 7.3 Monitoring Endpoints

- Health: `/api/health`
- Metrics: `/api/metrics`
- Alerts: `/api/alerts`

---

**Document Owner:** DevOps Team  
**Review Date:** Quarterly  
**Next Review:** [Date]
