Plan: Multi-Site Nginx Rewrite For 4 Domains
This plan rewrites your VPS Nginx setup for testing with explicit host-to-port routing, keeps hosts entries minimal, removes legacy mixed routes, and fixes deploy-script config drift so future updates are consistent.

Steps

Phase 1: Baseline and safety backup.
Capture current live Nginx state before changes: full rendered config, enabled site links, and active cert list.
Confirm DNS for all four domains resolves to 142.93.82.161 and cert files exist (or can be issued) for HTTPS blocks.
Phase 2: Rewrite the default site config to deterministic multi-site behavior.
Replace the current default configuration with one clear set of server blocks in default.
Add one HTTP block on port 80 for all four domains that redirects to HTTPS.
Add one HTTPS block per domain with consistent proxy headers, timeouts, and upload size limits.
Apply your confirmed upstream map:
server.key-ching.com -> 127.0.0.1:2999
server.scramblurr.com -> 127.0.0.1:3000
server.drauwper.com -> 127.0.0.1:4000
server.iota-chat.com -> 127.0.0.1:5000
Under server.scramblurr.com only, expose /py -> 127.0.0.1:5000.
Remove legacy path proxies you no longer want: /kcs, /app1, /iota.
Add a final catch-all default host block for unknown Host headers.
Phase 3: Hosts and deployment alignment.
Clean host mappings in hosts so only localhost-style entries remain for VPS use.
Fix deployment naming mismatch between deploy.sh and nginx-videoscrambler.conf, so deploy always copies the intended Nginx config.
Keep guarded reload behavior: test Nginx syntax first, reload only when valid.
Phase 4: Verification and rollback readiness.
Validate Nginx syntax, reload, and verify each domain returns from its intended upstream.
Verify /py is reachable only on server.scramblurr.com.
Verify listeners/processes for 2999, 3000, 4000, and 5000.
Keep rollback procedure ready: restore backup default config and reload Nginx if any host fails.
Relevant files

default — full rewrite to multi-domain, per-domain upstreams, and scramblurr-only /py.
hosts — remove domain-to-127.0.0.1 entries for VPS deployment.
deploy.sh — align copied Nginx filename and keep safe test-before-reload.
nginx-videoscrambler.conf — replace or rename to your neutral multi-site template.
Verification

Nginx syntax check passes with no duplicate listen/server_name conflicts.
Reload succeeds and service stays healthy.
HTTPS checks pass for all four domains.
Host-based routing returns correct backend per domain.
/py route works on server.scramblurr.com and is absent on the other three.
Port listeners/process health confirms all mapped backends are up.
Decisions captured

Testing setup, not production hardening.
HTTPS enabled now for all four domains.
Domain map is fixed as provided, with future changes expected later.
Legacy proxy paths removed except scramblurr /py.
Redis is not exposed publicly via Nginx.
Plan is saved in /memories/session/plan.md and ready for handoff. If you want, I can revise this once more to include a zero-downtime cutover sequence (staged enable, canary host test, then full switch).