# Supabase Auth & Role-Based Route Protection (Next.js 16 compliant)

We have successfully implemented **Step 2 (Authentication)** of the restaurant POS system! This implementation fully adheres to the brand-new **Next.js 16 Proxy conventions** (which deprecates `middleware.ts` in favor of `proxy.ts`) and provides a highly-secured, zero-config, visually stunning entry point.

---

## 🏗️ Architectural Overview

Below is the flow of the authentication, route protection, and token validation layers:

```mermaid
graph TD
    A[Incoming Request] --> B{Next.js 16 Proxy}
    B -- Refreshes Session via getUser -- C[Is Authenticated?]
    C -- No -- D[Is Route Protected?]
    D -- Yes -- E[Redirect to /login]
    D -- No -- F[Allow Request]
    C -- Yes -- G{Extract Role from user_metadata}
    G -- Admin/Manager accessing /captain/* -- H[Redirect to /dashboard]
    G -- Captain accessing /dashboard/* -- I[Redirect to /captain/tables]
    G -- Accessing /login -- J[Redirect to respective Home page]
    G -- Correct Role & Route -- K[Render Page]
```

---

## 📁 Key File Modifications and Additions

We modified and created the following modular files to establish a clean and bulletproof authorization foundation:

### 1. `src/proxy.ts` (Next.js 16 File Convention)
> [!NOTE]
> Next.js 16 deprecates the `middleware.ts` naming in favor of the network-clear `proxy.ts` file convention.

We completely deleted the old `src/middleware.ts` and replaced it with a compiled-safe `src/proxy.ts` exporting a named `proxy` function. This avoids the warning logs on startup and routes all matches directly:

```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 2. `src/lib/supabase/middleware.ts` (Role-Based Route Interception)
The interceptor now handles:
* Secure verification using `supabase.auth.getUser()` (validating the JWT token against the authentication server to prevent client-side JWT spoofing).
* Immediate redirection of unauthorized roles.
* **Refreshed Session Preservation:** It introduces `redirectWithCookies()` to prevent the standard Next.js SSR session-loss issue (ensures refreshed Supabase session cookies are appended to redirects).

### 3. `src/lib/supabase/auth.ts` (Reusable Server-Side Utilities)
We created a new library file for server components, route handlers, and server actions to assert permissions:
* `getUserProfile(user)`: Parses and types user metadata.
* `getCurrentUser()`: Securely reads user session from the server cookie store.
* `requireAuth(allowedRoles)`: Drops into any React Server Component (RSC) to enforce roles and redirect automatically.

### 4. Client Layout Shields (`src/app/(admin)/layout.tsx` & `src/app/(captain)/layout.tsx`)
Added `useEffect` and `useRouter` hooks as a client-side layout shield, validating role claims instantly during SPA client transitions.

---

## 🎨 Premium Glassmorphic Login Screen

The login page at `/login` has been fully redesigned to create a premium, state-of-the-art first impression matching our rich design aesthetics rules:

![Premium Login Screen](file:///home/dhananjay/.gemini/antigravity/brain/99cade25-cce8-4f5c-af98-96640ccb9041/login_page_light_1780331634808.png)

### ⚡ Automatic Onboarding / Sandbox Quick Logins
To make local evaluation completely hassle-free, the **Sandbox Quick Logins** buttons at the bottom support **zero-configuration on-the-fly registration**:
1. Click **Captain**, **Manager**, or **Admin**.
2. The login page will try to sign in with standard credentials (`{role}@tipsypos.com` / `password123`).
3. If the user doesn't exist in your Supabase Auth yet, the system **automatically registers them** using `supabase.auth.signUp()` and sets the respective `role`, `name`, and `restaurant_id` in their user metadata, then logs them in!
4. *Note: If email confirmation is enabled on your Supabase Auth dashboard, the page catches it and displays a warning to turn off "Confirm email" or confirm the email manually.*

---

## 🛠️ Testing the Implementation

1. Start your local dev server if it's not already running:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000/login`.
3. Click any of the **Sandbox Quick Logins** buttons. If email confirmation is turned off in your Supabase console, you will be instantly logged in and redirected to either `/dashboard` or `/captain/tables` based on the selected role!
4. Try to manually type `/dashboard` in the URL bar while logged in as a **Captain** — the proxy will instantly intercept and send you back to `/captain/tables`!
