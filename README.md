# Next.js Starter Template with Storybook

A modern, full-stack Next.js starter template with built-in Storybook integration, tRPC, and more. Perfect for building scalable web applications with a great developer experience.

## 🌟 Features

- **Next.js 15** - Latest version with App Router
- **TypeScript** - For type safety and better developer experience
- **Storybook 8** - For component development and documentation
- **tRPC** - End-to-end typesafe APIs
- **Tailwind CSS** - For styling with utility classes
- **Clerk Auth** - Authentication and user management
- **Prettier & ESLint** - Code formatting and linting

## 📚 Documentation

- Main Application: [https://starter2-ten.vercel.app](https://starter2-ten.vercel.app)
- Storybook: [https://starter2-ten.vercel.app/storybook](https://starter2-ten.vercel.app/storybook)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/starter.git
cd starter
```

2. Install dependencies:

```bash
pnpm install
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

Run the development server:

```bash
pnpm dev
```

Run Storybook:

```bash
pnpm storybook
```

### Building

Build the application:

```bash
pnpm build
```

Build Storybook:

```bash
pnpm build-storybook
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
pnpm test
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
