# Deploying to AWS EC2

This guide walks you through deploying the AI Study Companion application to an AWS EC2 instance.

## Prerequisites

1.  An AWS EC2 instance (Ubuntu 22.04 or 24.04 recommended).
2.  SSH access to your instance.
3.  Port **3000** must be open in your EC2 Security Group for inbound traffic (`Custom TCP`, Port Range: `3000`, Source: `0.0.0.0/0`).

## Option 1: Deploying with Docker (Recommended)

Docker is the easiest way to deploy the application because it packages everything including Node.js.

### 1. Connect to your EC2 instance

```bash
ssh -i /path/to/your-key.pem ubuntu@your-ec2-public-ip
```

### 2. Install Docker

```bash
# Update package list
sudo apt update -y

# Install Docker
sudo apt install -y docker.io

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# (Optional) Add your user to the docker group to run docker without sudo
sudo usermod -aG docker ubuntu
# Note: You may need to log out and log back in for this to take effect
```

### 3. Clone your code to the server

```bash
git clone https://github.com/HUGHESY119/website-study.git
cd website-study
```

### 4. Configure Environment Variables

Create a `.env` file in the root of your project:

```bash
nano .env
```

Add your Gemini API Key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
```

### 5. Build and Run the Docker Container

```bash
# Build the Docker image
sudo docker build -t study-companion .

# Run the container in the background
sudo docker run -d -p 3000:3000 --env-file .env --name study-app --restart always study-companion
```

Your app is now running! Visit `http://your-ec2-public-ip:3000` in your browser.

---

## ⚠️ Troubleshooting: Fixing EC2 Freezes (1GB RAM t2/t3.micro instances)

If your EC2 instance freezes or hangs during `sudo docker build`, it is almost certainly running out of RAM (Vite compilation requires more than 1GB of memory). 

Follow these steps on your EC2 instance to **add swap space**, **clear disk space**, and **build successfully**:

### Step 1: Create and Enable a 2GB Swap File
Swap space acts as virtual memory on your disk, preventing compilation crashes and system freezes.

```bash
# 1. Allocate a 2GB swap file
sudo fallocate -l 2G /swapfile

# 2. Set the correct permissions
sudo chmod 600 /swapfile

# 3. Format the file as swap
sudo mkswap /swapfile

# 4. Enable the swap space
sudo swapon /swapfile

# 5. Make it permanent (survives system reboots)
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 6. Verify that swap is now active (you should see 2.0Gi under Swap)
free -h
```

### Step 2: Thoroughly Clear Disk and Docker Cache Space
Make sure you have enough disk space before starting the build.

```bash
# Clear all stopped containers, unused networks, images, and BuildKit build cache
sudo docker system prune -a --volumes -f

# Clean up system package manager caches
sudo apt-get clean
sudo apt-get autoremove -y

# Vacuum system logs to free up space
sudo journalctl --vacuum-size=50M
```

### Step 3: Run the Build Command with CPU/Memory Constraints
To prevent Docker from consuming all available host CPU and memory during the build:

```bash
sudo docker build --memory="1.5g" -t quizgenius .
```

### Step 4: Troubleshooting "Address already in use" (Failed to bind host port 80)
If you run `sudo docker run -d -p 80:3000 ...` and get the error:
`failed to bind host port 0.0.0.0:80/tcp: address already in use`

This means port 80 on your EC2 host is already being used by another service (typically Nginx, Apache, or another container).

**Solution A: Find and Stop the conflicting service**
```bash
# 1. Identify what process is running on port 80
sudo lsof -i :80
# OR
sudo netstat -tuln | grep :80

# 2. If it is Nginx or Apache, stop it:
sudo systemctl stop nginx
# or
sudo systemctl stop apache2

# 3. Check for any conflicting Docker container on port 80 and remove it:
sudo docker ps -a
# Stop and remove the old container if needed:
sudo docker stop <container-id-or-name>
sudo docker rm <container-id-or-name>
```

