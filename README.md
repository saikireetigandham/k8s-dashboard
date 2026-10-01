# Kubernetes Dashboard

A modern Next.js dashboard for exploring Kubernetes cluster health, workloads, and operational details. The project is designed for local demos, developer workflows, and cluster inspection, with a demo mode that works without a live cluster connection.

> Status: experimental and demo-oriented. This app is useful for visualizing cluster state and workflow concepts, but it should not be treated as a hardened production monitoring or control plane.

## What this app includes

- Cluster overview cards for nodes, pods, services, and namespaces
- Resource views for workloads and infrastructure, including:
  - Pods
  - Nodes
  - Namespaces
  - Services
  - Deployments
  - StatefulSets
  - DaemonSets
  - Jobs
  - CronJobs
  - Storage
  - Autoscaling
  - Configuration
  - Security
  - Gateway resources
  - CRDs
  - Helm
  - Topology
  - Monitoring
- Interactive operational tools such as:
  - Terminal access
  - Pod logs
  - Pod exec flow
  - YAML viewing
  - Quick actions
  - Activity feed
- AI workloads inventory page for workload visibility and experimentation
- Demo authentication flow and synthetic cluster data for local development

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- shadcn-style UI components
- Kubernetes client library
- Recharts, Framer Motion, xterm.js

## Project structure

```text
src/
  app/
    api/              # Next.js route handlers for cluster data and actions
    ...               # Dashboard pages for pods, services, workloads, config, etc.
  components/
    ui/               # Shared component primitives
    ...               # Dashboard widgets, dialogs, and layout pieces
  contexts/
    auth-context.tsx  # Demo auth and local session handling
  hooks/
    ...               # Real-time and polling hooks
  lib/
    api-client.ts     # UI-side API access layer
    k8s-client.ts     # Kubernetes client setup
    k8s-store.ts      # Cluster data store / fallback logic
    demo-data.ts      # Sample data for demo mode
```

## Prerequisites

- Node.js 20.9 or newer
- npm
- A Kubernetes kubeconfig if you want to connect to a real cluster
- Optional: Docker for containerized local runs

## Run locally

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Then open http://localhost:3000.

## Demo mode

This project supports a demo mode for local development without a live Kubernetes connection. Enable it in your environment:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Add that to a `.env.local` file before starting the app. In demo mode:

- the app auto-authenticates a demo user
- the sign-in screen accepts:
  - email: `admin@k8s.local`
  - password: `admin123`
- synthetic Kubernetes data is returned instead of live cluster data

## Production / live cluster mode

When `NEXT_PUBLIC_DEMO_MODE` is not enabled, the app attempts to use the local Kubernetes configuration available to the Node.js process. In a real setup, make sure the runtime environment has access to the correct kubeconfig context or in-cluster service account permissions.

Important caveats:

- The demo auth is not a security boundary.
- Do not expose the app publicly without proper auth, network controls, and a hardened deployment model.
- Do not mount or expose sensitive kubeconfig files in a shared or public environment.

## Useful scripts

```bash
npm run dev         # start the Next.js dev server
npm run build      # create a production build
npm run start      # run the production build
npm run lint       # run ESLint
npm run type-check # run TypeScript checks
```

## Security notes

This project is a dashboard for experimentation and demos, not a production-ready Kubernetes control plane. The app includes local demo authentication, generated data, and placeholder behavior in several areas. Before using it against a real cluster,

- review the permissions granted to the account running the app
- keep credentials out of source control
- avoid public exposure without additional auth and network safeguards
- treat the UI as a convenience layer, not a security control

## Contributing

Contributions are welcome for bug fixes, UI polish, resource coverage, and cluster integration improvements. Please avoid committing real kubeconfig data, secrets, or production cluster information.
