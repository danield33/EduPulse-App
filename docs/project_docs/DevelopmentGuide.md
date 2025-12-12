# Development Guide

To future Edupulse developers... This guide will help explain how to develop this project.

This project includes a default setup [guide](../template_docs/get-started.md) for enviroment setup. Setup guide for the template of the project is based off of this resource [here](https://nextfastapi.com/get-started/).

These documentations also provide crucial instructions for performing key operations such as local setup and  database migrations (which should be done when editing/creating/deleting tables).

Documentation for maintaing and running the project based off of the base template can be found in other markdown files in the `/docs/template_docs/` folder. Note that some details may be different and specific deployment instructions that the project is currently using can be found in the [DeploymentGuide](DeploymentGuide.md).

The rest of this documetation provides additional guidance for developing the project and includes potential future improvements.


<!-- TOC -->
* [Development Guide](#development-guide)
  * [Starting Development](#starting-development)
* [Project Details](#project-details)
  * [Tools](#tools)
  * [Local development](#local-development)
* [Possible Future Work](#possible-future-work)
  * [Project Infrastructure](#project-infrastructure)
  * [Frontend Feature Improvements](#frontend-feature-improvements)
  * [Backend Improvements](#backend-improvements)
  * [Other](#other)
<!-- TOC -->

## Starting Development

Obtain the code from the github: https://github.com/Edpulse-osu/EduPulse-App.
Obtain contribution access by emailing `dawit.6@osu.edu` before end of SP2026 semester as he'll be graduated by then. 

The current state of the code is in 'production' mode. It's runnable but tedious for development as it takes a long time
to build the frontend.
To start 'development' mode, we need to change just a few things. To find these changes, see (and apply) the patch file
in [devMode.patch](./dev_patches/devMode.patch)
Don't push these changes to the main branch as the deployment script in the deployment guide will reflect these changes
and may result in unexpeted results/performance on the website.

Future work would be to have a development vs production pipeline/branch that can be worked on and a CICD pipeline to
automatically convert the two.

# Project Details

For more detailed information on project Architecture, see [Architecture](Architecture.md)

## Tools

* Frontend: Next.js + TailwindCSS
* Backend: FastAPI (python)
    * Key Library: FFmpeg
* Database: PostgreSQL
* AI Tools:
    * Hume.ai: speech synthesis
    * OpenAI: script generation
* Docker

## Local development

Template_docs provide instructions of how to run the frontend, backend, and database locally. We recommend using containers to run these components and to use Docker Desktop to aid development.

Local containers can be managed through Docker Desktop or via the command line interface. When containers are running successfully, the frontend and backend can be accessed through localhost with the specific port number for each container. 

To test backend APIs, fastAPI has a docs page accessable at `BACKEND_PORT/docs` (typically `localhost:8000/docs` or `localhost:8000/api/docs`)

One common bug when starting up containers is that the backend container attaches the wrong `.venv` and uses local `.venv` files which may have a hardward type mismatch from the container virtual aricitecture. To fix this, delete the local `.venv` before starting the backend container.

The containers have hot-reload setup by default when in development mode. More details can be found in template docs. This enables code changes to reflect in local containers automatically without requiring containers to be restarted. 

# Possible Future Work

Below contains some potential future work that our team have identified. These range from infrastructure changes, new features, and maintanability improvement work.

## Project Infrastructure
Project infrastrucutre can be improved for better maintability and reliability
* Unit / Integration tests for code
* CI/CD pipeline
  * Current CI/CD pipeline is failing due to lack of any tests

## Frontend Feature Improvements
Below are some features changes that can improve the project
* Editing lesson names
* Deleting lessons
* Lesson search
	* Adding some kind of "search" for lessons like youtube search
* Speaker indicatios
  * Add some sort of visual indicator for who is speaking
  * Potential ideas include speach bubbles or subtitles with character names
* iframe for lesson embed
  * Enable embedding the lesson into Canvas to improve lesson access
  * Ensure CORS and other security features are configured properly
* AI Image generation
  * Currently image generation prompt when adding images isn't implemented.
* Dashboard user icon
  * Current pfp is always a default user. Could change to be the first character of the profile's name
* Additional security improvements
* Nested video branching options
  * Currently, we only support single branches, but it'd be cool to see multi-branching abilities


## Backend Improvements
Below are potential backend changes that can be considered
* AWS S3 or other blob storage for video storage
  * Reliability improvements and prevent file corruption which have been occurring and also enable redudancy
  * Reduce hosting costs as VPS can have less storage
  * Reduces load on postgres database and prevent slow writes caused by writing videos
* AWS S3 or other blog storage for image storage
  * Currently storing images in the script of postgres database under the `lesson_scenario` table. For the same reasonsa as above, we'd want to not do this.
* Better ffmpeg updates
  * Instead of re-rendering the entire video when editing, determine what segments were changed and only update them (Faster loading times).
* Limit ffmpeg compute usage
  * When ffmpeg is running, it uses most/all the system's resources, blocking other server requests which can lead to other user's experience stopping altogether
	* Alternative can be to move ffmpeg to other compute services like AWS Lambdas
* Reducing unused API endpoints
  * The current backend includes many API endpoints that are unused
* Updating Hume.ai calls
  * Instead of regenerating the voices for each new dialogue, we can reuses the same voice for the same person.
  This can be found in the Hume.ai docs somewhere about reusing voices in conversations.

## Other
* Create a snapshot of the website on the waybackmachine. I think that'd be pretty cool to see how this website changes over time at the end of each captstone