**Solution B: Map the container to a different host port (e.g. 3000 or 8080)**
Instead of using port 80, map the application to another open port. In the security group of your EC2 instance, ensure the port you choose (e.g., `3000`) is open.
```bash
# Run on port 3000 on the host (mapping to port 3000 inside the container)
sudo docker run -d -p 3000:3000 --name quizgenius-app --restart always quizgenius
```

### Step 5: Troubleshooting Container Conflicts & Port 3000 Failures

If you see these errors when running the `docker run` command:

1. **`fatal: Need to specify how to reconcile divergent branches` (During Git Pull)**
   This happens because the repository history was updated or force-synced from AI Studio.
   * **Fix (Instantly align your local git code with GitHub)**:
     ```bash
     git fetch origin
     git reset --hard origin/main
     ```

2. **`Conflict. The container name "/quizgenius-app" is already in use...`**
   This means a container named `quizgenius-app` exists from a previous attempt (even if it failed or stopped).
   * **Fix**: Force-remove the existing container:
     ```bash
     sudo docker rm -f quizgenius-app
     ```

3. **`Bind for 0.0.0.0:3000 failed: port is already allocated` (The Container Name Mismatch)**
   This means port 3000 on your EC2 host is already being used. 
   
   **Why this happens:** If you previously followed the standard Docker guide, you ran a container named **`study-app`** (not `quizgenius-app`) on port 3000 with `--restart always`. When the Docker daemon restarts, it immediately starts `study-app` back up, locking port 3000. Force-removing `quizgenius-app` won't free the port because the conflict is with `study-app`.

   * **Fix (Steps to find and remove the container on Port 3000)**:
     
     **Step A: Remove the original container name (`study-app`)**
     ```bash
     # Force remove the original container that is holding port 3000
     sudo docker rm -f study-app
     ```

     **Step B: Alternatively, find any container mapped to Port 3000 and stop it**
     ```bash
     # List all running containers to see if any are mapped to port 3000
     sudo docker ps
     
     # Force-remove whichever container ID or name is mapped to 3000 (e.g. study-app)
     sudo docker rm -f <container-id-or-name>
     
     # (Or run this single-line command to auto-remove any container mapped to port 3000)
     sudo docker ps -q --filter "publish=3000" | xargs -r sudo docker rm -f
     ```

     **Step C: Check for and stop PM2 (Node.js Process Manager) conflicts**
     If you previously ran the application natively using PM2, PM2 is configured to immediately resurrect the application whenever it gets killed. This means any manual process kill will be immediately bypassed as PM2 spawns a new process, keeping port 3000 permanently allocated.
     ```bash
     # Check if PM2 has any active processes running
     pm2 list
     # (or with sudo if installed as root)
     sudo pm2 list

     # Stop and delete the PM2 processes to free up the port
     pm2 delete all
     sudo pm2 delete all
     ```

     **Step D: Kill other non-PM2 background processes (e.g., manual node scripts)**
     If there is a background process running without PM2 (like a background `nohup` or `&` script), kill it:
     ```bash
     # Stop/kill whatever is currently listening on port 3000:
     sudo fuser -k 3000/tcp
     
     # Alternatively, find and kill the PID manually:
     sudo lsof -i :3000
     # Kill using the PID returned (replace <PID> with the actual process ID, e.g., 12345)
     sudo kill -9 <PID>
     ```

     **Step E: Confirm port 3000 is completely free**
     ```bash
     sudo lsof -i :3000
     # (This should return absolutely nothing, indicating port 3000 is free and ready)
     ```

4. **Complete Fresh Run Command**:
   Once you have cleared the container holding port 3000, run this command:
   ```bash
   sudo docker run -d -p 3000:3000 --name quizgenius-app --restart always quizgenius
   ```

---

## Option 2: Deploying with PM2 (Native Node.js)

If you prefer not to use Docker, you can run the app directly using Node.js and PM2 to keep it alive.

### 1. Connect to your EC2 instance

```bash
ssh -i /path/to/your-key.pem ubuntu@your-ec2-public-ip
```

### 2. Install Node.js (v20)

```bash
# Install curl
sudo apt-get install -y curl

# Download and install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 3. Clone your code to the server

```bash
# Clone the repository
git clone https://github.com/HUGHESY119/website-study.git

