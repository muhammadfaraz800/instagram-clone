# Instagram Clone (Express.js & Oracle DB)

This is a full-stack web application built with Express.js and Oracle Database, mimicking some features of Instagram.

## Features

- **User Authentication**: Signup and Login functionality.
- **Frontend**: HTML/CSS/JS located in the `public` directory.
- **Backend**: RESTful API built with Express.js.
- **Database**: Oracle Database integration using `oracledb`.

## Prerequisites

- Node.js (v14 or higher)
- Oracle Database (local or cloud)
- Oracle Instant Client (if required by your OS)

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd <project-directory>
    ```
3.  Install dependencies:
    ```bash
    npm install
    ```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
PORT=3000
DB_USER=your_db_username
DB_PASSWORD=your_db_password
DB_CONNECTION_STRING=your_db_connection_string
```

## Running the Application

Start the server:

```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env`).

## Project Structure

- `src/`: Backend source code
    - `config/`: Database configuration
    - `controllers/`: Request handlers
    - `routes/`: API routes
    - `utils/`: Utility functions
    - `app.js`: Express app setup
    - `server.js`: Entry point
- `public/`: Static frontend files (HTML, CSS, Images)

## License

ISC
