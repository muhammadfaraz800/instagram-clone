# Social Media Platform Project

A full-featured social media web application built with Node.js, Express, Oracle Database, and MongoDB.

## Features

### Core Functionality
-   **User Authentication**: Secure Signup and Login using JWT and bcrypt.
-   **Profile Management**: Updates to user details, profile pictures, and privacy settings.
-   **Follow System**: Follow/Unfollow users, manage follow requests, and view followers/following lists.
-   **Privacy Controls**: Public and Private account visibility settings.

### Content & Interaction
-   **Home Feed**: Dynamic feed of posts from followed users.
-   **Explore Page**: Discover new content and view suggestions.
-   **Post Creation**: Upload images with captions and tags.
-   **Reels**:
    -   Upload and **trim** video reels.
    -   **Infinite scroll** viewing experience.
    -   Autoplay and volume controls.
-   **Interactions**: Like posts/comments, comment on posts, and reply to comments.
-   **Search**: Find users by username or name.
-   **Notifications**: Visual indicators for new follow requests.

### UI/UX
-   **Responsive Design**: Desktop sidebar navigation and mobile-friendly bottom navigation.
-   **Dark Mode**: Sleek dark-themed interface.
-   **Modals**: For viewing posts, reel details, and user lists.

---

## Database Architecture

This project utilizes a **Polyglot Persistence** architecture, leveraging the strengths of two different database systems:

### 1. Oracle Database (Relational)
Used as the primary data store for structured, transactional data.
-   **Purpose**: Stores Users, Posts, Reels, Comments, Likes, Follows, and Tags.
-   **Why**: To ensure data integrity, handle complex relationships (e.g., recursive comments, social graphs), and support ACID transactions.
-   **Driver**: `oracledb`

### 2. MongoDB (NoSQL)
Used specifically for high-volume logging and auditing.
-   **Purpose**: Stores action logs such as login events, content uploads, deletions, and system errors.
-   **Collections**: `logs_account`, `logs_upload`, `logs_delete`, `logs_error`.
-   **why**: For fast write performance and flexible schema design suitable for unstructured log data.
-   **Driver**: Native `mongodb` driver.

---

## Security Perspectives

-   **Environment Variables**: Sensitive credentials (DB passwords, JWT secrets) are stored in a `.env` file and never committed to version control.
-   **Password Hashing**: User passwords are salted and hashed using `bcrypt` before storage.
-   **Authentication**: Stateless authentication using JSON Web Tokens (JWT) stored in HTTP-only cookies.
-   **Input Validation**: Backend validation for file uploads (size, type) and user inputs.
-   **Access Control**: Middleware to protect routes; specific logic to restrict access to private profiles.

---

## Developer Guide

### Prerequisites
-   Node.js (v14+ recommended)
-   Oracle Database (Local or Cloud)
-   MongoDB (Local service or Atlas)

### Installation

1.  **Clone the repository** (if applicable).
2.  **Install dependencies**:
    ```bash
    npm install
    ```

### Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server
PORT=3000
JWT_SECRET=your_jwt_secret_key

# Oracle Database
DB_USER=your_oracle_user
DB_PASSWORD=your_oracle_password
DB_CONNECTION_STRING=localhost:1521/xepdb1

# MongoDB
MONGO_URI=mongodb://localhost:27017
```

### Database Setup
Ensure your Oracle and MongoDB instances are running. The necessary tables and collections should be set up according to the project's schema definitions (schema files located in secure folders not included here).

### Running the Application

Start the development server:

```bash
npm start
```

The application will run at `http://localhost:3000`.

---

## Project Structure

```
├── public/                 # Static frontend files (HTML, CSS, JS)
│   ├── css/                # Stylesheets
│   ├── js/                 # Client-side scripts
│   └── ...                 # HTML pages
├── src/
│   ├── config/             # Database connection setups
│   ├── controllers/        # Request handlers (Auth, Feed, Reels, etc.)
│   ├── models/             # Database models/queries
│   ├── routes/             # API Route definitions
│   ├── utils/              # Hepler functions (Logger, JWT)
│   ├── app.js              # Express app configuration
│   └── server.js           # Server entry point
├── package.json            # Project dependencies and scripts
└── README.md               # Project documentation
```
