# Tailscale Funnel Setup Guide

This guide explains how to expose RepoPilot publicly using Tailscale Funnel for hackathon demos and judge access.

## What is Tailscale Funnel?

Tailscale Funnel allows you to expose a local service to the public internet with HTTPS, without needing:
- A reverse proxy (like Nginx)
- SSL certificates
- Port forwarding
- A public IP address

Perfect for hackathon demos! 🎉

## Prerequisites

- A server/machine running RepoPilot (can be your laptop, cloud VM, or local server)
- Internet connection
- Admin/sudo access to install Tailscale

## Step-by-Step Setup

### Step 1: Install Tailscale on Your Host Server

**Linux/macOS:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

**Windows:**
Download and install from: https://tailscale.com/download/windows

**Verify Installation:**
```bash
tailscale version
```

### Step 2: Authenticate Tailscale

Start Tailscale and authenticate with your account:

```bash
sudo tailscale up
```

This will open a browser window for authentication. Sign in with:
- Google
- GitHub
- Microsoft
- Or create a Tailscale account

After authentication, your machine will be connected to your Tailscale network (tailnet).

### Step 3: Start RepoPilot

Make sure RepoPilot is running on your host machine:

**Using Docker Compose:**
```bash
cd repopilot
docker compose up -d
```

**Or Local Development:**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Verify the frontend is accessible locally at http://localhost:3000

### Step 4: Enable Tailscale Funnel

Enable Funnel to expose port 3000 (frontend) to the public internet:

```bash
sudo tailscale funnel 3000
```

**Important Notes:**
- Tailscale Funnel runs on the HOST machine, NOT inside Docker
- It proxies traffic from the internet → host port 3000 → Docker container port 3000
- The funnel creates an HTTPS endpoint automatically

### Step 5: Get Your Public URL

Check the Funnel status to get your public URL:

```bash
tailscale funnel status
```

You'll see output like:
```
https://your-machine-name.ts.net
|-- / proxy http://127.0.0.1:3000
```

Your public URL is: **https://your-machine-name.ts.net**

### Step 6: Update Backend CORS Configuration

The backend needs to allow requests from your Tailscale public URL.

**Option A: Using Docker Compose**

Edit your `.env` file in the `repopilot/` directory:
```bash
ALLOWED_ORIGIN=https://your-machine-name.ts.net
```

Restart the backend:
```bash
docker compose restart backend
```

**Option B: Local Development**

Edit `backend/.env`:
```bash
ALLOWED_ORIGIN=https://your-machine-name.ts.net
```

Restart the backend server.

### Step 7: Test Public Access

1. Open your Tailscale public URL in a browser: `https://your-machine-name.ts.net`
2. You should see the RepoPilot homepage
3. Try scanning a repository to verify everything works

**Share this URL with:**
- Hackathon judges
- Team members
- Demo attendees
- Anyone who needs to access your app

## Architecture Overview

```
Internet
    ↓
Tailscale Funnel (HTTPS on port 443)
    ↓
Host Machine (port 3000)
    ↓
Docker Container: repopilot_frontend (port 3000)
    ↓ (API calls to /api/*)
Docker Container: repopilot_backend (port 5000)
```

## Troubleshooting

### Funnel Not Working

**Check Tailscale Status:**
```bash
tailscale status
```

**Check Funnel Status:**
```bash
tailscale funnel status
```

**Restart Funnel:**
```bash
sudo tailscale funnel off
sudo tailscale funnel 3000
```

### CORS Errors

Make sure `ALLOWED_ORIGIN` in backend `.env` matches your Tailscale URL exactly:
```bash
# Wrong
ALLOWED_ORIGIN=http://your-machine-name.ts.net

# Correct
ALLOWED_ORIGIN=https://your-machine-name.ts.net
```

### Port Already in Use

If port 3000 is already in use:
```bash
# Find and kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
tailscale funnel 3001
```

Then update your Docker Compose or dev server to use the new port.

### Can't Access from Mobile/Other Networks

This is expected! Tailscale Funnel provides a public HTTPS URL that works from anywhere:
- Different WiFi networks
- Mobile data
- Other countries
- Behind corporate firewalls

No VPN or special network configuration needed for visitors.

### Funnel Stops After Closing Terminal

Run Tailscale as a service:

**Linux:**
```bash
sudo systemctl enable tailscaled
sudo systemctl start tailscaled
```

**macOS:**
Tailscale runs as a background service by default.

**Windows:**
Tailscale runs as a Windows service by default.

## Security Considerations

### What Tailscale Funnel Does:
✅ Provides HTTPS encryption automatically
✅ Hides your real IP address
✅ Works through firewalls and NAT
✅ No port forwarding needed
✅ Free for personal use

### What You Should Do:
- Keep your Tailscale account secure (use 2FA)
- Don't expose sensitive data in your app
- Monitor access logs
- Disable Funnel when not needed: `sudo tailscale funnel off`

### Rate Limiting

Tailscale Funnel has generous rate limits suitable for hackathon demos. If you expect very high traffic, consider:
- Implementing rate limiting in your backend
- Using caching for static assets
- Monitoring your Funnel usage

## Advanced Configuration

### Custom Domain (Optional)

You can use a custom domain with Tailscale Funnel:

1. Add a CNAME record pointing to your Tailscale hostname
2. Enable HTTPS in Tailscale admin console
3. Update `ALLOWED_ORIGIN` to your custom domain

See: https://tailscale.com/kb/1223/funnel/#custom-domains

### Multiple Services

Expose multiple ports:
```bash
# Frontend on 3000
sudo tailscale funnel 3000

# Backend API directly on 5000 (if needed)
sudo tailscale funnel 5000
```

### Funnel Logs

View Funnel access logs:
```bash
sudo journalctl -u tailscaled -f | grep funnel
```

## Stopping Funnel

When you're done with the demo:

```bash
sudo tailscale funnel off
```

This stops public access but keeps your Tailscale connection active.

To completely disconnect:
```bash
sudo tailscale down
```

## Demo Day Checklist

- [ ] Tailscale installed and authenticated
- [ ] RepoPilot running (Docker or local)
- [ ] Funnel enabled on port 3000
- [ ] Public URL obtained from `tailscale funnel status`
- [ ] Backend CORS configured with Tailscale URL
- [ ] Tested public access from phone/different network
- [ ] Public URL shared with judges
- [ ] Backup plan: local demo if internet fails

## Resources

- Tailscale Funnel Documentation: https://tailscale.com/kb/1223/funnel/
- Tailscale Support: https://tailscale.com/contact/support
- RepoPilot GitHub: [Your repo URL]

## Questions?

If you encounter issues during setup:
1. Check the troubleshooting section above
2. Review Tailscale logs: `sudo journalctl -u tailscaled -f`
3. Verify Docker containers are running: `docker compose ps`
4. Check backend logs: `docker compose logs backend`

---

**Pro Tip for Hackathons:** Set up Tailscale Funnel early (before demo day) to ensure everything works smoothly. Test with team members accessing from different networks.

Good luck with your demo! 🚀