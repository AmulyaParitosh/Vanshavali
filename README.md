
# The Living Ancestry Project

![Family Tree Screenshot](https://i.imgur.com/your-screenshot.png)  <!-- Replace with a real screenshot -->

A dynamic and interactive family tree application designed to bring your ancestry to life. This project provides a platform for families to collaboratively build, visualize, and manage their family history in a secure and user-friendly environment.

## Features

*   **Interactive Family Tree:** Visualize your family connections in an elegant and zoomable tree diagram.
*   **Rich Profiles:** Create detailed profiles for each family member, including names, aliases, photos, life events, and custom notes.
*   **Collaborative Editing:** Invite family members to contribute and edit the family tree with role-based permissions.
*   **Secure Access Control:** A robust authentication system with roles (Admin, Editor, Viewer) ensures that your family's data is safe and private.
*   **Admin Dashboard:** A dedicated dashboard for administrators to manage user access requests and roles.
*   **Real-time Updates:** Changes to the family tree are reflected in real-time for all users.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (React)
*   **Database & Auth:** Custom Auth / Firebase Storage
*   **Styling:** CSS Modules & a custom design system
*   **Deployment:** Vercel

## Getting Started

### Prerequisites

*   Node.js (v16 or later)
*   npm or yarn


### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/your-username/living-ancestry.git
    cd living-ancestry
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```



    Create a `.env.local` file in the root of the project and add your Supabase credentials:

    ```

    ```

5.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application will be available at `http://localhost:3000`.

## Deployment

This Next.js application can be easily deployed to platforms like [Vercel](https://vercel.com/) or [Firebase](https://firebase.google.com/).

### Deploying to Vercel

1.  Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2.  Import the repository into your Vercel dashboard.
3.  Vercel will automatically detect that this is a Next.js project and configure the build settings.

5.  Deploy!

## Contributing

Contributions are welcome! Please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
