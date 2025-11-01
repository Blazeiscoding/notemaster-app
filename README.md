# NoteMaster 📝

A modern, secure, and feature-rich note-taking application built with Next.js 15, featuring end-to-end encryption, offline support, and a beautiful user interface.

![NoteMaster App](./public/note-empty.svg)

## ✨ Features

### 🔐 Security & Privacy

- **End-to-end encryption** using AES-256-GCM algorithm
- All notes encrypted at rest in the database
- Secure authentication via Clerk
- Environment-based encryption keys

### 📱 Progressive Web App

- Install on any device (iOS, Android, Desktop)
- Works offline with localStorage fallback for guests
- Native app-like experience
- Responsive design for all screen sizes

### 📋 Note Management

- **Rich note-taking** with title, content, and tags
- **Checklist support** for task management
- **Pin important notes** for quick access
- **Archive notes** to keep workspace organized
- **Trash bin** with restore capability
- Real-time search across titles and content

### 🎨 User Experience

- **Dark mode** support with system preference detection
- Beautiful animations and transitions
- Sorting options (Last updated, Date created, Title)
- Tag-based filtering and organization
- Empty state illustrations
- Mobile-optimized sidebar

### 💾 Data Management

- **Export notes** to JSON format
- **Import notes** from JSON files
- Automatic backup through PostgreSQL
- Optimistic UI updates for instant feedback

### 👥 Multi-User Support

- Guest mode with localStorage
- Authenticated users with database sync
- User-specific note isolation
- Seamless migration from guest to authenticated

## 🚀 Getting Started

### Prerequisites

- Bun 1.0+ (or Node.js 18+)
- PostgreSQL database
- Clerk account for authentication

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/blazeiscoding/notemaster-app.git
   cd notemaster
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/notemaster"

   # Encryption (generate a strong random key)
   NOTES_ENCRYPTION_KEY="your-super-secret-encryption-key-here"

   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
   ```

4. **Set up the database**

   ```bash
   bun run db:generate
   bun run db:migrate
   ```

5. **Run the development server**

   ```bash
   bun dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 Generating an Encryption Key

For production, generate a strong encryption key:

```bash
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**⚠️ Important:** Never change the encryption key after data is encrypted, or you'll lose access to existing notes!

## 📊 Database Schema

```prisma
model Note {
  id         String   @id @default(uuid())
  userId     String
  title      String   @default("")      // Encrypted
  content    String   @default("")      // Encrypted
  tags       String[] @default([])      // Encrypted array
  checklist  Json                       // Encrypted JSON
  type       String   @default("note")
  pinned     Boolean  @default(false)
  archived   Boolean  @default(false)
  trashed    Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

## 🏗️ Project Structure

```
notemaster/
├── app/
│   ├── api/
│   │   └── notes/          # API routes for CRUD operations
│   ├── sign-in/            # Clerk sign-in page
│   ├── sign-up/            # Clerk sign-up page
│   ├── globals.css         # Global styles with Tailwind
│   ├── layout.tsx          # Root layout with Clerk provider
│   └── page.tsx            # Main app component
├── components/
│   └── ui/                 # Reusable UI components
├── lib/
│   ├── encryption.ts       # AES-256-GCM encryption utilities
│   ├── prisma.ts           # Prisma client singleton
│   └── utils.ts            # Utility functions
├── prisma/
│   ├── migrations/         # Database migrations
│   └── schema.prisma       # Database schema
├── public/
│   ├── manifest.json       # PWA manifest
│   └── *.svg               # Icons and illustrations
├── scripts/
│   └── backfill-encryption.ts  # Encrypt existing data
└── types/
    └── note.ts             # TypeScript type definitions
```

## 🔒 Encryption Details

NoteMaster uses **AES-256-GCM** encryption to protect your notes:

- **Algorithm:** AES-256-GCM (Galois/Counter Mode)
- **Key derivation:** SHA-256 hash of the encryption key
- **IV length:** 12 bytes (randomly generated per encryption)
- **Auth tag length:** 16 bytes
- **Encrypted fields:** title, content, tags, checklist items

### Encryption Flow

1. User creates/updates a note
2. Data is encrypted client-side before sending to API
3. Encrypted data is stored in PostgreSQL
4. On retrieval, data is decrypted server-side
5. Plain text is sent to authenticated user only

## 🛠️ Development

### Available Scripts

```bash
# Development
bun dev              # Start dev server
bun run build        # Build for production
bun start            # Start production server

# Database
bun run db:generate  # Generate Prisma client
bun run db:migrate   # Run migrations
bun run db:push      # Push schema changes
bun run db:studio    # Open Prisma Studio

# Encryption
bun run backfill     # Encrypt existing unencrypted data
```

### Tech Stack

- **Runtime:** Bun
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI primitives
- **Encryption:** Node.js crypto module
- **PWA:** next-pwa

## 🚢 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables:
   - `DATABASE_URL`
   - `NOTES_ENCRYPTION_KEY`
   - All Clerk variables
4. Deploy!

### Deploy to Other Platforms

Ensure your platform supports:

- Bun 1.0+ or Node.js 18+
- PostgreSQL database
- Environment variables

## 🔧 Troubleshooting

### Encrypted data showing after login

**Cause:** Encryption key mismatch

**Solution:**

1. Verify `NOTES_ENCRYPTION_KEY` is set correctly
2. Ensure the same key is used in all environments
3. Check server logs for decryption errors

### Notes not syncing

**Cause:** Authentication or API issues

**Solution:**

1. Check Clerk configuration
2. Verify API routes are accessible
3. Check browser console for errors

### PWA not installing

**Cause:** HTTPS required or manifest issues

**Solution:**

1. Ensure site is served over HTTPS
2. Verify `manifest.json` is accessible
3. Check browser PWA requirements

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Runtime powered by [Bun](https://bun.sh/)
- Authentication by [Clerk](https://clerk.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)

---

Made with ❤️ by Nikhil Rathore
