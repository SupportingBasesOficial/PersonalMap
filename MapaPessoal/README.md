# MapaPessoal

A real-time map-based mobile application built with React Native and Supabase.

## Prerequisites

- Node.js >= 18
- React Native CLI: `npm install -g react-native-cli`
- Android Studio with Android SDK (API 24+)
- JDK 17
- Xcode (for iOS development, macOS only)

## Installation

1. Clone the repository and navigate into the project:
   ```bash
   git clone <repository-url>
   cd MapaPessoal/app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and fill in your Supabase credentials:
   ```bash
   cp ../.env.example .env
   ```

## Running the Android Build

Start Metro bundler:
```bash
npx react-native start
```

In a separate terminal, run the Android app:
```bash
npx react-native run-android
```

## Project Structure

```
MapaPessoal/
├── app/                     # React Native application
│   ├── src/
│   │   ├── screens/         # Screen components (e.g., MapScreen.tsx)
│   │   ├── services/        # API and Supabase service layer
│   │   ├── components/      # Reusable UI components
│   │   ├── config/          # App configuration (Supabase client, etc.)
│   │   └── types/           # TypeScript type definitions
│   ├── android/             # Android native project
│   ├── ios/                 # iOS native project
│   ├── App.tsx              # Root application component
│   ├── index.js             # App entry point
│   └── package.json         # Node dependencies
├── docs/                    # Project documentation
├── .env.example             # Environment variable template
└── README.md                # This file
```

## Environment Variables

| Variable         | Description                       |
|------------------|-----------------------------------|
| SUPABASE_URL     | Your Supabase project URL         |
| SUPABASE_ANON_KEY| Your Supabase anonymous API key   |
| APP_ENV          | Application environment (dev/prod)|

## Tech Stack

- **React Native** (0.76.x) — Cross-platform mobile framework
- **TypeScript** — Static typing
- **Supabase** — Backend-as-a-service (auth, database, realtime)
- **MapLibre** — Open-source map rendering *(planned)*
- **Supabase Realtime** — Real-time user presence *(planned)*

## Next Steps

1. Configure Supabase client in `src/config/supabaseClient.ts`
2. Integrate MapLibre for map rendering in `MapScreen.tsx`
3. Implement real-time user presence using Supabase Realtime
4. Add authentication flow
5. Deploy to production

## License

MIT