# Move into the inner project directory where package.json actually resides
cd ~/website-study/website-study
```

### 4. Install Dependencies & Build

Make sure you are in the directory containing `package.json` (`~/website-study/website-study`):

```bash
# Install all dependencies
npm install

# Build the client and the server (produces the dist/server.cjs file)
npm run build
```

### 5. Configure Environment Variables

You **must** create your `.env` file in the same folder as your `package.json` (`~/website-study/website-study`):

```bash
nano .env
```

Add your Gemini API Key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*(Save and exit with `Ctrl+O`, `Enter`, `Ctrl+X`)*

### 6. Start the App with PM2

PM2 is a process manager that keeps your app running in the background and restarts it if it crashes.

If you have old, stale, or errored processes running in PM2 from previous deployment attempts (like `flashcard-app`, `quizgenius`, or `study-companion` as `errored`), it is highly recommended to clear them out first to prevent infinite crash loops and CPU drain.

Run these commands in your terminal:

```bash
# 1. Clear any old/errored PM2 processes
pm2 delete all

# 2. Ensure you are in the correct directory containing package.json
cd ~/website-study/website-study

# 3. Build the application (this MUST be run to generate the dist/server.cjs file!)
npm run build

# 4. Start the freshly compiled server in PM2
pm2 start dist/server.cjs --name "study-companion"

# 5. Ensure PM2 restarts on server reboot
pm2 startup
pm2 save
```

*(Note: If `npm run build` fails, make sure you have run `npm install` first in that directory.)*

Your app is now running! Visit `http://98.85.246.55:3000` in your browser.

---

## Part 4: Configuring Custom Domain (171oh.site) & Let's Encrypt SSL (HTTPS)

