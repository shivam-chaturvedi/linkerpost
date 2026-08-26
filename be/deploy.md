# Deploy API (near Bangalore Postgres → Mumbai)

```bash
vercel link --project linkerpost-api --yes
vercel deploy --prod --yes -A vercel.json
```

`vercel.json` pins `regions: ["bom1"]` (Mumbai) next to Aiven DO `blr`.

# Deploy scheduler

```bash
vercel link --project linkerpost-scheduler --yes
vercel deploy --prod --yes -A vercel.scheduler.json
```

After deploy, confirm region:

```bash
vercel inspect <deployment-url>
# Builds → λ api/index … [bom1]
```
