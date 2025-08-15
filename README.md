README.md

CRM Taxena Netlify  
==================  

A multi-tenant, role?based CRM web application built as a React SPA hosted on Netlify, backed by a PostgreSQL database (Neon). It provides secure JWT authentication, per-company data isolation, granular RBAC, serverless REST APIs, SQL migrations, and a rich UI (dashboard, contacts, deals, calendar, proposals, time tracking, chat, accounting, admin panel, etc.).

Key Features  
? Secure JWT-based auth (signup/login) with middleware  
? Multi-company support & per-tenant isolation  
? Role-based access control (superadmin, admin, manager, user, client)  
? Serverless API functions for CRUD operations (contacts, projects, tasks, proposals, invoices, files, forms, chat, network, accounting)  
? SQL migrations for schema & versioning  
? Neon/PostgreSQL wrapper (neonclient.js/.ts) with query/transaction helpers  
? React SPA with Vite, TypeScript, SCSS, Framer Motion, React Query, React Router  
? Responsive layout (sidebar, topnav/navbar, context panel, main content)  
? Admin panel for company/user management  
? Proposal editor, Kanban board, time tracker, accounting viewer  

Prerequisites  
? Node.js ? 18 and npm or pnpm  
? A Neon (PostgreSQL) database or equivalent  
? Netlify CLI (`npm install -g netlify-cli`)  
? A GitHub account (for code hosting & CI/CD)  

Installation & Setup  
1. Clone the repo:  
   git clone https://github.com/your-org/crm-taxena-netlify.git  
   cd crm-taxena-netlify  

2. Install dependencies:  
   npm install  
   # or  
   pnpm install  

3. Copy and configure environment variables:  
   cp env.example.env .env  
   Edit `.env` with your DATABASE_URL, JWT_SECRET, VITE_API_BASE_URL, etc.  

4. Run SQL migrations:  
   psql $DATABASE_URL -f migrations/001_initial.sql  
   psql $DATABASE_URL -f migrations/001_create_schema.sql  
   psql $DATABASE_URL -f migrations/001_init.sql  

5. Netlify local dev:  
   netlify login  
   netlify dev  
   ? SPA at http://localhost:8888  
   ? Serverless functions at http://localhost:8888/.netlify/functions  

6. Open your browser at http://localhost:8888  

Build & Deploy  
? Build: `npm run build`  
? Deploy to Netlify: push to your GitHub repo; Netlify picks up `netlify.toml` and runs `npm run build`.  

GitHub Workflow & AI-Assisted Development  
1. Create a feature branch:  
   git checkout ?b feature/your-feature  

2. Run one task at a time (to keep commits small).  
3. Use AI tools (OpenAI Codex, Google Jules) for code suggestions?apply fixes manually, test locally, then `git add` and `git commit`.  
4. Push branch and open a pull request on GitHub.  

Directory & Component Summary  
------------------------------  

1. Configuration & Tooling  
? netlify.toml ? Netlify build/redirects/security headers & functions config  
? vite.config.ts / vite.config.js ? Vite build/dev server settings, aliases, proxy to Netlify functions  
? tsconfig.json ? TypeScript compiler settings & path mappings  
? package.json ? npm scripts & dependencies  
? env.example.env ? sample environment variables  
? config.ts ? runtime config loader & validation  

2. Database & Migrations  
? migrations/001_initial.sql ? core tables: companies, users, roles, user_roles, customers, contacts, deals  
? migrations/001_create_schema.sql ? extended schema: enums, tasks, activities, proposals, invoices, forms, files, chat, network, accounting  
? migrations/001_init.sql ? trigger re-initialization for updated_at columns  

3. Neon Client Wrappers  
? netlify/functions/neonclient.js & src/utils/neonclient.ts ? initClient(), query(), execute(), transaction()  

4. Serverless API (Netlify Functions under netlify/functions/)  
? authmiddleware.ts ? JWT verification middleware  
? signup.ts, login.ts ? user signup & login handlers  
? createcompany.ts, getcompanies.ts ? company creation & retrieval  
? contactsapi.ts, projectsapi.ts, calendarapi.ts, contractsapi.ts, filesapi.ts, formsapi.ts, invoicesapi.ts, proposalsapi.ts, chatapi.ts, networkapi.ts, accountingapi.ts ? CRUD REST APIs with CORS, validation, RBAC  

5. Frontend Entry & Routing (src/)  
? index.html ? HTML template & meta tags  
? main.tsx ? React root render with React Query, Router, providers  
? app.tsx ? App shell: global providers, Layout, routes, error boundaries  
? routes.tsx ? React Router v6 lazy-loaded routes & RequireAuth  

6. Layout & Global Styles  
? global.scss ? CSS variables, resets, utility classes, responsive breakpoints  
? layout.tsx ? App layout wrapper (Sidebar, Navbar, main content)  
? contextpanel.tsx / ContextPanelProvider ? dynamic right-side panel for contextual help/actions  

7. Navigation Components  
? navbar.tsx / topnav.tsx ? top navigation with brand, links, company switcher, profile menu  
? sidebar.tsx ? collapsible left menu with icons & role-based items  

8. Pages & Feature Components  
? DashboardPage (dashboard.tsx) ? homepage with stats & charts  
? LaunchpadPage ? onboarding quick-action tiles & stats  
? ContactsPage ? searchable contacts table, create/edit/delete modal  
? ProjectsPage ? project list & navigation  
? CalendarPage ? FullCalendar month/week/day, event CRUD modal  
? ContractsPage ? contract list, search, delete, detail navigation  
? FilesPage ? file grid, upload/download/delete  
? FormsPage ? form list, delete, new/edit navigation  
? InvoicesPage ? invoice table, delete, new/edit navigation  
? ProposalsPage ? list CRUD with zod validation, confirm-delete dialog  
? ProposalEditor ? block-based form for editing/creating proposals  
? TasksPage ? table CRUD tasks with inline edit/delete  
? TasksBoard ? Kanban-style board with drag/drop status updates & notifications  
? TimeTracker ? timer start/stop, session list, total & current durations  
? ChatsPage & ChatPage ? conversation list & message UI, polling or real-time APIs  
? NetworkPage ? directory of network connections  
? InformacjeKsiegowePage ? Polish ?Informacje Ksi?gowe? tax info viewer  
? AccountingPage ? ledger transactions CRUD  
? AdminPanel & AdminPanelPage ? company & user management, enable/disable, roles, delete  
? GoWePage ? ?WePages? listing & create button  

Development Tips  
? Always set `process.env.NODE_ENV` to ?development? locally, ?production? on Netlify.  
? Use Netlify CLI (`netlify dev`) to emulate functions at `/.netlify/functions/*`.  
? Run one AI-generated fix at a time and test before committing.  
? Use React Query Devtools in development to inspect API calls.  

Contributing  
------------  
1. Fork & clone  
2. Create a feature branch  
3. Follow coding standards (ESLint + Prettier)  
4. Commit small atomic changes  
5. Push & open a Pull Request  
6. CI (GitHub Actions) will run lint, test, build  

Licence  
-------  
? 2024 Your Company. MIT License.