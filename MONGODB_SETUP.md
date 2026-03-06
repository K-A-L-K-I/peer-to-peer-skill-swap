# Installing MongoDB Locally

If you don't already have MongoDB installed locally, follow these steps to get the database service running on your machine.

---

### For Windows

1. **Download the Installer:**
   - Go to the [MongoDB Community Server Download Page](https://www.mongodb.com/try/download/community).
   - Under "Available Downloads", make sure the version is the current one, the Platform is **Windows**, and the Package is **msi**.
   - Click **Download**.
2. **Run the Installer:**
   - Double-click the downloaded `.msi` file.
   - Click **Next** through the initial screens and accept the License Agreement.
   - Choose the **Complete** setup type.
3. **Service Configuration:**
   - Leave "Install MongoDB as a Service" checked (this ensures it runs automatically in the background).
   - Leave "Run service as Network Service user" selected.
   - Click **Next**.
4. **Install MongoDB Compass (Optional but helpful):**
   - Ensure the box "Install MongoDB Compass" is checked. This gives you a nice GUI to view the database instead of using the command line.
   - Click **Next**, then **Install**.
5. **Verify it's running:**
   - Open the Windows "Services" app (press Windows Key and type "Services").
   - Scroll down to find **MongoDB Server (MongoDB)** and ensure its status says "Running".

---

### For macOS (using Homebrew)

*If you don't have Homebrew installed, you must first run: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"` in your terminal.*

1. **Open the Terminal.**
2. **Download the MongoDB taps:**
   ```bash
   brew tap mongodb/brew
   ```
3. **Install MongoDB Community Edition:**
   ```bash
   brew install mongodb-community@7.0
   ```
   *(You can change `7.0` to whatever the latest version is if it complains).*
4. **Start the MongoDB Service:**
   ```bash
   brew services start mongodb/brew/mongodb-community
   ```
5. **Verify it's running:**
   ```bash
   brew services list
   ```
   *(You should see `mongodb-community` listed with a green `started` status).*

---

### For Linux (Ubuntu)

1. **Open the Terminal.**
2. **Import the MongoDB public GPG Key:**
   ```bash
   curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
      sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg \
      --dearmor
   ```
3. **Create a list file for MongoDB:**
   ```bash
   echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   ```
   *(Note: This uses `jammy` for Ubuntu 22.04. If you are on 20.04, replace `jammy` with `focal`)*.
4. **Reload local package database:**
   ```bash
   sudo apt-get update
   ```
5. **Install the MongoDB packages:**
   ```bash
   sudo apt-get install -y mongodb-org
   ```
6. **Start MongoDB and enable it to start on boot:**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```
7. **Verify it's running:**
   ```bash
   sudo systemctl status mongod
   ```
   *(You should see an `active (running)` status).*

Once MongoDB is successfully installed and running on your system, the backend Node.js application will be able to automatically connect to it via the standard `mongodb://127.0.0.1:27017/skill-swap` URI!
