# Deployment Guide

This guide will walk you through how to deploy on an OVH VPS.

<!-- TOC -->
* [Deployment Guide](#deployment-guide)
  * [Production deployment](#production-deployment)
    * [What the deploy script does:](#what-the-deploy-script-does)
  * [Development Deployment](#development-deployment)
<!-- TOC -->

## Production deployment

1. Login to the vps:
```bash
ssh ubuntu@IPV4
```
Obtain the IP and password from the docs in teams

1. Optional: `sudo -i` to gain root privileges (not recommended)
2. `cd /root/www/edpulse`
3. Run the deployment script in this directory. Ensure env files are configured correctly in the deploy.sh script. 
You can obtain all keys in the files found in teams. Do not publish this deploy script to github, keep it private.

Run the script with
```bash
sudo ./deploy.sh
```
This script takes directly from git. If there's any changes made on the vps,
the code will likely conflict with what is pulled. I'd recommend not doing any development directly
on the VPS.

Wait for it to finish. Press enter (not cntr+c) to free the terminal.
The deployment script may say that the frontend has finished building, but it just means the
container is running. It takes another 2-3 minutes for the frontend to compile. To verify it's done, check the logs.

To view the logs of the backend/frontend run:
`docker ps` to obtain the names/id's of the containers. Then 
`docker logs <id/name>`

### What the deploy script does:

1. Defines env variables
   1. Variables in .env in the root app directory can be automatically accessed in the docker-compose
   file. See the docker compose password usage for example how to use
2. Installs everything the system needs
   1. Docker
   2. Git
   3. nginx
   4. certbot
3. Sets up env vars for docker containers
4. Pulls from git
5. Sets up nginx configuration
6. Stars containers
7. Starts cron job for SSL certificate

Do not delete the /app folder found here as it contains all the videos in app/fastapi_backend.
Future work would be to move the videos to some remote storage like `S3` or `uploadthing`

## Development Deployment

See [DevelopmentGuide](./DevelopmentGuide.md) for this setup.