To secure your app with HTTPS and map it to your custom domain **`171oh.site`**, we will use **Nginx** as a high-performance reverse proxy on port 80/443, and **Certbot** (Let's Encrypt) to automate SSL certificate provisioning and auto-renewals.

### Step 1: Update your DNS Records
Before starting, point your domain to your EC2 instance:
1. Go to your domain provider/registrar (where you purchased `171oh.site`).
2. Navigate to the **DNS Management / Zone Editor** settings.
3. Add/edit the following records (as configured perfectly in your Namecheap panel):
   - **Type A**: Host/Name = `@` (root), Value = `98.85.246.55`, TTL = Automatic/Default.
   - **Type A**: Host/Name = `www`, Value = `98.85.246.55`, TTL = Automatic/Default.

### Step 2: Open Ports in AWS Security Group
Your EC2 instance must be open to public web traffic:
1. Open your **AWS EC2 Dashboard**.
2. Click **Instances** and select your running instance.
3. Go to the **Security** tab and click on your **Security Group** link.
4. Click **Edit inbound rules** and add these two rules:
   - **HTTP**: Port `80`, Source = `0.0.0.0/0` (Anywhere)
   - **HTTPS**: Port `443`, Source = `0.0.0.0/0` (Anywhere)
5. Save the rules.

### Step 3: Install Nginx & Certbot on EC2
Connect to your EC2 instance via SSH and run:
```bash
# Update local packages list
sudo apt update

# Install Nginx, Certbot, and the Certbot Nginx plugin
sudo apt install -y nginx certbot python3-certbot-nginx
```

### Step 4: Configure Nginx as a Reverse Proxy
Now, configure Nginx to listen on your domain and forward traffic to your running App (port 3000):
1. Create a configuration file for your site:
   ```bash
   sudo nano /etc/nginx/sites-available/171oh.site
   ```
2. Paste the following configuration (make sure to support file uploads up to 20MB):
   ```nginx
   server {
       listen 80;
       server_name 171oh.site www.171oh.site;

       # Max upload file size (aligned with study companion specs)
       client_max_body_size 20M;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
3. Save and close the file (`Ctrl+O`, `Enter`, `Ctrl+X`).
4. Enable the new configuration and disable Nginx's default placeholder site:
   ```bash
   # Link the config to sites-enabled
   sudo ln -s /etc/nginx/sites-available/171oh.site /etc/nginx/sites-enabled/

   # Remove the default site configuration
   sudo rm -f /etc/nginx/sites-enabled/default

   # Test Nginx configuration for syntax correctness
   sudo nginx -t
   ```
5. If the test is successful, restart Nginx:
   ```bash
   sudo systemctl restart nginx
   ```

### Step 5: Obtain Let's Encrypt SSL Certificate
Let's Encrypt will verify ownership of `171oh.site` and instantly provision an SSL certificate, automatically editing your Nginx file to enforce HTTPS redirects:
```bash
sudo certbot --nginx -d 171oh.site -d www.171oh.site
```
- **Email**: Enter your email (e.g., `hughosc22@gmail.com`) for renewal and security notifications.
- **Terms**: Agree to the Terms of Service.
- **HTTPS Redirect**: Certbot will ask if you want to automatically redirect HTTP traffic to HTTPS. Choose **Redirect** (usually option `2`).

#### Final Combined Nginx Config (Expected Result)
After Certbot finishes, your `/etc/nginx/sites-available/171oh.site` file should look like this. If it doesn't, you can copy-paste this whole block directly into the file:

```nginx
# 1. HTTPS Server Block (Listens on 443 with SSL)
server {
    server_name 171oh.site www.171oh.site;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/171oh.site/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/171oh.site/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

# 2. HTTP to HTTPS Redirect Block (Listens on 80)
server {
    if ($host = www.171oh.site) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = 171oh.site) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name 171oh.site www.171oh.site;
    return 404; # managed by Certbot
}
```

### Step 6: Verify Automatic SSL Renewal
Let's Encrypt certificates are valid for 90 days, but Certbot installs an automated system cronjob/timer to renew them before they expire. Test that the renewal process is configured correctly:
```bash
sudo certbot renew --dry-run
```
If this completes without errors, you are 100% secure! You can now visit **`https://171oh.site`** in your browser.

---

### Troubleshooting Domain & Port 3000 Mapping Issues

If you see the **"Host Not Found / DNS Error"** (as shown in your browser screenshot) or if your domain is **"not linked to port 3000"**, here is exactly how to resolve it:

#### 1. Why is it "not linked to port 3000" automatically?
By default, web browsers only connect to **Port 80 (HTTP)** or **Port 443 (HTTPS)** when you type in `171oh.site`. 
- **The Solution:** You do **NOT** link the domain to port 3000 in your Namecheap panel. Instead, Namecheap points the domain directly to your EC2 IP. 
- **The Glue (Nginx):** **Nginx** acts as your reverse proxy. It listens on port 80/443, intercepts requests for `171oh.site`, and forwards them to `http://localhost:3000` under the hood. You must complete **Steps 3, 4, and 5** above on your EC2 terminal to activate this forwarding!

#### 2. Resolving the "Host Not Found" DNS Error
If your browser says the host was not found, it means your computer cannot find the IP address (`98.85.246.55`) for the name `171oh.site`.

*   **Gotcha A: Namecheap Nameservers Mismatch (Most Common)**
    Even if you added the A records to Namecheap's "Advanced DNS" tab, they will be **completely ignored** if your domain is pointing to external nameservers.
    1. Go to your **Namecheap Dashboard**.
    2. Click **Manage** next to your domain `171oh.site`.
    3. Under the **Domain** tab, find the **Nameservers** section.
    4. Ensure it is set to **Namecheap BasicDNS** (or **Namecheap Web Hosting DNS** if using Namecheap hosting). If it is set to "Custom DNS" or something else, change it back to **Namecheap BasicDNS** and save.
    
*   **Gotcha B: DNS Propagation Delay**
    DNS changes are not instantaneous. They can take anywhere from **5 minutes to a few hours** to propagate across all global servers.
    - **How to test if DNS is working:** Open your local terminal (on your computer, not EC2) and run:
      ```bash
      nslookup 171oh.site
      ```
      If it returns your EC2 IP (`98.85.246.55`), the DNS has propagated. If it returns an error or a different IP, the DNS update is still propagating.
    - **Alternate online check:** Use an online tool like [dnschecker.org](https://dnschecker.org/#A/171oh.site) to see if your IP is resolving globally.

*   **Gotcha C: AWS Security Group blocking Port 80/443**
    If the DNS resolves but the page times out, Nginx might be blocked by AWS. Ensure you have added **HTTP (80)** and **HTTPS (443)** rules to your AWS security group as specified in **Step 2**!

#### 3. Resolving the "GEMINI_API_KEY environment variable is not set" Error

If you visit your site and see the error **"Generation Failed: GEMINI_API_KEY environment variable is not set. Please add it in Settings > Secrets"**, it means the backend cannot find your Gemini API Key.

This happens for two common reasons:
1.  **Misplaced `.env` File**: You created the `.env` file in the parent folder `~/website-study` instead of the inner project folder `~/website-study/website-study` (where `package.json` and the built code actually live).
2.  **PM2 Environment Cache**: You created/edited the `.env` file *after* PM2 was already running. PM2 caches the environment variables from the moment a process is first started. Simple restarts may not refresh it.

**How to fix this instantly:**

1.  SSH into your EC2 instance.
2.  Navigate to the inner project directory containing `package.json`:
    ```bash
    cd ~/website-study/website-study
    ```
3.  Check if your `.env` file exists and has the correct key:
    ```bash
    cat .env
    ```
    *If it doesn't exist, create it inside `~/website-study/website-study`*:
    ```bash
    nano .env
    ```
    And paste:
    ```env
    GEMINI_API_KEY=your_actual_gemini_api_key_here
    ```
    *(Press `Ctrl+O`, `Enter`, then `Ctrl+X` to save and exit)*.

4.  **Crucial step**: Kill the cached PM2 processes and start the app fresh to load the new environment variables from the `.env` file:
    ```bash
    # Delete the cached process
    pm2 delete all

    # Start it fresh so PM2 reads the newly created .env file
    pm2 start dist/server.cjs --name "study-companion"

    # Save the running PM2 list
    pm2 save
    ```

5.  Refresh your browser. The AI flashcard and study generation will now work perfectly!

#### 4. Resolving Git "Divergent Branches" (`git pull` fails)

Because we forced-pushed a healthy clean history to GitHub to repair corrupt local repository records, your EC2 server's local repository has diverged from the remote main on GitHub.

If you run `git pull origin main` and get `fatal: Need to specify how to reconcile divergent branches.`, solve it instantly by telling Git to discard any mismatched local history on EC2 and match the clean GitHub branch perfectly:

Run these commands in your EC2 terminal:
```bash
# 1. Fetch the latest branches from GitHub
git fetch origin

# 2. Force your local main branch to match GitHub's main exactly
git reset --hard origin/main
```
After doing this, your EC2 local directory will be completely clean and up-to-date!

#### 5. The Ultimate Bulletproof Way: Direct PM2 Key Injection (No `.env` File Needed!)

If you have tried editing `.env` files and your app is still saying `GEMINI_API_KEY is not set`, it means PM2 has cached a stale environment or is looking in the wrong folder.

We can completely bypass `.env` files and inject your key directly into the PM2 runtime! This works 100% of the time, instantly.

Run this single block of commands in your EC2 terminal:

```bash
# 1. Navigate into the nested folder containing your package.json
cd ~/website-study/website-study

# 2. Pull down the newest code to make sure you have all updates
git fetch origin
git reset --hard origin/main

# 3. Build the application one more time to compile the code
npm run build

# 4. Delete the old cached PM2 process
pm2 delete all

# 5. Start the server by passing the API key directly into the PM2 command!
GEMINI_API_KEY="your_actual_gemini_api_key_here" pm2 start dist/server.cjs --name "study-companion" --update-env

# 6. Save the state so it starts automatically if the server reboots
pm2 save
```

Once you run this, refresh your browser at `https://171oh.site` and the generation will work immediately!

---

## Upload Functionality Notes
The application now supports file uploads up to 20MB directly to the EC2 instance's `tmp/flashcard-uploads` project directory. It securely reads the files, extracts text using Gemini 2.5 Flash, and immediately cleans up the local storage to prevent disk space issues on your VM.
