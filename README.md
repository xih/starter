# Starter Monorepo

Full-stack Next.js workspace with Storybook, design tokens, a shared design
system, and a Python LiveKit agent.

## 🌟 Features

- **Next.js 15** - Latest version with App Router
- **TypeScript** - For type safety and better developer experience
- **Storybook 10** - For component development and design-system documentation
- **tRPC** - End-to-end typesafe APIs
- **Tailwind CSS** - For styling with utility classes
- **Clerk Auth** - Authentication and user management
- **Prettier, ESLint & Stylelint** - Code formatting and linting
- **Root Makefile** - One command surface for local checks, CI, hooks, and release-confidence verification

## 📚 Documentation

- Main Application: [https://starter2-ten.vercel.app](https://starter2-ten.vercel.app)
- Storybook: [https://starter2-ten.vercel.app/storybook](https://starter2-ten.vercel.app/storybook)
- Developer workflow: [docs/developer-workflow.md](docs/developer-workflow.md)
- LiveKit guest sessions: [docs/livekit-guest-sessions.md](docs/livekit-guest-sessions.md)

## 🚀 Getting Started

### Prerequisites

- Node.js 22.12.0, matching `.nvmrc`
- pnpm 10.10.0 through Corepack
- `uv` for the Python LiveKit agent
- Infisical for secret-backed development commands

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/starter.git
cd starter
```

2. Install dependencies:

```bash
corepack pnpm install
```

3. Create a `.env` file in the root directory:

```env
# Auth
AUTH_SECRET=your-auth-secret
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

### Development

Run the web development server with Infisical:

```bash
make web-dev
```

Run the web development server without Infisical:

```bash
make web-dev-local
```

Run Storybook:

```bash
make design-gallery-serve
```

Install repository-owned Git hooks:

```bash
make hooks-install
```

See all workflow commands:

```bash
make help
```

### Building

Build the application:

```bash
make build
```

Build Storybook:

```bash
make design-gallery
```

## 🏗️ Project Structure

```
├── src/
│   ├── app/           # Next.js app directory
│   ├── components/    # React components
│   ├── server/        # Server-side code
│   │   ├── api/      # API routes
│   │   └── trpc/     # tRPC routers
│   └── styles/       # Global styles
├── .storybook/       # Storybook configuration
├── public/           # Static assets
└── vercel.json       # Vercel deployment configuration
```

## 📦 Deployment

The project is configured for deployment on Vercel with both the main application and Storybook:

- Main application is served at the root URL
- Storybook is served at `/storybook` path
- Single deployment handles both builds

## 🧪 Testing

Run tests:

```bash
make test
```

Run fast local checks:

```bash
make dev-check
```

Run PR-confidence checks:

```bash
make verify
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/)
- [Storybook](https://storybook.js.org/)
- [tRPC](https://trpc.io/)
- [Clerk](https://clerk.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
