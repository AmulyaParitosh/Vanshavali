# Vanshavali

![Family Tree Screenshot](public/screenshot.jpeg) 

Vanshavali is a dynamic and interactive family tree application designed to bring your ancestry to life. It provides a collaborative platform for families to build, visualize, and manage their history in a secure and user-friendly environment.

## Features

*   **Interactive Family Tree:** Visualize lineage with an elegant, zoomable, and draggable tree diagram powered by D3.js.
*   **Rich Profile Management:** Create detailed profiles for family members, including aliases, photos, life events, and relationships.
*   **Collaborative Editing:** Invite family members to contribute with role-based permissions (Admin, Editor, Viewer).
*   **Suggestions System:** Users can submit feature requests or data corrections directly through the platform.
*   **Admin Dashboard:** Dedicated interface for managing access requests, user roles, and reviewing site suggestions.
*   **Local Development Mode:** Support for local development using mock data, allowing for offline work and testing.

## Tech Stack

*   **Frontend:** [Next.js](https://nextjs.org/) (React)
*   **Visualization:** [D3.js](https://d3js.org/)
*   **Backend & Auth:** [Firebase](https://firebase.google.com/) (Realtime Database, Authentication, Storage)
*   **Styling:** Modern Vanilla CSS with a custom rounded design system.
*   **Deployment:** [Firebase App Hosting](https://firebase.google.com/docs/app-hosting)

## Getting Started

### Prerequisites

*   Node.js (v18 or later)
*   npm

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/amulyaparitosh/Vanshavali.git
    cd Vanshavali
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory and add your Firebase credentials and app configuration:
    ```env
    # Firebase Configuration
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
    NEXT_PUBLIC_FIREBASE_DATABASE_URL=your_database_url
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

    # App Configuration
    NEXT_PUBLIC_APP_ENV=production # Use 'local' for mock data
    NEXT_PUBLIC_LOCAL_USER_UID=local-admin-uid # Force a specific user in local mode
    ```

### Running Locally

To start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:3000`.

## Local Development & Mock Data

Vanshavali supports a full "local" mode that doesn't require a live Firebase connection for data.

1.  **Enable Local Mode:** Set `NEXT_PUBLIC_APP_ENV=local` in your `.env`.
2.  **Sync Data from Firebase (Optional):** If you want to prime your local environment with real data from your Firebase instance, run:
    ```bash
    npx tsx scripts/sync-firebase.ts
    ```
    This will download database collections to `.local_data/db/` and storage assets to `.local_data/storage/`.
3.  **Mock Auth:** In local mode, authentication is mocked. You can control which user is "logged in" by adjusting `NEXT_PUBLIC_LOCAL_USER_UID`.

## Deployment

This project is deployed using **Firebase App Hosting**. 

The deployment is automated via a GitHub integration:
1.  Any commits pushed to the `main` branch trigger an automatic build.
2.  Firebase App Hosting handles the build process and deploys the new version once complete.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License

This project is licensed under the MIT License.
