# 🌿 Xylem Landscape

A modern, enterprise-grade landscaping services management system built with Next.js 14, TypeScript, and Supabase.

[![CI/CD](https://github.com/natthan1997/xylproject/workflows/CI%2FCD%20Pipeline/badge.svg)](https://github.com/natthan1997/xylproject/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## ✨ Features

- 🎨 **Modern UI/UX** - Clean minimal design with Tailwind CSS and Framer Motion
- 📱 **Fully Responsive** - Optimized for mobile, tablet, and desktop
- 🌐 **Multi-language** - Support for Thai, English, and Chinese
- 🔒 **Secure** - Built-in security best practices, rate limiting, and input validation
- 📧 **Email Notifications** - Automated booking confirmations and updates
- 💳 **Payment Integration** - Stripe payment gateway integration
- 🗺️ **Google Maps** - Location picker and geocoding
- 📄 **PDF Generation** - Automated document and invoice generation
- 🔔 **Real-time Notifications** - In-app notifications with Supabase Realtime
- 📊 **Role-based Access** - Separate dashboards for customers, staff, and admins
- 🧪 **100% Tested** - Comprehensive unit, integration, and E2E tests
- 🚀 **Production Ready** - CI/CD pipeline, monitoring, and deployment configured

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript 5.3
- **Styling**: TailwindCSS 3.3
- **UI Components**: Custom design system with Framer Motion
- **State Management**: React Context + Hooks
- **Forms**: Native HTML5 validation with custom hooks

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime
- **Email**: Nodemailer (Gmail SMTP)
- **Payments**: Stripe API

### Testing
- **Unit Tests**: Vitest
- **Testing Library**: @testing-library/react
- **E2E Tests**: Playwright
- **Coverage**: Vitest coverage (v8)

### DevOps
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry
- **Deployment**: Vercel (recommended)
- **Version Control**: Git with Conventional Commits

## 📁 Project Structure

```
xylem-landscape/
├── app/                      # Next.js App Router
│   ├── api/                  # API routes
│   ├── dashboard/            # Protected dashboard routes
│   │   ├── admin/           # Admin pages
│   │   ├── customer/        # Customer pages
│   │   └── staff/           # Staff pages
│   ├── login/               # Authentication pages
│   └── workshops/           # Public workshop pages
├── components/              # React components
│   ├── ui/                  # Reusable UI components
│   └── [feature]/           # Feature-specific components
├── lib/                     # Utilities and libraries
│   ├── hooks/               # Custom React hooks
│   ├── security/            # Security utilities
│   ├── errors/              # Error handling
│   ├── cache/               # Caching utilities
│   └── config/              # Configuration
├── tests/                   # Test files
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── e2e/                 # E2E tests
├── styles/                  # Global styles
├── public/                  # Static assets
└── docs/                    # Documentation
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Supabase account
- Gmail account (for email notifications)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/natthan1997/xylproject.git
   cd xylproject/xylem-landscape
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment variables**:
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` with your actual credentials:
   ```bash
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_ENABLE_LINE_LOGIN=false
   
   # Email
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Stripe
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxxxx
   STRIPE_SECRET_KEY=sk_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   
   # Google Maps
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-api-key
   ```

### LINE Login Setup (Supabase OAuth)

1. Create a LINE Login channel in LINE Developers Console.
2. In Supabase Dashboard, go to `Authentication -> Providers -> LINE` and enable it.
3. Set LINE credentials in Supabase provider config:
   - Channel ID
   - Channel Secret
4. Set redirect URL in LINE Console to match your app:
   - Local: `http://localhost:3000/login`
   - Production: `https://your-domain.com/login`
5. Enable login button in app env:
   ```bash
   NEXT_PUBLIC_ENABLE_LINE_LOGIN=true
   ```

When enabled, users can sign in from the login page with LINE, and role-based redirects remain unchanged.

### Custom LINE OAuth Callback (for projects without native Supabase LINE provider)

If your Supabase project does not support LINE as a native OAuth provider, use the backend callback endpoint:

- Endpoint: `/api/auth/line/callback`
- File: `app/api/auth/line/callback/route.ts`

Required environment variables:

```bash
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

LINE_CHANNEL_ID=your-line-channel-id
LINE_CHANNEL_SECRET=your-line-channel-secret
LINE_REDIRECT_URI=https://your-domain.com/api/auth/line/callback

LINE_FRONTEND_SUCCESS_URL=https://your-domain.com/auth/success
LINE_FRONTEND_ERROR_URL=https://your-domain.com/login
LINE_PASSWORD_SECRET=generate-a-long-random-secret
```

Generate `LINE_PASSWORD_SECRET` from your server/dev machine (not from LINE, not from Supabase):

```bash
# Option 1 (OpenSSL)
openssl rand -base64 64

# Option 2 (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('base64url'))"
```

Use the generated value directly in `.env.local` and keep it private. If leaked, rotate it immediately.

The callback endpoint performs:
1. Exchange LINE `code` to `access_token`
2. Fetch LINE profile (`userId`, `displayName`, `pictureUrl`)
3. Create/update Supabase user with service role
4. Sign in user via Supabase password auth
5. Redirect to frontend success URL with Supabase session tokens in URL hash

4. **Setup database**:
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Create a new project
   - Run `schema-all-in-one.sql` in SQL Editor

5. **Run development server**:
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

### Run Unit Tests
```bash
npm run test
```

## 🛡️ Compliance Documentation

- `docs/PDPA_PRIVACY_POLICY_TH.md` - นโยบายความเป็นส่วนตัวและการคุ้มครองข้อมูลส่วนบุคคลสำหรับระบบนี้
- `docs/TERMS_OF_SERVICE_TH.md` - ข้อกำหนดและเงื่อนไขการใช้บริการที่ผูกกับ flow จริงของแพลตฟอร์ม
- `docs/CONSENT_AND_AUDIT_LOGGING_SPEC.md` - technical specification สำหรับ consent capture, audit logging, security logging, retention, และ redaction

### Run E2E Tests
```bash
npm run test:e2e
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test -- --watch
```

## 🏗️ Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint errors |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run E2E tests |
| `npm run test:coverage` | Generate coverage report |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |

## 📖 Documentation

- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Service Creation Guide](docs/ADMIN_SERVICE_CREATION_GUIDE.md)
- [Security Best Practices](docs/SECURITY.md)

## 🔒 Security

- ✅ Rate limiting on all API routes
- ✅ Input validation and sanitization
- ✅ SQL injection protection (parameterized queries)
- ✅ XSS protection
- ✅ CSRF protection
- ✅ Secure headers (CSP, HSTS, etc.)
- ✅ Environment variable validation
- ✅ Row Level Security (RLS) in database

## 🎯 Roadmap

- [ ] Mobile app (React Native)
- [ ] Real-time chat support
- [ ] Advanced analytics dashboard
- [ ] AI-powered service recommendations
- [ ] Multi-branch management
- [ ] Inventory management
- [ ] CRM integration

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Project Lead**: Natthan
- **Repository**: [github.com/natthan1997/xylproject](https://github.com/natthan1997/xylproject)

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Supabase](https://supabase.com/) - Open Source Firebase Alternative
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS Framework
- [Stripe](https://stripe.com/) - Payment platform for cards and PromptPay

---

Made with ❤️ by the Xylem Landscape team



## ✨ Features## Stack

- **Framework**: Next.js 14 (App Router)

- 🎨 **Modern UI/UX** - Built with Tailwind CSS and Framer Motion- **Language**: TypeScript

- 📱 **Responsive Design** - Works perfectly on mobile and desktop  - **Styling**: TailwindCSS

- 🌐 **Multi-language** - Support for Thai, English, and Chinese- **Database**: Supabase (via `supabaseClient.ts`)

- 📅 **Real-time Booking** - Prevent double bookings with live availability

- 📧 **Email Notifications** - Automatic booking confirmations## Project Structure

- 💳 **Payment Integration** - Ready for Stripe payment gateway

- 🔒 **Secure Database** - Powered by Supabase with RLSThe project follows a standard Next.js App Router structure with clear separation of concerns:

- ⚡ **Fast Performance** - Optimized with Next.js 14

- `app/`: Contains all routes and UI, separated by user roles (customer, staff, admin).

## 🚀 Quick Start- `components/`: Reusable React components used across the application.

- `lib/`: Utility functions and third-party library initializations (e.g., Supabase client).

### Prerequisites- `styles/`: Global styles and TailwindCSS base configuration.

- Node.js 18+ - `public/`: Static assets like images and fonts.

- npm or yarn

- Supabase account## Getting Started

- Gmail account (for email notifications)

Follow these steps to get the project up and running on your local machine.

### Installation

### Prerequisites

1. **Clone the repository**

```bash- Node.js (version 20.x or higher)

git clone https://github.com/natthan1997/xylproject.git- npm or yarn

cd xylproject/xylem-landscape

```### Installation



2. **Install dependencies**1.  **Clone the repository** (or download the source code).

```bash2.  **Navigate to the project directory**:

npm install    ```bash

```    cd xylem-landscape

    ```

3. **Setup environment variables**3.  **Install dependencies**:

```bash    ```bash

cp .env.example .env.local    npm install

# Edit .env.local with your actual values    ```

```4.  **Set up environment variables**:

    Create a `.env.local` file in the root of the project by copying the example file:

4. **Setup Supabase Database**    ```bash

- Go to [Supabase Dashboard](https://supabase.com/dashboard)    cp .env.local.example .env.local

- Create a new project or use existing    ```

- Run the SQL schema from database files    Open `.env.local` and replace the placeholder values with your actual Supabase project URL and anon key.

    ```env

5. **Run development server**    NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url

```bash    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

npm run dev    ```

```

### Running the Development Server

Open [http://localhost:3000](http://localhost:3000) to view the application.

Once the installation is complete, you can start the development server:

## 🏗️ Project Structure

```bash

```npm run dev

├── app/                    # Next.js 14 App Router```

│   ├── api/               # API endpoints

│   ├── booking/           # Booking pages  The application will be available at `http://localhost:3000`.

│   ├── workshops/         # Workshop listing

│   ├── dashboard/         # Admin/Customer/Staff dashboards## Available Scripts

│   └── globals.css        # Global styles

├── components/            # Reusable components- `npm run dev`: Starts the development server.

├── lib/                   # Utility functions & contexts- `npm run build`: Creates a production-ready build of the application.

├── public/               # Static assets- `npm run start`: Starts the production server.

└── docs/                 # Documentation- `npm run lint`: Lints the code to check for errors and style issues.

```

---

## 🔧 ConfigurationThis project was initialized by an AI assistant. 

### Supabase Setup
1. Create a new Supabase project
2. Copy your project URL and anon key  
3. Run the SQL schema files
4. Update `.env.local` with your credentials

### Email Setup (Gmail)
1. Enable 2-Step Verification in Gmail
2. Generate App Password
3. Update `.env.local` with your Gmail credentials

### Payment Gateway (Stripe)
1. Create a Stripe account
2. Copy your publishable key, secret key, and webhook secret
3. Update `.env.local` with Stripe keys

## 📊 Available Workshops

- 🌱 **Tray Garden (สวนถาดจิ๋ว)** - Mini terrarium creation
- 🕯️ **Scented Candles (เทียนหอม)** - Coming Soon
- 🧴 **Natural Soap (สบู่طبیعی)** - Coming Soon

## 🌐 Multi-Language Support

- 🇹🇭 **Thai** (Default) - ภาษาไทย
- 🇺🇸 **English** - English language  
- 🇨🇳 **Chinese** - 中文简体

## 🚢 Deployment

### Deploy to Vercel (Recommended)

1. **Connect to Vercel**
```bash
npm i -g vercel
vercel
```

2. **Set Environment Variables**
- Go to Vercel Dashboard
- Add all variables from `.env.local`

3. **Deploy**
```bash
vercel --prod
```

## 📧 Email System

The system includes beautiful HTML email templates for:
- ✅ Booking confirmations (Customer)
- 📬 New booking notifications (Admin)  
- 🌐 Multi-language support
- 📱 Mobile-responsive design

## 🔒 Security Features

- Row Level Security (RLS) enabled in Supabase
- Environment variables for sensitive data
- Input validation and sanitization
- Secure API endpoints
- HTTPS enforcement

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Animation**: Framer Motion
- **Database**: Supabase (PostgreSQL)
- **Email**: Nodemailer + Gmail SMTP
- **Payment**: Stripe
- **Deployment**: Vercel
- **Language**: TypeScript

## 📱 API Endpoints

- `GET /api/workshops` - Get workshop information
- `GET /api/bookings/availability` - Check availability  
- `POST /api/bookings/create` - Create new booking
- `POST /api/send-email` - Send email notifications
- `POST /api/payments` - Process payments

## 🐛 Troubleshooting

### Common Issues

**Email not sending**
- Check Gmail App Password
- Verify SMTP settings  
- Check spam folder

**Database connection issues**
- Verify Supabase URL and keys
- Check RLS policies
- Ensure tables exist

**Build errors**
- Clear `.next` folder
- Reinstall dependencies
- Check TypeScript errors

## 📞 Support

For support, please contact:
- Email: support@xylstudio.com
- Website: [xylstudio.com](https://xylstudio.com)

## 📄 License

This project is proprietary software owned by XYL Studio.

## 🎯 Features Completed

- ✅ Workshop listing with beautiful UI
- ✅ Responsive mobile/desktop design  
- ✅ Multi-language internationalization
- ✅ Real-time booking system
- ✅ Email notification system
- ✅ Payment gateway integration
- ✅ Admin dashboard
- ✅ Customer management
- ✅ Staff interface
- ✅ Database security (RLS)

---

Made with ❤️ by XYL Studio Team

Last Updated: December 2024