# Local SSL / HTTPS Setup for WebRTC

Because this project utilizes **WebRTC** to stream video and audio data for the Video Call feature, modern browsers (Chrome, Firefox, Safari) strictly require the application to be served over **HTTPS (a Secure Context)** to grant microphone and camera permissions. If the application runs on standard `http://localhost`, the camera will automatically block access.

To develop and test the video calling features locally, you need to generate a self-signed SSL Certificate and tell both the React Frontend and Node.js Backend to use those keys.

---

### Step 1: Install `mkcert`
The easiest way to generate trusted local certificates is using a tool called `mkcert`.

* **Windows:**
  Install using [Chocolatey](https://chocolatey.org/):
  ```bash
  choco install mkcert
  ```
* **macOS:**
  Install using Homebrew:
  ```bash
  brew install mkcert
  ```
* **Linux (Ubuntu):**
  Install using apt:
  ```bash
  sudo apt install libnss3-tools
  brew install mkcert # (If Homebrew is installed)
  ```

### Step 2: Generate the Certificates
1. Open your terminal at the very root of this project (`peer-to-peer-skill-swap`).
2. Run the `mkcert` setup command to tell your machine to trust local certificates:
   ```bash
   mkcert -install
   ```
3. Generate the actual `cert.pem` and `key.pem` files (we will generate them directly inside both `frontend/ssl` and `backend/ssl`):

   **For the Backend:**
   ```bash
   mkdir -p backend/ssl
   cd backend/ssl
   mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1
   cd ../..
   ```

   **For the Frontend:**
   ```bash
   mkdir -p frontend/ssl
   cd frontend/ssl
   mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1
   cd ../..
   ```

### Step 3: Configure Network IPs (If Testing on Mobile/External Devices)
By default, the certificates you just generated are mapped to `localhost`. If you want to test the video call on your physical phone, you must find your desktop's Local IP Address (e.g., `192.168.1.something`) and configure the `.env` variables to broadcast the server over your local network.

1. **Find your IP Address:**
   - Windows: Run `ipconfig` (Look for IPv4 Address).
   - Mac/Linux: Run `ifconfig` or `ip a`.

2. **Update the Certificates (Optional):**
   If you want the certificate to be valid for your phone, add the IP Address to the generation command. E.g.:
   `mkcert -key-file key.pem -cert-file cert.pem localhost 127.0.0.1 <YOUR_LOCAL_IP>`

3. **Update Frontend `.env`:**
   Set `REACT_APP_API_URL` to point to the backend HTTPS address:
   ```env
   REACT_APP_API_URL=https://<YOUR_LOCAL_IP>:5000/api
   HTTPS=true
   SSL_CRT_FILE=ssl/cert.pem
   SSL_KEY_FILE=ssl/key.pem
   HOST=0.0.0.0
   ```
   *(Make sure to change `<YOUR_LOCAL_IP>` to your actual Local IP, or just `localhost` if you only plan to test on one computer).*

4. **Update Backend `.env`:**
   ```env
   CLIENT_URL=https://<YOUR_LOCAL_IP>:3000
   HOST=0.0.0.0
   ```

### Step 4: Restart the Apps
After generating the `cert.pem` and `key.pem` files inside the `/ssl` directories and updating `.env`, completely kill your active backend and frontend terminal runs (`Ctrl+C`).

Restart the backend (`npm start`), restart the frontend (`npm start`), and the app will boot up in full secure `HTTPS` mode!
