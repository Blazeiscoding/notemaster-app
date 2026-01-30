# NoteMaster 📝

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Bun](https://img.shields.io/badge/Runtime-Bun-f472b6?style=flat-square&logo=bun)](https://bun.sh/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-darkblue?style=flat-square&logo=prisma)](https://prisma.io/)
[![Clerk](https://img.shields.io/badge/Auth-Clerk-6c47ff?style=flat-square&logo=clerk)](https://clerk.com/)

A modern, secure, and feature-rich note-taking application built with **Next.js 16**. NoteMaster features **end-to-end encryption**, **offline-first capabilities**, hierarchical notebooks, and a premium user interface.

![NoteMaster App](./public/note-empty.svg)

---

## 📑 Table of Contents

- [Features](#-features)
- [Architecture & Tech Stack](#-architecture--tech-stack)
- [Getting Started](#-getting-started)
- [Encryption](#-encryption-details)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🔐 Security & Privacy
- **End-to-End Encryption**: Uses **AES-256-GCM** to ensure your notes are encrypted before they leave your device.
- **Privacy First**: Even the database administrator cannot read your notes.
- **Secure Authentication**: Powered by Clerk.

### ⚡ Performance & Offline Support
- **Offline-First**: Integrated with **IndexedDB** for instant load times and offline access.
- **PWA Ready**: Installable on iOS, Android, and Desktop as a native-like app.
- **Optimistic UI**: Instant interactions with background synchronization.

### 📝 Powerful Note Management
- **Rich Text Editor**: Powered by Tiptap with support for images, code blocks, and formatting.
- **Hierarchical Notebooks**: Organize deeply with nested notebooks.
- **Smart Tools**: Checklists, tags, pinning, archiving, and trash recovery.
- **Version History**: Track changes and restore previous versions of your notes.
- **Attachments**: Secure file uploads via **ImageKit**.
- **Reminders**: Never miss a deadline with due dates.

### 🎨 Premium User Experience
- **Customizable Themes**: Choose from multiple accent colors and dark/light modes.
- **Fluid Animations**: Smooth transitions and micro-interactions.
- **Advanced Search**: Real-time search with "Smart Filters" to save complex queries.
- **Keyboard Shortcuts**: Designed for power users (`Ctrl/Cmd + N`, etc.).

---

## 🏗️ Architecture & Tech Stack

NoteMaster leverages a modern stack designed for performance and reliability.

### Core Stack
- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL (via [Neon](https://neon.tech/) or any provider)
- **ORM**: [Prisma](https://prisma.io/)
- **Runtime**: [Bun](https://bun.sh/)

### Frontend & UI
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Components**: [Radix UI](https://www.radix-ui.com/) primitives
- **Editor**: [Tiptap](https://tiptap.dev/)
- **Icons**: [Lucide](https://lucide.dev/)
- **Notifications**: [Sonner](https://sonner.emilkowal.ski/)
- **Virtualization**: @tanstack/react-virtual

### Infrastructure & Services
- **Authentication**: [Clerk](https://clerk.com/)
- **Storage**: [ImageKit](https://imagekit.io/) (for media/attachments)
- **Analytics**: [Vercel Analytics](https://vercel.com/analytics)
- **Local Storage**: IDB (IndexedDB wrapper) & LocalStorage for guest mode

### 🔒 Encryption Flow

```mermaid
graph TD
    User([User]) -->|Input| Client[Client App]
    subgraph Client Side
        Client -->|Plain Text| Encrypt{AES-256-GCM}
        Encrypt -->|Encrypted Content| API_Call[API Request]
    end
    API_Call -->|Encrypted Data| Network[Internet]
    subgraph Server Side
        Network --> API[Next.js API Routes]
        API -->|Encrypted Data| DB[(PostgreSQL)]
    end
    
    DB -->|Encrypted Data| API
    API -->|Encrypted Data| Client
    subgraph Decryption
        Client -->|Encrypted Content| Decrypt{AES-256-GCM}
        Decrypt -->|Plain Text| UI[User Interface]
    end
```

---

## 🚀 Getting Started

### Prerequisites
- **Bun 1.0+** (Recommended) or Node.js 18+
- **PostgreSQL Database** URL
- **Clerk Account** (Publishable Key & Secret Key)
- **ImageKit Account** (Optional, for attachment support)

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

3. **Environment Setup**
   Create a `.env.local` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@host:5432/notemaster"

   # Security (Generate a strong 32-byte hex string)
   NOTES_ENCRYPTION_KEY="your-super-secret-encryption-key-here"

   # Clerk Auth
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
   CLERK_SECRET_KEY="sk_test_..."
   NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
   NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
   
   # ImageKit (Optional)
   NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT="..."
   NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY="..."
   IMAGEKIT_PRIVATE_KEY="..."
   ```

4. **Initialize Database**
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

5. **Run Development Server**
   ```bash
   bun dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🔑 Generating an Encryption Key

It is **critical** to use a secure encryption key. Run the following command to generate one:

```bash
bun -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> [!CAUTION]
> **Never change the encryption key** after you have started creating notes. Doing so will make all existing encrypted data permanently unreadable.

---

## 📊 Database Schema

<details>
<summary>Click to view Prisma Schema</summary>

```prisma
model Note {
  id          String   @id @default(uuid())
  userId      String
  notebookId  String?
  title       String   @default("")      // Encrypted
  content     String   @default("")      // Encrypted
  tags        String[] @default([])      // Encrypted array
  checklist   Json                       // Encrypted JSON
  attachments Json                       // Encrypted JSON
  type        String   @default("note")
  pinned      Boolean  @default(false)
  archived    Boolean  @default(false)
  trashed     Boolean  @default(false)
  dueAt       DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  notebook    Notebook? @relation(...)
  revisions   NoteRevision[]
}

model Notebook {
  id        String    @id @default(uuid())
  userId    String
  parentId  String?
  name      String
  color     String    @default("#2563EB")
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  parent    Notebook? @relation("NotebookHierarchy", ...)
  children  Notebook[] @relation("NotebookHierarchy")
  notes     Note[]
}
```
</details>

---

## 🏗️ Project Structure

```text
notemaster/
├── app/                  # Next.js App Router pages
│   ├── api/             # API Routes (Notes, Notebooks, Auth)
│   ├── (auth)/          # Auth grouped routes
│   └── globals.css      # Tailwind imports
├── components/           # React Components
│   ├── layout/          # Shell, Sidebar, Header
│   ├── note-app/        # Core business logic components
│   ├── notes/           # Note cards, editors, lists
│   └── ui/              # Reusable UI primitives (Buttons, Modals)
├── lib/                  # Utilities
│   ├── encryption.ts    # AES-256-GCM logic
│   ├── prisma.ts        # Database client
│   └── use-idb.ts       # IndexedDB hooks
├── prisma/              # Database schema & migrations
└── public/              # Static assets & PWA manifest
```

---

## 🔧 Troubleshooting

### Common Issues

<details>
<summary><strong>Encrypted text showing instead of content?</strong></summary>

**Cause:** Your `NOTES_ENCRYPTION_KEY` does not match the key used to encrypt the data.
**Fix:** Ensure the key in `.env.local` matches the one used during note creation. If you lost the key, the data is unrecoverable.
</details>

<details>
<summary><strong>Notes not syncing/loading?</strong></summary>

**Cause:** Database connection or API issues.
**Fix:** Check your network tab. If you see CORS or 500 errors, verify your Clerk and Database credentials.
</details>

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

Built with ❤️ by **Nikhil Rathore**.

Special thanks to:
- [Next.js](https://nextjs.org/) team for the amazing framework
- [Sonner](https://sonner.emilkowal.ski/) for the beautiful toasts
- [Shadcn UI](https://ui.shadcn.com/) philosophy for component design
